import CollectionRoute from '@forestadmin/agent/dist/routes/collection-route';
import Router from '@koa/router';

import { parseCaller } from '../utils';

export default class RpcChartRoute extends CollectionRoute {
  setupRoutes(router: Router): void {
    router.post(`/rpc/${this.collectionUrlSlug}/chart`, this.handleChart.bind(this));
  }

  public async handleChart(context: any) {
    const { chart, record_id: recordId } = context.request.body;

    const chartResult = await this.collection.renderChart(parseCaller(context), chart, recordId);

    context.response.body = chartResult;
  }
}
