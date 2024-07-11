import { BaseDataSource, Caller, Logger } from '@forestadmin/datasource-toolkit';
import superagent from 'superagent';

import RpcCollection from './collection';
import { RpcDataSourceOptionsWithToken, RpcSchema } from './types';

export default class RpcDataSource extends BaseDataSource {
  private readonly options: RpcDataSourceOptionsWithToken;
  private readonly logger: Logger;
  protected readonly _charts: string[];

  constructor(logger: Logger, options: RpcDataSourceOptionsWithToken, introspection: RpcSchema) {
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
  }

  override get schema() {
    return { charts: this._charts };
  }

  override async renderChart(caller: Caller, name: string) {
    const { timezone: tz } = caller;
    const url = `${
      this.options.uri
    }/forest/rpc-datasource-chart?timezone=${tz}&chart=${name}&caller=${JSON.stringify(caller)}`;

    this.logger('Debug', `Forwarding datasource chart '${name}' call to the Rpc agent on ${url}.`);

    const request = superagent.get(url);
    request.auth(this.options.token, { type: 'bearer' });
    const response = await request.send();

    return response.body;
  }
}
