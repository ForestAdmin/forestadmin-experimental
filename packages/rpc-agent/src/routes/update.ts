import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { HttpCode } from '@forestadmin/agent/dist/types';
import Router from '@koa/router';

import { parseCaller, parseFilter } from '../utils';

export default class RpcUpdateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/update`, this.handleUpdate.bind(this));
  }

  public async handleUpdate(context: any) {
    const { filter, patch } = context.request.body;

    await this.collection.update(parseCaller(context), parseFilter(this.collection, filter), patch);

    context.response.status = HttpCode.NoContent;
  }
}
