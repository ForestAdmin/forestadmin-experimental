import { CollectionRoute, QueryStringParser } from '@forestadmin/agent';
import { Aggregation, ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcAggregateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.get(`/rpc/${this.collectionUrlSlug}/aggregate`, this.handleaggregate.bind(this));
  }

  public async handleaggregate(context: any) {
    await this.services.authorization.assertCanBrowse(context, this.collection.name);

    const aggregation = JSON.parse(context.query.aggregation as string);
    const queryFilter = JSON.parse(context.query.filter as string);
    const limit = Number(context.query.limit);

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    const records = await this.collection.aggregate(
      QueryStringParser.parseCaller(context),
      filter,
      new Aggregation(aggregation),
      Number.isNaN(limit) ? null : limit,
    );

    context.response.body = records;
  }
}
