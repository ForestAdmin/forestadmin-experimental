import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { HttpCode } from '@forestadmin/agent/dist/types';
import Router from '@koa/router';

import { parseCaller, parseFilter } from '../utils';

export default class RpcDeleteRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/delete`, this.handleDelete.bind(this));
  }

  public async handleDelete(context: any) {
    const { filter } = context.request.body;

    await this.collection.delete(parseCaller(context), parseFilter(this.collection, filter));

    context.response.status = HttpCode.NoContent;
  }
}
