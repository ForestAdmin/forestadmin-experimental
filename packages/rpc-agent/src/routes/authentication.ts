import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { RouteType } from '@forestadmin/agent/dist/types';
import { ForbiddenError } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';
import { createHmac, timingSafeEqual } from 'crypto';

export default class Authentication extends BaseRoute {
  readonly type = RouteType.Authentication;

  setupRoutes(router: Router): void {
    router.use(async (context, next) => {
      const { x_signature: signature, x_timestamp: timeStamp } = context.headers;

      if (!signature) {
        throw new ForbiddenError('Invalid signature.');
      }

      if (!timeStamp) {
        throw new ForbiddenError('Invalid timestamp.');
      }

      const expiredAt = new Date(timeStamp as string);
      expiredAt.setMinutes(expiredAt.getMinutes() + 1);

      if (new Date() >= expiredAt) {
        throw new ForbiddenError('Old signature.');
      }

      const token = createHmac('sha256', this.options.authSecret)
        .update(timeStamp as string)
        .digest('hex');

      if (!timingSafeEqual(Buffer.from(token), Buffer.from(signature as string))) {
        throw new ForbiddenError('Unable to authenticate the request.');
      } else {
        await next();
      }
    });
  }
}
