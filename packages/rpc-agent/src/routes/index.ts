import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import ErrorHandlingRoute from '@forestadmin/agent/dist/routes/system/error-handling';
import HealthcheckRoute from '@forestadmin/agent/dist/routes/system/healthcheck';
import LoggerRoute from '@forestadmin/agent/dist/routes/system/logger';
import { ForestAdminHttpDriverServices as Services } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults as Options } from '@forestadmin/agent/dist/types';
import { DataSource } from '@forestadmin/datasource-toolkit';

import RpcActionRoute from './action';
import RpcAggregateRoute from './aggregate';
import AuthenticationRoute from './authentication';
import RpcChartRoute from './chart';
import RpcCreateRoute from './create';
import RpcDatasourceChartRoute from './datasource-chart';
import RpcDeleteRoute from './delete';
import RpcListRoute from './list';
import RpcSchemaRoute from './schema';
import SseRoute from './sse';
import RpcUpdateRoute from './update';

export const ROOT_ROUTES_CTOR = [
  AuthenticationRoute,
  ErrorHandlingRoute,
  HealthcheckRoute,
  LoggerRoute,
];

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
  rpcCollections: string[],
): BaseRoute[] {
  const routes = [
    ...getRootRoutes(options, services),
    new SseRoute(services, options),
    new RpcSchemaRoute(services, options, dataSource, rpcCollections),
    ...getRpcCollectionsRoutes(dataSource, options, services),
    new RpcDatasourceChartRoute(services, options, dataSource),
  ];

  // Ensure routes and middlewares are loaded in the right order.
  return routes.sort((a, b) => a.type - b.type);
}
