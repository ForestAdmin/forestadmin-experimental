import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';
import superagent from 'superagent';

import RpcDataSource from './datasource';
import { RpcDataSourceOptions, RpcSchema } from './types';
import { appendHeaders, cameliseKeys, toPascalCase } from './utils';

export { reconciliateRpc } from './plugins';

const DEFAULT_POLLING_INTERVAL = 6000;
const MIN_POLLING_INTERVAL = 3000;
const MAX_POLLING_INTERVAL = 36000;

export async function getintrospection(
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { collections, charts, rpc_relations, native_query_connections } = introResp.body;

  const parsedCollections = collections.map(collection => {
    const parsedActions = Object.entries(collection.actions).reduce((actions, [name, schema]) => {
      actions[name] = cameliseKeys(schema);

      return actions;
    }, {});

    const parsedFields = Object.entries(collection.fields).reduce((fields, [name, schema]) => {
      fields[name] = cameliseKeys(schema);
      fields[name].filterOperators = fields[name].filterOperators.map(toPascalCase);

      return fields;
    }, {});

    return {
      ...collection,
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
    etag: introResp.headers.etag,
  };
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
      const intro = await getintrospection(logger, uri, authSecret, etag);

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
  }, pollingInterval);
}

export function createRpcDataSource(options: RpcDataSourceOptions): DataSourceFactory {
  return async (logger: Logger, restartAgent: () => Promise<void>) => {
    const { authSecret, uri } = options;
    let { introspection } = options;

    if (!introspection) {
      introspection = await getintrospection(logger, uri, authSecret);
    }

    const pollingInterval = Math.min(
      Math.max(options.pollingInterval ?? DEFAULT_POLLING_INTERVAL, MIN_POLLING_INTERVAL),
      MAX_POLLING_INTERVAL,
    );
    startPolling(
      logger,
      { uri, authSecret, etag: introspection.etag, pollingInterval },
      restartAgent,
    );

    return new RpcDataSource(logger, options, introspection);
  };
}
