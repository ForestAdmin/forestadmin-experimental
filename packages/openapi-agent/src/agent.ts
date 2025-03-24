// eslint-disable-next-line max-classes-per-file
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
