import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import Router from '@koa/router';

import { parseCaller } from '../utils';

export default class RpcCreateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/create`, this.handleCreate.bind(this));
  }

  public async handleCreate(context: any) {
    const { data } = context.request.body;

    const records = await this.collection.create(parseCaller(context), data);

    context.response.body = records;
  }
}
