import { ROOT_ROUTES_CTOR } from '@forestadmin/agent/dist/routes';
import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices as Services } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults as Options } from '@forestadmin/agent/dist/types';
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

export function getRootRoutes(options: Options, services: Services): BaseRoute[] {
  return ROOT_ROUTES_CTOR.map(Route => new Route(services, options));
}

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
