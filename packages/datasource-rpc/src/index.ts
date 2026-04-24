import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';
import superagent from 'superagent';

import RpcDataSource from './datasource';
import { IntrospectionSchema, RpcDataSourceOptions, RpcSchema } from './types';
import { appendHeaders, cameliseKeys, toPascalCase } from './utils';

export { reconciliateRpc } from './plugins';

/** polling interval in second */
const DEFAULT_POLLING_INTERVAL = 600;
const MIN_POLLING_INTERVAL = 1;
const MAX_POLLING_INTERVAL = 3600;

function parseIntrospection(introSchema: IntrospectionSchema): RpcSchema {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { collections, charts, rpc_relations, native_query_connections, etag } = introSchema;

  const parsedCollections = collections.map(collection => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { actions, fields, aggregation_capabilities, ...rest } = collection;
    const parsedActions = Object.entries(actions).reduce((pActions, [name, schema]) => {
      pActions[name] = cameliseKeys(schema);

      return pActions;
    }, {});

    const parsedFields = Object.entries(fields).reduce((pFields, [name, schema]) => {
      pFields[name] = cameliseKeys(schema);

      if (schema.type === 'Column') {
        pFields[name].filterOperators = new Set(pFields[name].filterOperators.map(toPascalCase));
      }

      return pFields;
    }, {});

    return {
      ...rest,
      aggregationCapabilities: {
        supportedDateOperations: new Set(aggregation_capabilities.supported_date_operations),
        supportGroups: aggregation_capabilities.support_groups,
      },
      actions: parsedActions,
      fields: parsedFields,
    };
  });

  const parsedRelations = Object.entries(rpc_relations).reduce(
    (rpcRelations, [collectionName, collectionRelations]) => {
      rpcRelations[collectionName] = Object.entries(collectionRelations).reduce(
        (relations, [name, schema]) => {
          relations[name] = cameliseKeys(schema);

          return relations;
        },
        {},
      );

      return rpcRelations;
    },
    {},
  );

  return {
    collections: parsedCollections,
    charts,
    rpcRelations: parsedRelations,
    nativeQueryConnections: native_query_connections,
    etag,
  };
}

async function getIntrospection(
  logger: Logger,
  uri: string,
  authSecret: string,
  etag?: string,
): Promise<RpcSchema> {
  logger('Info', `Getting schema from Rpc agent on ${uri}.`);

  const introRq = superagent.get(`${uri}/forest/rpc-schema`);
  appendHeaders(introRq, authSecret);
  if (etag) introRq.set('if-none-match', etag);

  const introResp = await introRq.send();

  return parseIntrospection(introResp.body);
}

function startPolling(
  logger: Logger,
  options: { uri: string; authSecret: string; etag: string; pollingInterval?: number },
  onChange: () => Promise<void>,
) {
  const { uri, authSecret, etag, pollingInterval } = options;
  logger(
    'Debug',
    `Starting polling every ${pollingInterval} seconds for Rpc agent schema changes on ${uri}.`,
  );

  const inter = setInterval(async () => {
    try {
      const intro = await getIntrospection(logger, uri, authSecret, etag);

      if (etag !== intro?.etag) {
        logger('Info', `Schema change detected on Rpc agent ${uri}. Restarting agent.`);
        clearInterval(inter);
        onChange();
      }
    } catch (error) {
      if (error.status === 304) {
        logger('Debug', `No schema change detected on Rpc agent ${uri}.`);
      } else if (!error.status) {
        logger('Error', `Error while polling Rpc agent ${uri} for schema changes: Unreachable.`);
      } else {
        logger(
          'Error',
          `Error while polling Rpc agent ${uri} for schema changes: ${error.message}.`,
        );
      }
    }
  }, pollingInterval * 1000);
}

export function createRpcDataSource(options: RpcDataSourceOptions): DataSourceFactory {
  return async (logger: Logger, restartAgent: () => Promise<void>) => {
    const { authSecret, uri } = options;
    const { introspection } = options;
    let schema: RpcSchema;

    try {
      schema = await getIntrospection(logger, uri, authSecret);
    } catch (error) {
      if (!introspection) throw error;

      schema = parseIntrospection(introspection);
    }

    const pollingInterval = Math.min(
      Math.max(options.pollingInterval ?? DEFAULT_POLLING_INTERVAL, MIN_POLLING_INTERVAL),
      MAX_POLLING_INTERVAL,
    );
    startPolling(logger, { uri, authSecret, etag: schema.etag, pollingInterval }, restartAgent);

    return new RpcDataSource(logger, options, schema);
  };
}
