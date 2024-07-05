import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import QueryStringParser from '@forestadmin/agent/dist/utils/query-string';
import { CompositeId } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcChartRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.get(`/rpc/${this.collectionUrlSlug}/chart`, this.handleChart.bind(this));
  }

  public async handleChart(context: any) {
    await this.services.authorization.assertCanBrowse(context, this.collection.name);

    const chart = context.query.chart as string;
    const recordId = context.query.recordId as CompositeId;

    const chartResult = await this.collection.renderChart(
      QueryStringParser.parseCaller(context),
      chart,
      recordId,
    );

    context.response.body = chartResult;
  }
}
