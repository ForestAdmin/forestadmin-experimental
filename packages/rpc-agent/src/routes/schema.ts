import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

import RpcAgent from '../agent';

export default class RpcSchemaRoute extends BaseRoute {
  type = RouteType.PrivateRoute;

  protected readonly dataSource: DataSource;
  private readonly agent: RpcAgent;

  constructor(
    services: ForestAdminHttpDriverServices,
    options: AgentOptionsWithDefaults,
    dataSource: DataSource,
    agent: RpcAgent,
  ) {
    super(services, options);

    this.dataSource = dataSource;
    this.agent = agent;
  }

  override setupRoutes(router: Router): void {
    router.get('/rpc-schema', this.handleRpc.bind(this));
  }

  async handleRpc(context: any) {
    const { 'if-none-match': etag } = context.headers;

    if (etag && this.agent.buildedSchema.etag === etag) {
      this.options.logger('Debug', 'ETag matches, returning 304 Not Modified');
      context.status = 304;

      return;
    }

    context.response.body = this.agent.buildedSchema;
  }
}
