import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { Collection, DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcSchemaRoute extends BaseRoute {
  type = RouteType.PrivateRoute;

  protected readonly dataSource: DataSource;

  constructor(
    services: ForestAdminHttpDriverServices,
    options: AgentOptionsWithDefaults,
    dataSource: DataSource,
  ) {
    super(services, options);

    this.dataSource = dataSource;
  }

  override setupRoutes(router: Router): void {
    router.get('/rpc-schema', this.handleRpc.bind(this));
  }

  async buildCollection(collection: Collection) {
    const fields = Object.entries(collection.schema.fields).reduce((fileds, [name, schema]) => {
      fileds[name] = {
        ...schema,
        filterOperators: Array.from(schema.type === 'Column' ? schema.filterOperators : []),
      };

      return fileds;
    }, {});

    return { name: collection.name, ...collection.schema, fields };
  }

  async handleRpc(context: any) {
    context.response.body = {
      schema: {
        collections: await Promise.all(this.dataSource.collections.map(this.buildCollection)),
      },
    };
  }
}
