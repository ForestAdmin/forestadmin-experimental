import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { HttpCode } from '@forestadmin/agent/dist/types';
import { ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcUpdateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.put(`/rpc/${this.collectionUrlSlug}/update`, this.handleUpdate.bind(this));
  }

  public async handleUpdate(context: any) {
    const queryFilter = JSON.parse(context.query.filter as string);
    const caller = JSON.parse(context.headers.forest_caller as string);

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    await this.collection.update(caller, filter, context.request.body);

    context.response.status = HttpCode.NoContent;
  }
}
