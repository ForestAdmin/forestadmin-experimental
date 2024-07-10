import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import { CompositeId } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcChartRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.get(`/rpc/${this.collectionUrlSlug}/chart`, this.handleChart.bind(this));
  }

  public async handleChart(context: any) {
    const chart = context.query.chart as string;
    const recordId = context.query.recordId as CompositeId;
    const caller = JSON.parse(context.query.caller as string);

    const chartResult = await this.collection.renderChart(caller, chart, recordId);

    context.response.body = chartResult;
  }
}
