import { Agent } from '@forestadmin/agent';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { TSchema } from '@forestadmin/datasource-customizer';
import { DataSource } from '@forestadmin/datasource-toolkit';

import { makeRpcRoutes } from './routes';

export default class RpcAgent<S extends TSchema = TSchema> extends Agent<S> {
  override getRoutes(dataSource: DataSource, services: ForestAdminHttpDriverServices) {
    return makeRpcRoutes(dataSource, this.options, services);
  }

  override async sendSchema(): Promise<void> {
    this.options.logger('Info', 'Started as RPC agent, schema not sended.');
  }
}
