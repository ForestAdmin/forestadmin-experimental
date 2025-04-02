import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { RouteType } from '@forestadmin/agent/dist/types';
import Router from '@koa/router';
import { PassThrough } from 'stream';

export default class SseRoute extends BaseRoute {
  type = RouteType.PrivateRoute;

  override setupRoutes(router: Router): void {
    router.get('/sse', this.handleSSe.bind(this));
  }

  async handleSSe(context: any) {
    context.request.socket.setTimeout(0);
    context.req.socket.setNoDelay(true);
    context.req.socket.setKeepAlive(true);

    context.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const stream = new PassThrough();

    context.status = 200;
    context.body = stream;

    stream.write('ok');
  }
}
