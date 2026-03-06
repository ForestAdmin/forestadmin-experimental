import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import Router from '@koa/router';

import { keysToSnake, parseCaller, parseFilter } from '../utils';

export default class RpcActionRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/action-execute`, this.handleExecute.bind(this));
    router.post(`/rpc/${this.collectionUrlSlug}/action-form`, this.handleForm.bind(this));
  }

  public async handleExecute(context: any) {
    const { action, filter, data } = context.request.body;

    const actionResult = await this.collection.execute(
      parseCaller(context),
      action,
      data,
      parseFilter(this.collection, filter),
    );

    // TODO action with file

    context.response.body = {
      ...keysToSnake(actionResult),
      invalidated: actionResult.type === 'Success' ? Array.from(actionResult.invalidated) : [],
    };
  }

  public async handleForm(context: any) {
    // All this things can be null when asking form fo FA schema generation
    const { action, metas, filter, data } = context.request.body;

    const actionFields = await this.collection.getForm(
      parseCaller(context),
      action,
      data,
      parseFilter(this.collection, filter),
      metas || {},
    );

    context.response.body = keysToSnake(actionFields);
  }
}
