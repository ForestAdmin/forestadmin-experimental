import {
  ActionResult,
  Aggregation,
  BaseCollection,
  Caller,
  CollectionSchema,
  CompositeId,
  DataSource,
  Filter,
  GetFormMetas,
  Logger,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';
import { IncomingHttpHeaders } from 'http';
import { Readable } from 'stream';
import superagent from 'superagent';

import { RpcDataSourceOptions } from './types';
import { appendHeaders, keysToCamel, keysToSnake } from './utils';

export default class RpcCollection extends BaseCollection {
  private readonly logger: Logger;
  private readonly options: RpcDataSourceOptions;
  private readonly rpcCollectionUri: string;

  constructor(
    logger: Logger,
    datasource: DataSource,
    options: RpcDataSourceOptions,
    name: string,
    schema: CollectionSchema,
  ) {
    super(name, datasource);

    this.logger = logger;
    this.options = options;
    this.rpcCollectionUri = `${options.uri}/forest/rpc/${name}`;

    logger('Debug', `Create Rpc collection ${name}.`);

    if (schema.countable) this.enableCount();
    if (schema.searchable) this.enableSearch();

    Object.entries(schema.actions).forEach(([actionName, actionSchema]) => {
      this.addAction(actionName, actionSchema);
    });

    schema.charts.forEach(chart => this.addChart(chart));

    Object.entries(schema.fields).forEach(([fieldName, fieldSchema]) => {
      this.addField(fieldName, fieldSchema);
    });

    this.addSegments(schema.segments);

    this.setAggregationCapabilities(schema.aggregationCapabilities);
  }

  async create(caller: Caller, data: RecordData[]) {
    const url = `${this.rpcCollectionUri}/create`;

    this.logger('Debug', `Forwarding '${this.name}' creation call to the Rpc agent on ${url}.`);

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    const response = await request.send({ data });

    return response.body;
  }

  async list(caller: Caller, filter: PaginatedFilter, projection: Projection) {
    const url = `${this.rpcCollectionUri}/list`;

    this.logger('Debug', `Forwarding '${this.name}' list call to the Rpc agent on ${url}.`);

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    const response = await request.send({ projection, filter: keysToSnake(filter) });

    return response.body;
  }

  async update(caller: Caller, filter: Filter, patch: RecordData) {
    const url = `${this.rpcCollectionUri}/update`;

    this.logger('Debug', `Forwarding '${this.name}' update call to the Rpc agent on ${url}.`);

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    await request.send({ patch, filter: keysToSnake(filter) });
  }

  async delete(caller: Caller, filter: Filter) {
    const url = `${this.rpcCollectionUri}/delete`;

    this.logger('Debug', `Forwarding '${this.name}' deletion call to the Rpc agent on ${url}.`);

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    await request.send({ filter: keysToSnake(filter) });
  }

  async aggregate(caller: Caller, filter: Filter, aggregation: Aggregation, limit?: number) {
    const url = `${this.rpcCollectionUri}/aggregate`;

    this.logger('Debug', `Forwarding '${this.name}' aggragation call to the Rpc agent on ${url}.`);

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    const response = await request.send({
      filter: keysToSnake(filter),
      aggregation: keysToSnake(aggregation),
      limit,
    });

    return response.body;
  }

  override async execute(
    caller: Caller,
    name: string,
    formValues: RecordData,
    filter?: Filter,
  ): Promise<ActionResult> {
    const url = `${this.rpcCollectionUri}/action-execute`;

    this.logger(
      'Debug',
      `Forwarding '${this.name}' action '${name}' call to the Rpc agent on ${url}.`,
    );

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    // Buffer the response ourselves to branch between binary (File) and JSON paths on the
    // response headers — superagent's default JSON parser would error on binary bodies.
    request.buffer(true);
    request.parse((res, callback) => {
      const chunks: Uint8Array[] = [];
      res.on('data', (chunk: Uint8Array) => chunks.push(chunk));
      res.once('end', () =>
        callback(null, { headers: res.headers, buffer: Buffer.concat(chunks) }),
      );
      res.once('error', err => callback(err, null));
    });

    const response = await request.send({
      action: name,
      filter: keysToSnake(filter),
      data: formValues,
    });
    const { headers, buffer } = response.body as {
      headers: IncomingHttpHeaders;
      buffer: Buffer;
    };

    if (headers['x-forest-action-type'] === 'File') {
      const responseHeaders = headers['x-forest-action-response-headers'] as string | undefined;
      const fileNameHeader = (headers['x-forest-action-file-name'] as string) || '';

      return {
        type: 'File',
        mimeType: headers['content-type'] as string,
        name: decodeURIComponent(fileNameHeader),
        stream: Readable.from(buffer),
        ...(responseHeaders ? { responseHeaders: JSON.parse(responseHeaders) } : {}),
      };
    }

    const raw = buffer.toString('utf-8');
    const body = keysToCamel(raw ? JSON.parse(raw) : {});
    body.invalidated = new Set(body.invalidated);

    return body;
  }

  override async getForm(
    caller: Caller,
    name: string,
    formValues?: RecordData,
    filter?: Filter,
    metas?: GetFormMetas,
  ) {
    const url = `${this.rpcCollectionUri}/action-form`;

    this.logger(
      'Debug',
      `Forwarding '${this.name}' action form '${name}' call to the Rpc agent on ${url}.`,
    );

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    const response = await request.send({
      action: name,
      filter: keysToSnake(filter),
      metas: keysToSnake(metas),
      data: formValues,
    });

    return keysToCamel(response.body);
  }

  override async renderChart(
    caller: Caller,
    name: string,
    recordId: CompositeId,
    parameters?: Record<string, string>,
  ) {
    const url = `${this.rpcCollectionUri}/chart`;

    this.logger(
      'Debug',
      `Forwarding '${this.name}' chart '${name}' call to the Rpc agent on ${url}.`,
    );

    const request = superagent.post(url);
    appendHeaders(request, this.options.authSecret, caller);
    const response = await request.send({ chart: name, record_id: recordId, parameters });

    return response.body;
  }
}
