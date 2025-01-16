import { Agent } from '@forestadmin/agent';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { TCollectionName, TSchema } from '@forestadmin/datasource-customizer';
import { DataSource } from '@forestadmin/datasource-toolkit';

import { makeRpcRoutes } from './routes';

export default class RpcAgent<S extends TSchema = TSchema> extends Agent<S> {
  private readonly rpcCollections: string[] = [];

  override getRoutes(dataSource: DataSource, services: ForestAdminHttpDriverServices) {
    return makeRpcRoutes(dataSource, this.options, services, this.rpcCollections);
  }

  override async sendSchema(): Promise<void> {
    this.options.logger('Info', 'Started as RPC agent, schema not sended.');
  }

  markCollectionsAsRpc<N extends TCollectionName<S>>(...names: N[]): this {
    this.rpcCollections.push(...names);

    return this;
  }
}
