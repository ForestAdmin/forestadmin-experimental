import { Agent } from '@forestadmin/agent';
import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { TSchema } from '@forestadmin/datasource-customizer';
import { DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

import { makeRpcRoutes } from './routes';

export default class AgentWithOpenAPIInterface<S extends TSchema = TSchema> extends Agent<S> {
  private readonly rpcCollections: string[] = [];

  override getRoutes(dataSource: DataSource, services: ForestAdminHttpDriverServices) {
    const routes = super.getRoutes(dataSource, services);
    const rpcRoutes = makeRpcRoutes(dataSource, this.options, services, this.rpcCollections);

    return [
      {
        bootstrap: () => Promise.all(rpcRoutes.map(route => route.bootstrap())),
        setupRoutes: router => {
          const r = new Router({ prefix: '/mcp' });
          r.use(async (c, next) => {
            if (c.request.headers && !c.request.headers.forest_caller) {
              c.request.headers.forest_caller = JSON.stringify({
                id: -1,
                email: 'me@forestadmin.com',
                firstName: 'John',
                lastName: 'Doe',
                team: 'Operations',
                renderingId: 0,
                requestId: '0',
                tags: {},
                role: 'Operations',
                request: { ip: '127.0.0.1' },
                permissionLevel: 'admin' as const,
                timezone: 'Europe/Paris',
              });
            }

            await next();
          });
          rpcRoutes.forEach(route => route.setupRoutes(r));
          router.use(r.routes());
        },
      },
      {
        bootstrap: () => Promise.all(routes.map(route => route.bootstrap())),
        setupRoutes: router => {
          const r = new Router();
          routes.forEach(route => route.setupRoutes(r));
          router.use(r.routes());
        },
      },
    ] as unknown as BaseRoute[];
  }
}
