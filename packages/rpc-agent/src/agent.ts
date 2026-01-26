import { Agent, AgentOptions } from '@forestadmin/agent';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { DataSourceOptions, TCollectionName, TSchema } from '@forestadmin/datasource-customizer';
import { DataSource, DataSourceFactory } from '@forestadmin/datasource-toolkit';

import RpcDataSourceCustomizer from './datasource-customizer';
import { makeRpcRoutes } from './routes';
import SseRoute from './routes/sse';

export default class RpcAgent<S extends TSchema = TSchema> extends Agent<S> {
  private readonly rpcCollections: string[] = [];
  protected override customizer: RpcDataSourceCustomizer<S>;

  sseRoute: SseRoute;

  constructor(options: AgentOptions) {
    super(options);

    this.customizer = new RpcDataSourceCustomizer<S>({
      ignoreMissingSchemaElementErrors: options.ignoreMissingSchemaElementErrors || false,
    });
  }

  override addDataSource(
    factory: DataSourceFactory,
    options?: DataSourceOptions & { markCollectionsAsRpc?: boolean },
  ) {
    let markCollectionsCallback = null;

    if (options?.markCollectionsAsRpc) {
      markCollectionsCallback = (datasource: DataSource) => {
        datasource.collections.forEach(c => this.rpcCollections.push(c.name));
      };
    }

    this.customizer.addDataSource(
      factory,
      { ...options, markCollectionsCallback },
      this.restart.bind(this),
    );

    return this;
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
