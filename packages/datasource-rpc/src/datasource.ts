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

    introspection.collections.forEach(schema =>
      this.addCollection(new RpcCollection(logger, this, options, schema.name, schema)),
    );
  }
}
