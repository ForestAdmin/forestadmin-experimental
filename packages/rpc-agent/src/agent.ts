import { Agent } from '@forestadmin/agent';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { DataSourceOptions, TCollectionName, TSchema } from '@forestadmin/datasource-customizer';
import { DataSource, DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';

import { makeRpcRoutes } from './routes';
import SseRoute from './routes/sse';

export default class RpcAgent<S extends TSchema = TSchema> extends Agent<S> {
  private readonly rpcCollections: string[] = [];

  sseRoute: SseRoute;

  override addDataSource(
    factory: DataSourceFactory,
    options?: DataSourceOptions & { markCollectionsAsRpc?: boolean },
  ) {
    let factoryFunction = factory;

    if (options?.markCollectionsAsRpc) {
      factoryFunction = async (logger: Logger, restartAggent: () => Promise<void>) => {
        const datasource = await factory(logger, restartAggent);

        datasource.collections.forEach(c => this.rpcCollections.push(c.name));

        return datasource;
      };
    }

    return super.addDataSource(factoryFunction, options);
  }

  override getRoutes(dataSource: DataSource, services: ForestAdminHttpDriverServices) {
    const routes = makeRpcRoutes(dataSource, this.options, services, this.rpcCollections);

    this.sseRoute = routes.find(r => r instanceof SseRoute) as SseRoute;

    return routes;
  }

  override async sendSchema(): Promise<void> {
    this.options.logger('Info', 'Started as RPC agent, schema not sended.');
  }

  markCollectionsAsRpc<N extends TCollectionName<S>>(...names: N[]): this {
    this.rpcCollections.push(...names);

    return this;
  }

  override async restart(): Promise<void> {
    this.sseRoute.endSse();

    return super.restart();
  }
}
