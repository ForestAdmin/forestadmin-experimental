import http, { IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { Readable } from 'stream';

import RpcCollection from '../src/collection';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

async function startServer(handler: Handler): Promise<{ server: Server; uri: string }> {
  const server = http.createServer(handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const { address, port } = server.address() as AddressInfo;

  return { server, uri: `http://${address}:${port}` };
}

async function stopServer(server: Server) {
  await new Promise<void>(resolve => server.close(() => resolve()));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function buildCollection(uri: string) {
  const logger = jest.fn();
  const datasource = { collections: [], schema: { charts: [] } };
  const options = { uri, authSecret: 'secret' };
  const schema = {
    actions: {},
    charts: [],
    fields: {},
    segments: [],
    aggregationCapabilities: { supportedDateOperations: new Set(), supportGroups: false },
    countable: false,
    searchable: false,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new RpcCollection(logger as any, datasource as any, options, 'books', schema as any);
}

describe('RpcCollection.execute', () => {
  let server: Server;
  let uri: string;

  afterEach(async () => {
    if (server) await stopServer(server);
  });

  it('parses a JSON Success response and rebuilds invalidated as a Set', async () => {
    const received: { body?: unknown } = {};

    ({ server, uri } = await startServer(async (req, res) => {
      received.body = JSON.parse(await readBody(req));
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          type: 'Success',
          message: 'ok',
          invalidated: ['books'],
          response_headers: { 'x-foo': 'bar' },
        }),
      );
    }));

    const collection = buildCollection(uri);
    const result = await collection.execute({ id: 1 } as never, 'noop', { foo: 'bar' }, undefined);

    expect(received.body).toEqual({ action: 'noop', filter: undefined, data: { foo: 'bar' } });
    expect(result).toEqual({
      type: 'Success',
      message: 'ok',
      invalidated: new Set(['books']),
      responseHeaders: { 'x-foo': 'bar' },
    });
  });

  it('returns a FileResult with a Readable stream when X-Forest-Action-Type=File', async () => {
    ({ server, uri } = await startServer(async (req, res) => {
      await readBody(req);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="report%20final.pdf"');
      res.setHeader('X-Forest-Action-Type', 'File');
      res.setHeader('X-Forest-Action-File-Name', 'report%20final.pdf');
      res.setHeader(
        'X-Forest-Action-Response-Headers',
        JSON.stringify({ 'set-cookie': 'token=xyz' }),
      );
      Readable.from([Buffer.from('hello-pdf')]).pipe(res);
    }));

    const collection = buildCollection(uri);
    const result = await collection.execute({ id: 1 } as never, 'download', {}, undefined);

    expect(result.type).toBe('File');
    if (result.type !== 'File') throw new Error('unreachable');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.name).toBe('report final.pdf');
    expect(result.responseHeaders).toEqual({ 'set-cookie': 'token=xyz' });

    const chunks: Uint8Array[] = [];
    for await (const chunk of result.stream) chunks.push(chunk as Uint8Array);
    expect(Buffer.concat(chunks).toString('utf-8')).toBe('hello-pdf');
  });

  it('omits responseHeaders when the header is absent', async () => {
    ({ server, uri } = await startServer(async (req, res) => {
      await readBody(req);
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('X-Forest-Action-Type', 'File');
      res.setHeader('X-Forest-Action-File-Name', 'note.txt');
      res.end('hi');
    }));

    const collection = buildCollection(uri);
    const result = await collection.execute({ id: 1 } as never, 'download', {}, undefined);

    expect(result.type).toBe('File');
    if (result.type !== 'File') throw new Error('unreachable');
    expect(result.responseHeaders).toBeUndefined();
    expect(result.name).toBe('note.txt');
  });
});
