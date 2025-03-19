import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import {
  ConditionTreeFactory,
  Page,
  PaginatedFilter,
  Projection,
  Sort,
} from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcListRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.get(`/rpc/${this.collectionUrlSlug}/list`, this.handleList.bind(this));
  }

  public async handleList(context: any) {
    const projection = context.query.projection as string;
    const queryFilter = JSON.parse(context.query.filter as string);
    const caller = JSON.parse(context.headers.forest_caller as string);

    const paginatedFilter = new PaginatedFilter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
      sort: queryFilter.sort ? new Sort(...queryFilter.sort) : undefined,
      page: queryFilter.page ? new Page(queryFilter.page.skip, queryFilter.page.limit) : undefined,
    });

    const records = await this.collection.list(
      caller,
      paginatedFilter,
      new Projection(...projection.split(',')),
    );

    context.response.body = records;
  }
}
