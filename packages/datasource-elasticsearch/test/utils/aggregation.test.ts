import { Aggregation, Filter } from '@forestadmin/datasource-toolkit';

import AggregationUtils from '../../src/utils/aggregation-converter';

describe('Utils > Aggregation', () => {
  describe('aggs', () => {
    it('should return aggregations', () => {
      const aggregation = new Aggregation({ operation: 'Sum', field: 'price' });
      const filter = new Filter({});

      expect(AggregationUtils.aggs(aggregation, filter)).toStrictEqual({
        metricsAggregations: { sum: { field: 'price' } },
      });
    });

    // TODO define all aggregations
  });
});
