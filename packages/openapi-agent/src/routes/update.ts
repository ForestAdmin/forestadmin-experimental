import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { HttpCode } from '@forestadmin/agent/dist/types';
import { ConditionTreeFactory, Filter } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcUpdateRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.put(`/rpc/${this.collectionUrlSlug}/update`, this.handleUpdate.bind(this));
  }

  public async handleUpdate(context: any) {
    const { filter: queryFilter, patch } = context.request.body;
    let caller = {
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

    try {
      caller = JSON.parse(context.headers as string);
    } catch (err) {
      // do nothing
    }

    const filter = new Filter({
      ...queryFilter,
      conditionTree: queryFilter?.conditionTree
        ? ConditionTreeFactory.fromPlainObject(queryFilter.conditionTree)
        : undefined,
    });

    await this.collection.update(caller, filter, patch);

    context.response.status = HttpCode.NoContent;
  }
}
