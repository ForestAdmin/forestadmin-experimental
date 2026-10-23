import { Projection } from '@forestadmin/datasource-toolkit';

import RpcListRoute from '../../src/routes/list';

describe('RpcListRoute', () => {
  describe('handleList', () => {
    it('builds a flat projection from the received field list', async () => {
      const list = jest.fn().mockResolvedValue([{ id: 1 }]);
      const route = Object.create(RpcListRoute.prototype) as RpcListRoute;
      Object.defineProperty(route, 'collection', { value: { list }, configurable: true });
      const ctx = {
        request: { body: { projection: ['id', 'author:name'], filter: {} } },
        headers: {},
        response: {} as { body?: unknown },
      };

      await route.handleList(ctx);

      const projection = list.mock.calls[0][2];
      expect(projection).toBeInstanceOf(Projection);
      expect([...projection]).toEqual(['id', 'author:name']);
      expect(projection.relations).toEqual({ author: ['name'] });
      expect(ctx.response.body).toEqual([{ id: 1 }]);
    });
  });
});
