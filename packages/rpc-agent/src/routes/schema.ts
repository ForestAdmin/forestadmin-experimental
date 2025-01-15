import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { Collection, DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcSchemaRoute extends BaseRoute {
  type = RouteType.PrivateRoute;

  protected readonly dataSource: DataSource;
  private readonly rpcCollections: string[];

  constructor(
    services: ForestAdminHttpDriverServices,
    options: AgentOptionsWithDefaults,
    dataSource: DataSource,
    rpcCollections: string[],
  ) {
    super(services, options);

    this.dataSource = dataSource;
    this.rpcCollections = rpcCollections;
  }

  override setupRoutes(router: Router): void {
    router.get('/rpc-schema', this.handleRpc.bind(this));
  }

  buildCollection(collection: Collection) {
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
    const rpcRelations = {};
    const collections = [];

    this.dataSource.collections.forEach(collection => {
      if (this.rpcCollections.includes(collection.name)) {
        const relations = {};

        Object.entries(collection.schema.fields).forEach(([name, field]) => {
          if (field.type !== 'Column' && !this.rpcCollections.includes(field.foreignCollection)) {
            relations[name] = field;
          }
        });

        if (Object.keys(relations).length > 0) rpcRelations[collection.name] = relations;
      } else {
        collections.push(this.buildCollection(collection));
      }
    });

    context.response.body = {
      collections: collections.filter(Boolean),
      charts: this.dataSource.schema.charts,
      rpcRelations,
    };
  }
}
