import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { Projection } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

import { parseCaller, parsePaginatedFilter } from '../utils';

export default class RpcListRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/list`, this.handleList.bind(this));
  }

  public async handleList(context: any) {
    const { projection, filter } = context.request.body;

    const records = await this.collection.list(
      parseCaller(context),
      parsePaginatedFilter(this.collection, filter),
      new Projection(projection),
    );

    context.response.body = records;
  }
}
