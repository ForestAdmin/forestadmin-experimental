import { BaseDataSource, Caller, Logger } from '@forestadmin/datasource-toolkit';
import superagent from 'superagent';

import RpcCollection from './collection';
import { RpcDataSourceOptions, RpcSchema } from './types';
import { appendHeaders } from './utils';

export default class RpcDataSource extends BaseDataSource {
  private readonly options: RpcDataSourceOptions;
  private readonly logger: Logger;
  protected readonly _charts: string[];
  readonly rpcRelations: RpcSchema['rpcRelations'];

  constructor(logger: Logger, options: RpcDataSourceOptions, introspection: RpcSchema) {
    super();

    this.options = options;
    this.logger = logger;

    logger(
      'Info',
      // eslint-disable-next-line max-len
      `Building Rpc Datasource with ${introspection.collections.length} collections and ${introspection.charts.length} charts.`,
    );

    introspection.collections.forEach(schema =>
      this.addCollection(new RpcCollection(logger, this, options, schema.name, schema)),
    );

    this._charts = introspection.charts;
    this.rpcRelations = introspection.rpcRelations;
  }

  override get schema() {
    return { charts: this._charts };
  }

  override async renderChart(caller: Caller, name: string) {
    const url = `${this.options.uri}/forest/rpc-datasource-chart?chart=${name}`;

    this.logger('Debug', `Forwarding datasource chart '${name}' call to the Rpc agent on ${url}.`);

    const request = superagent.get(url);
    appendHeaders(request, this.options.authSecret, caller);

    const response = await request.send();

    return response.body;
  }
}
