import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { RouteType } from '@forestadmin/agent/dist/types';
import { AuthenticationError, ForbiddenError } from '@forestadmin/forestadmin-client';
import Router from '@koa/router';
import jsonwebtoken from 'jsonwebtoken';
import jwt from 'koa-jwt';

export default class Authentication extends BaseRoute {
  readonly type = RouteType.Authentication;

  setupRoutes(router: Router): void {
    router.post(
      '/authentication',
      this.handleError.bind(this),
      this.handleAuthentication.bind(this),
    );

    router.use(jwt({ secret: this.options.authSecret, cookie: 'forest_session_token' }));
  }

  private async handleAuthentication(context: any): Promise<void> {
    const { body } = context.request;

    if (body.authSecret !== this.options.authSecret) {
      throw new AuthenticationError({
        name: 'Authentication credentials error',
        error_description: 'Invalid credentials.',
        message: 'Invalid credentials.',
      });
    }

    // return jsonwebtoken.sign(caller, this.options.authSecret);
    context.response.body = { token: jsonwebtoken.sign({}, this.options.authSecret) };
  }

  private async handleError(context: any, next: any): Promise<void> {
    try {
      await next();
    } catch (e) {
      if (e instanceof ForbiddenError) {
        context.response.status = 403;
        context.response.body = {
          error: 403,
          error_description: e.message,
        };

        return;
      }

      if (e instanceof AuthenticationError) {
        context.response.status = 401;
        context.response.body = {
          error: e.code,
          error_description: e.description,
          state: e.state,
        };

        return;
      }

      throw e;
    }
  }
}
