import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { RecordData } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcCreateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/create`, this.handleCreate.bind(this));
  }

  public async handleCreate(context: any) {
    let caller = {
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
    };

    try {
      caller = JSON.parse(context.headers as string);
    } catch (err) {
      // do nothing
    }

    const records = await this.collection.create(
      caller,
      context.request.body?.data
        ? context.request.body.data
        : (context.request.body as RecordData[]),
    );

    context.response.body = records;
  }
}
