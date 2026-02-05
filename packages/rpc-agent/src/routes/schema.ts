import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

import { BuildedSchema } from '../types';

export default class RpcSchemaRoute extends BaseRoute {
  type = RouteType.PrivateRoute;

  protected readonly dataSource: DataSource;
  private readonly buildedSchema: BuildedSchema;

  constructor(
    services: ForestAdminHttpDriverServices,
    options: AgentOptionsWithDefaults,
    dataSource: DataSource,
    buildedSchema: BuildedSchema,
  ) {
    super(services, options);

    this.dataSource = dataSource;
    this.buildedSchema = buildedSchema;
  }

  override setupRoutes(router: Router): void {
    router.get('/rpc-schema', this.handleRpc.bind(this));
  }

  async handleRpc(context: any) {
    const { 'if-none-match': etag } = context.headers;

    context.set('ETag', this.buildedSchema.etag);

    if (etag && this.buildedSchema.etag === etag) {
      this.options.logger('Debug', 'ETag matches, returning 304 Not Modified');
      context.status = 304;

      return;
    }

    context.response.body = this.buildedSchema.schema;
  }
}
