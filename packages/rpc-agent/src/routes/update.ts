import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { HttpCode } from '@forestadmin/agent/dist/types';
import QueryStringParser from '@forestadmin/agent/dist/utils/query-string';
import { ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcUpdateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.put(`/rpc/${this.collectionUrlSlug}/update`, this.handleUpdate.bind(this));
  }

  public async handleUpdate(context: any) {
    await this.services.authorization.assertCanEdit(context, this.collection.name);

    const queryFilter = JSON.parse(context.query.filter as string);

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    await this.collection.update(
      QueryStringParser.parseCaller(context),
      filter,
      context.request.body,
    );

    context.response.status = HttpCode.NoContent;
  }
}
