import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { Aggregation } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

import { parseCaller, parseFilter } from '../utils';

export default class RpcAggregateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/aggregate`, this.handleaggregate.bind(this));
  }

  public async handleaggregate(context: any) {
    const { aggregation, filter, limit } = context.request.body;

    const records = await this.collection.aggregate(
      parseCaller(context),
      parseFilter(this.collection, filter),
      new Aggregation(aggregation),
      Number.isNaN(limit) ? null : limit,
    );

    context.response.body = records;
  }
}
