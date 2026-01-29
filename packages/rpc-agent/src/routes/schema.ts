import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { Collection, DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

import { keysToSnake, transformFilteroperator } from '../utils';

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

  buildCollection(collection: Collection, relations) {
    const buildedFields = Object.entries(collection.schema.fields).reduce(
      (fields, [name, schema]) => {
        const field = keysToSnake(schema);

        if (schema.type !== 'Column' && this.rpcCollections.includes(schema.foreignCollection)) {
          relations[name] = field;
        } else {
          fields[name] = keysToSnake(schema);

          if (schema.type === 'Column') {
            fields[name].filter_operators = transformFilteroperator(schema.filterOperators);
          }
        }

        return fields;
      },
      {},
    );

    const buildedActions = Object.entries(collection.schema.actions).reduce(
      (actions, [name, schema]) => {
        actions[name] = keysToSnake(schema);

        return actions;
      },
      {},
    );

    return {
      name: collection.name,
      ...collection.schema,
      fields: buildedFields,
      actions: buildedActions,
    };
  }

  async handleRpc(context: any) {
    const rpcRelations = {};
    const collections = [];

    this.dataSource.collections.forEach(collection => {
      const relations = {};

      if (this.rpcCollections.includes(collection.name)) {
        Object.entries(collection.schema.fields).forEach(([name, field]) => {
          if (field.type !== 'Column' && !this.rpcCollections.includes(field.foreignCollection)) {
            relations[name] = keysToSnake(field);
          }
        });

        if (Object.keys(relations).length > 0) rpcRelations[collection.name] = relations;
      } else {
        collections.push(this.buildCollection(collection, relations));
      }
    });

    context.response.body = {
      collections: collections.filter(Boolean),
      charts: this.dataSource.schema.charts,
      rpc_relations: rpcRelations,
      native_query_connections: Object.keys(this.dataSource.nativeQueryConnections).map(c => ({
        name: c,
      })),
    };
  }
}
