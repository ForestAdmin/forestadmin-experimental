import {
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
import superagent from 'superagent';

import { RpcDataSourceOptions } from './types';
import { setAuth } from './utils';

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
      if (fieldSchema.type === 'Column') {
        fieldSchema.filterOperators = new Set(fieldSchema.filterOperators);
      }

      this.addField(fieldName, fieldSchema);
    });

    this.addSegments(schema.segments);
  }

  async create(caller: Caller, data: RecordData[]) {
    const url = `${this.rpcCollectionUri}/create?timezone=${
      caller.timezone
    }&caller=${JSON.stringify(caller)}`;

    this.logger('Debug', `Forwarding '${this.name}' creation call to the Rpc agent on ${url}.`);

    const request = superagent.post(url);
    setAuth(request, this.options.authSecret);
    const response = await request.send(data);

    return response.body;
  }

  async list(caller: Caller, filter: PaginatedFilter, projection: Projection) {
    const url = `${this.rpcCollectionUri}/list?timezone=${caller.timezone}&filter=${JSON.stringify(
      filter,
    )}&projection=${projection}&caller=${JSON.stringify(caller)}`;

    this.logger('Debug', `Forwarding '${this.name}' list call to the Rpc agent on ${url}.`);

    const request = superagent.get(url);
    setAuth(request, this.options.authSecret);
    const response = await request.send();

    return response.body;
  }

  async update(caller: Caller, filter: Filter, patch: RecordData) {
    const url = `${this.rpcCollectionUri}/update?timezone=${
      caller.timezone
    }&filter=${JSON.stringify(filter)}&caller=${JSON.stringify(caller)}`;

    this.logger('Debug', `Forwarding '${this.name}' update call to the Rpc agent on ${url}.`);

    const request = superagent.put(url);
    setAuth(request, this.options.authSecret);
    await request.send(patch);
  }

  async delete(caller: Caller, filter: Filter) {
    const url = `${this.rpcCollectionUri}/delete?timezone=${
      caller.timezone
    }&filter=${JSON.stringify(filter)}&caller=${JSON.stringify(caller)}`;

    this.logger('Debug', `Forwarding '${this.name}' deletion call to the Rpc agent on ${url}.`);

    const request = superagent.delete(url);
    setAuth(request, this.options.authSecret);
    await request.send();
  }

  async aggregate(caller: Caller, filter: Filter, aggregation: Aggregation, limit?: number) {
    const url = `${this.rpcCollectionUri}/aggregate?timezone=${
      caller.timezone
    }&filter=${JSON.stringify(filter)}&aggregation=${JSON.stringify(
      aggregation,
    )}&limit=${limit}&caller=${JSON.stringify(caller)}`;

    this.logger('Debug', `Forwarding '${this.name}' aggragation call to the Rpc agent on ${url}.`);

    const request = superagent.get(url);
    setAuth(request, this.options.authSecret);
    const response = await request.send();

    return response.body;
  }

  override async execute(caller: Caller, name: string, formValues: RecordData, filter?: Filter) {
    const url = `${this.rpcCollectionUri}/action-execute?timezone=${
      caller.timezone
    }&action=${name}&filter=${JSON.stringify(filter)}&caller=${JSON.stringify(caller)}`;

    this.logger(
      'Debug',
      `Forwarding '${this.name}' action '${name}' call to the Rpc agent on ${url}.`,
    );

    const request = superagent.post(url);
    setAuth(request, this.options.authSecret);
    const response = await request.send(formValues);

    response.body.invalidated = new Set(response.body.invalidated);

    // TODO action with file

    return response.body;
  }

  override async getForm(
    caller: Caller,
    name: string,
    formValues?: RecordData,
    filter?: Filter,
    metas?: GetFormMetas,
  ) {
    let url = `${this.rpcCollectionUri}/action-form?action=${name}`;

    // Caller can be null for the FA schema generation
    if (caller) {
      url += `&timezone=${caller.timezone}&filter=${JSON.stringify(filter)}&metas=${JSON.stringify(
        metas,
      )}&caller=${JSON.stringify(caller)}`;
    }

    this.logger(
      'Debug',
      `Forwarding '${this.name}' action form '${name}' call to the Rpc agent on ${url}.`,
    );

    const request = superagent.post(url);
    setAuth(request, this.options.authSecret);
    const response = await request.send(formValues || {});

    return response.body;
  }

  override async renderChart(caller: Caller, name: string, recordId: CompositeId) {
    const { timezone: tz } = caller;
    const url = `${
      this.rpcCollectionUri
    }/chart?timezone=${tz}&chart=${name}&recordId=${recordId}&caller=${JSON.stringify(caller)}`;

    this.logger(
      'Debug',
      `Forwarding '${this.name}' chart '${name}' call to the Rpc agent on ${url}.`,
    );

    const request = superagent.get(url);
    setAuth(request, this.options.authSecret);
    const response = await request.send();

    return response.body;
  }
}
