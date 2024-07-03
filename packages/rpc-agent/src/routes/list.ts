import { CollectionRoute, QueryStringParser } from '@forestadmin/agent';
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
    await this.services.authorization.assertCanBrowse(context, this.collection.name);

    const projection = context.query.projection as string;
    const queryFilter = JSON.parse(context.query.filter as string);

    const paginatedFilter = new PaginatedFilter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
      sort: queryFilter.sort ? new Sort(...queryFilter.sort) : undefined,
      page: queryFilter.page ? new Page(queryFilter.page.skip, queryFilter.page.limit) : undefined,
    });

    const records = await this.collection.list(
      QueryStringParser.parseCaller(context),
      paginatedFilter,
      new Projection(...projection.split(',')),
    );

    context.response.body = records;
  }
}
