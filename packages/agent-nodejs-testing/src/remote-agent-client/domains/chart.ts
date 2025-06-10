import type HttpRequester from '../http-requester';

import { DistributionChart, PercentageChart, ValueChart } from '@forestadmin/datasource-toolkit';

export default abstract class Chart {
  protected httpRequester: HttpRequester;

  async valueChart(chartName: string): Promise<ValueChart> {
    return this.dashboardChart(chartName);
  }

  async distributionChart(chartName: string): Promise<DistributionChart> {
    return this.dashboardChart(chartName);
  }

  async percentageChart(chartName: string): Promise<PercentageChart> {
    return this.dashboardChart(chartName);
  }

  async objectiveChart<Data = unknown>(chartName: string): Promise<Data> {
    return this.dashboardChart(chartName);
  }

  async leaderboardChart<Data = unknown>(chartName: string): Promise<Data> {
    return this.dashboardChart(chartName);
  }

  async timeBasedChart<Data = unknown>(chartName: string): Promise<Data> {
    return this.dashboardChart(chartName);
  }

  private dashboardChart<Data = unknown>(chartName: string): Promise<Data> {
    if (!this.httpRequester) {
      throw new Error(
        'HttpRequester is not initialized. Please ensure it is set before calling chart methods.',
      );
    }

    return this.httpRequester.query<Data>({
      method: 'get',
      path: `/forest/_charts/${chartName}`,
    });
  }
}
