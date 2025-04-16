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
    router.post(`/rpc/${this.collectionUrlSlug}/list`, this.handleList.bind(this));
  }

  public async handleList(context: any) {
    const { projection, filter } = context.request.body;
    const caller = JSON.parse(context.headers.forest_caller as string);

    const paginatedFilter = new PaginatedFilter({
      ...filter,
      conditionTree: filter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(filter.conditionTree)
        : undefined,
      sort: filter?.sort ? new Sort(...filter.sort) : undefined,
      page: filter?.page ? new Page(filter.page.skip, filter.page.limit) : undefined,
    });

    const records = await this.collection.list(caller, paginatedFilter, new Projection(projection));

    context.response.body = records;
  }
}
