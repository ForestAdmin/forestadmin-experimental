import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import QueryStringParser from '@forestadmin/agent/dist/utils/query-string';
import { RecordData } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcCreateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/create`, this.handleCreate.bind(this));
  }

  public async handleCreate(context: any) {
    await this.services.authorization.assertCanAdd(context, this.collection.name);

    const records = await this.collection.create(
      QueryStringParser.parseCaller(context),
      context.request.body as RecordData[],
    );

    context.response.body = records;
  }
}
