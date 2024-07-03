import {
  BaseRoute,
  AgentOptionsWithDefaults as Options,
  ForestAdminHttpDriverServices as Services,
  getRootRoutes,
} from '@forestadmin/agent';
import { DataSource } from '@forestadmin/datasource-toolkit';

import RpcActionRoute from './action';
import RpcAggregateRoute from './aggregate';
import RpcChartRoute from './chart';
import RpcCreateRoute from './create';
import RpcDeleteRoute from './delete';
import RpcListRoute from './list';
import RpcSchemaRoute from './schema';
import RpcUpdateRoute from './update';

export const RPC_COLLECTION_ROUTES_CTOR = [
  RpcListRoute,
  RpcCreateRoute,
  RpcUpdateRoute,
  RpcDeleteRoute,
  RpcAggregateRoute,
  RpcChartRoute,
  RpcActionRoute,
];

function getRpcCollectionsRoutes(
  dataSource: DataSource,
  options: Options,
  services: Services,
): BaseRoute[] {
  const routes: BaseRoute[] = [];

  dataSource.collections.forEach(collection => {
    routes.push(
      ...RPC_COLLECTION_ROUTES_CTOR.map(
        Route => new Route(services, options, dataSource, collection.name),
      ),
    );
  });

  return routes;
}

export function makeRpcRoutes(
  dataSource: DataSource,
  options: Options,
  services: Services,
): BaseRoute[] {
  const routes = [
    ...getRootRoutes(options, services),
    new RpcSchemaRoute(services, options, dataSource),
    ...getRpcCollectionsRoutes(dataSource, options, services),
  ];

  // Ensure routes and middlewares are loaded in the right order.
  return routes.sort((a, b) => a.type - b.type);
}
