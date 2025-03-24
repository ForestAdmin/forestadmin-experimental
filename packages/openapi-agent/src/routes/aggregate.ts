import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { Aggregation, ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcAggregateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/aggregate`, this.handleAggregate.bind(this));
  }

  public async handleAggregate(context: any) {
    const { aggregation, filter: queryFilter, limit } = context.request.body;
    const caller = JSON.parse(context.headers.forest_caller as string);

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    const records = await this.collection.aggregate(
      caller,
      filter,
      new Aggregation(aggregation),
      Number.isNaN(limit) ? null : limit,
    );

    context.response.body = records;
  }
}
