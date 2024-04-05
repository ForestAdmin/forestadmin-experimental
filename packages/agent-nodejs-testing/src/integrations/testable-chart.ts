import type { HttpRequester } from './http-requester';

import { DistributionChart, PercentageChart, ValueChart } from '@forestadmin/datasource-toolkit';

export default abstract class TestableChart {
  protected readonly httpRequester: HttpRequester;

  protected constructor({ httpRequester }: { httpRequester: HttpRequester }) {
    this.httpRequester = httpRequester;
  }

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
    return this.httpRequester.query<Data>({
      method: 'get',
      path: `/forest/_charts/${chartName}`,
    });
  }
}
