import { BaseDataSource, Logger } from '@forestadmin/datasource-toolkit';

import RpcCollection from './collection';
import { RpcDataSourceOptionsWithToken, RpcSchema } from './types';

export default class RpcDataSource extends BaseDataSource {
  constructor(logger: Logger, options: RpcDataSourceOptionsWithToken, introspection: RpcSchema) {
    super();

    logger(
      'Info',
      `Building Rpc Datasource with ${Object.keys(introspection.collections).length} collections.`,
    );

    Object.entries(introspection.collections).forEach(([name, schema]) =>
      this.addCollection(new RpcCollection(logger, this, options, name, schema)),
    );
  }
}
