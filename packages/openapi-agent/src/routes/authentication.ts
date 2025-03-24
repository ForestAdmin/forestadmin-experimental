import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { RouteType } from '@forestadmin/agent/dist/types';
import { ForbiddenError } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class Authentication extends BaseRoute {
  readonly type = RouteType.Authentication;

  setupRoutes(router: Router): void {
    router.use(async (context, next) => {
      const { apiKeys } = this.options as any;

      if (apiKeys.includes(context.headers.x_api_key)) {
        await next();
      } else {
        throw new ForbiddenError('Missing signature');
      }
    });
  }
}
