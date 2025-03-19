import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcActionRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/action-execute`, this.handleExecute.bind(this));
    router.post(`/rpc/${this.collectionUrlSlug}/action-form`, this.handleForm.bind(this));
  }

  public async handleExecute(context: any) {
    const action = context.query.action as string;
    const queryFilter = JSON.parse(context.query.filter as string);
    const caller = JSON.parse(context.headers.forest_caller as string);

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    const actionResult = await this.collection.execute(
      caller,
      action,
      context.request.body,
      filter,
    );

    // TODO action with file

    context.response.body = {
      ...actionResult,
      invalidated: actionResult.type === 'Success' ? Array.from(actionResult.invalidated) : [],
    };
  }

  public async handleForm(context: any) {
    const action = context.query.action as string;

    // All this things can be null when asking form fo FA schema generation
    const queryFilter = JSON.parse(context.query?.filter || '{}');
    const metas = JSON.parse(context.query?.metas || '{}');
    const caller = JSON.parse(context.headers.forest_caller || '{}');

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    const actionFields = await this.collection.getForm(
      caller,
      action,
      context.request.body,
      filter,
      metas,
    );

    context.response.body = actionFields;
  }
}
