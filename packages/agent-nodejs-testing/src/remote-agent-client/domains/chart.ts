import type HttpRequester from '../http-requester';

import {
  DistributionChart,
  LeaderboardChart,
  ObjectiveChart,
  PercentageChart,
  TimeBasedChart,
  ValueChart,
} from '@forestadmin/datasource-toolkit';

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

  async objectiveChart(chartName: string): Promise<ObjectiveChart> {
    return this.dashboardChart(chartName);
  }

  async leaderboardChart(chartName: string): Promise<LeaderboardChart> {
    return this.dashboardChart(chartName);
  }

  async timeBasedChart(chartName: string): Promise<TimeBasedChart> {
    return this.dashboardChart(chartName);
  }

  private async dashboardChart<Type>(chartName: string): Promise<Type> {
    if (!this.httpRequester) {
      throw new Error(
        'HttpRequester is not initialized. Please ensure it is set before calling chart methods.',
      );
    }

    const result = await this.httpRequester.query<{ value: Type }>({
      method: 'post',
      path: `/forest/_charts/${chartName}`,
    });

    return result.value;
  }
}
