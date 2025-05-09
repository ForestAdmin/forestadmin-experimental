import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { HttpCode } from '@forestadmin/agent/dist/types';
import { ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcDeleteRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.delete(`/rpc/${this.collectionUrlSlug}/delete`, this.handleDelete.bind(this));
  }

  public async handleDelete(context: any) {
    const queryFilter = context.request.body.filter;
    const caller = JSON.parse(context.headers.forest_caller as string);

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    await this.collection.delete(caller, filter);

    context.response.status = HttpCode.NoContent;
  }
}
