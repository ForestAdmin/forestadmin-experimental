import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';
import crypto from 'crypto';
import { EventSource } from 'eventsource';
import superagent from 'superagent';

import RpcDataSource from './datasource';
import { RpcDataSourceOptions, RpcSchema } from './types';
import { appendHeaders, cameliseKeys, getAuthoriztionHeaders, toPascalCase } from './utils';

export { reconciliateRpc } from './plugins';

const sseMap = new Map<string, EventSource>();

export async function getintrospection(
  logger: Logger,
  uri: string,
  authSecret: string,
): Promise<RpcSchema> {
  logger('Info', `Getting schema from Rpc agent on ${uri}.`);

  const introRq = superagent.get(`${uri}/forest/rpc-schema`);
  appendHeaders(introRq, authSecret);

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
  };
}

function getHash(schema: RpcSchema) {
  return crypto.createHash('sha1').update(JSON.stringify(schema)).digest('hex');
}

function runRecon(
  logger: Logger,
  uri: string,
  authSecret: string,
  originalHash: string,
  restartAgent: () => Promise<void>,
) {
  if (!sseMap.has(uri)) {
    const es = new EventSource(`${uri}/forest/sse`, {
      fetch: (input, init) => {
        return fetch(input, {
          ...init,
          headers: {
            ...init.headers,
            ...getAuthoriztionHeaders(authSecret),
          },
        });
      },
    });

    let reconnecting = false;

    es.onerror = error => {
      reconnecting = true;
      logger('Debug', `SSE (${uri}) error: ${error.message}`);
    };

    es.onopen = async () => {
      if (reconnecting) {
        logger('Info', `Reconnecting with RPC agent on ${uri}.`);
        const newIntrospection = await getintrospection(logger, uri, authSecret);
        const newHash = getHash(newIntrospection);

        if (originalHash !== newHash) {
          logger('Info', `Schema of RPC agent on ${uri} change: restarting.`);
          await restartAgent();
        }
      }
    };

    sseMap.set(uri, es);
  }
}

export function createRpcDataSource(options: RpcDataSourceOptions): DataSourceFactory {
  return async (logger: Logger, restartAgent: () => Promise<void>) => {
    const { authSecret, uri } = options;
    let { introspection } = options;

    if (!introspection) {
      introspection = await getintrospection(logger, uri, authSecret);
    }

    if (options.disableSSE) {
      const originalHash = getHash(introspection);
      runRecon(logger, uri, authSecret, originalHash, restartAgent);
    }

    return new RpcDataSource(logger, options, introspection);
  };
}
