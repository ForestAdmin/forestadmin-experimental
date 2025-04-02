import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { RecordData } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcCreateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/create`, this.handleCreate.bind(this));
  }

  public async handleCreate(context: any) {
    const caller = JSON.parse(context.headers.forest_caller as string);

    const records = await this.collection.create(caller, context.request.body as RecordData[]);

    context.response.body = records;
  }
}
