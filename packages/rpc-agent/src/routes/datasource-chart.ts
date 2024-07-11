import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

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
    router.get(`/rpc-datasource-chart`, this.handleDatasourceChart.bind(this));
  }

  async handleDatasourceChart(context: any) {
    const chartName = context.query.chart;
    const caller = JSON.parse(context.query.caller as string);

    context.response.body = await this.dataSource.renderChart(caller, chartName);
  }
}
