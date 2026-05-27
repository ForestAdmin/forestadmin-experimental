import { Readable } from 'stream';

import RpcActionRoute from '../../src/routes/action';

type FakeContext = {
  request: { body: unknown; headers: Record<string, string> };
  headers: Record<string, string>;
  response: { body?: unknown };
  body?: unknown;
  set: jest.Mock;
};

function createContext(body: unknown): FakeContext {
  return {
    request: { body, headers: {} },
    headers: {},
    response: {},
    set: jest.fn(),
  };
}

function createRoute(execute: jest.Mock) {
  const route = Object.create(RpcActionRoute.prototype) as RpcActionRoute & {
    collection: { execute: jest.Mock };
  };

  Object.defineProperty(route, 'collection', {
    value: { execute },
    configurable: true,
  });

  return route;
}

describe('RpcActionRoute', () => {
  describe('handleExecute', () => {
    it('serialises a Success result as JSON with invalidated as array', async () => {
      const execute = jest.fn().mockResolvedValue({
        type: 'Success',
        message: 'done',
        invalidated: new Set(['books', 'authors']),
        responseHeaders: { 'x-foo': 'bar' },
      });
      const route = createRoute(execute);
      const ctx = createContext({ action: 'noop', filter: null, data: { id: 1 } });

      await route.handleExecute(ctx);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(ctx.set).not.toHaveBeenCalled();
      expect(ctx.response.body).toEqual({
        type: 'Success',
        message: 'done',
        response_headers: { 'x-foo': 'bar' },
        invalidated: ['books', 'authors'],
      });
    });

    it('streams a File result with the expected headers', async () => {
      const stream = Readable.from(['hello']);
      const execute = jest.fn().mockResolvedValue({
        type: 'File',
        mimeType: 'application/pdf',
        name: 'report final.pdf',
        stream,
      });
      const route = createRoute(execute);
      const ctx = createContext({ action: 'download', filter: null, data: {} });

      await route.handleExecute(ctx);

      expect(ctx.set).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(ctx.set).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="report%20final.pdf"',
      );
      expect(ctx.set).toHaveBeenCalledWith('X-Forest-Action-Type', 'File');
      expect(ctx.set).toHaveBeenCalledWith('X-Forest-Action-File-Name', 'report%20final.pdf');
      expect(ctx.set).not.toHaveBeenCalledWith(
        'X-Forest-Action-Response-Headers',
        expect.anything(),
      );
      expect(ctx.body).toBe(stream);
      expect(ctx.response.body).toBeUndefined();
    });

    it('forwards responseHeaders on File result via X-Forest-Action-Response-Headers', async () => {
      const execute = jest.fn().mockResolvedValue({
        type: 'File',
        mimeType: 'text/csv',
        name: 'export.csv',
        stream: Readable.from(['a,b']),
        responseHeaders: { 'set-cookie': 'token=xyz' },
      });
      const route = createRoute(execute);
      const ctx = createContext({ action: 'export', filter: null, data: {} });

      await route.handleExecute(ctx);

      expect(ctx.set).toHaveBeenCalledWith(
        'X-Forest-Action-Response-Headers',
        JSON.stringify({ 'set-cookie': 'token=xyz' }),
      );
    });
  });
});
