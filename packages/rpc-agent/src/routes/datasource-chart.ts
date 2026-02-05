import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

import { parseCaller } from '../utils';

export default class RpcDatasourceChartRoute extends BaseRoute {
  type = RouteType.PrivateRoute;

  protected readonly dataSource: DataSource;

  constructor(
    services: ForestAdminHttpDriverServices,
    options: AgentOptionsWithDefaults,
    dataSource: DataSource,
  ) {
    super(services, options);

    this.dataSource = dataSource;
  }

  override setupRoutes(router: Router): void {
    router.post(`/rpc-datasource-chart`, this.handleDatasourceChart.bind(this));
  }

  async handleDatasourceChart(context: any) {
    const { chart } = context.request.body;

    context.response.body = await this.dataSource.renderChart(parseCaller(context), chart);
  }
}
