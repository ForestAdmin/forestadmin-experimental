import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';
import crypto from 'crypto';
import { EventSource } from 'eventsource';
import superagent from 'superagent';

import RpcDataSource from './datasource';
import { RpcDataSourceOptions, RpcSchema } from './types';
import { appendHeaders, getAuthoriztionHeaders } from './utils';

export { reconciliateRpc } from './plugins';

const sseMap = new Map<string, EventSource>();

async function getintrospection(logger: Logger, uri: string, authSecret: string) {
  logger('Info', `Getting schema from Rpc agent on ${uri}.`);

  const introRq = superagent.get(`${uri}/forest/rpc-schema`);
  appendHeaders(introRq, authSecret);

  const introResp = await introRq.send();

  return introResp.body;
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

    const a = Math.random();

    let reconnecting = false;

    es.onerror = error => {
      reconnecting = true;
      logger('Debug', `SSE (${uri} ${a}) error: ${error.message}`);
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

    const introspection = await getintrospection(logger, uri, authSecret);
    const originalHash = getHash(introspection);

    runRecon(logger, uri, authSecret, originalHash, restartAgent);

    return new RpcDataSource(logger, options, introspection);
  };
}
