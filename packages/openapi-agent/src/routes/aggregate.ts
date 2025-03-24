import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { Aggregation, ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcAggregateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/aggregate`, this.handleaggregate.bind(this));
  }

  public async handleaggregate(context: any) {
    const { aggregation, filter: queryFilter, limit } = context.request.body;
    const caller = {
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

    console.log(records);

    context.response.body = records;
  }
}
