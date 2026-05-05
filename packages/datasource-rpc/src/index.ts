import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';

import RpcDataSource from './datasource';
import { getIntrospection, parseIntrospection } from './introspector';
import Poller from './poller';
import { RpcDataSourceOptions, RpcSchema } from './types';

export { reconciliateRpc } from './plugins';

export function createRpcDataSource(options: RpcDataSourceOptions): DataSourceFactory {
  return async (logger: Logger, restartAgent: () => Promise<void>) => {
    const { authSecret, uri } = options;
    const { introspection, pollingInterval } = options;
    let schema: RpcSchema;

    try {
      schema = await getIntrospection(logger, uri, authSecret);
    } catch (error) {
      if (!introspection) throw error;

      schema = parseIntrospection(introspection);
    }

    Poller.getInstance(logger, restartAgent).startPolling(
      uri,
      authSecret,
      schema.etag,
      pollingInterval,
    );

    return new RpcDataSource(logger, options, schema);
  };
}
