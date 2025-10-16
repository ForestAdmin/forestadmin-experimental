import { Aggregation, ConditionTreeLeaf } from '@forestadmin/datasource-toolkit';

import AggregationConverter from '../../src/utils/aggregation-converter';

describe('AggregationConverter', () => {
  describe('buildAggregationQuery', () => {
    it('should build a simple count query without grouping', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      expect(result.query.trim()).toBe('SELECT COUNT(1) as aggregateValue FROM c');
      expect(result.parameters).toEqual([]);
    });

    it('should build a count query with a field', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: 'email',
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      expect(result.query.trim()).toBe('SELECT COUNT(c.email) as aggregateValue FROM c');
      expect(result.parameters).toEqual([]);
    });

    it('should build a sum query', () => {
      const aggregation = new Aggregation({
        operation: 'Sum',
        field: 'points',
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      expect(result.query.trim()).toBe('SELECT SUM(c.points) as aggregateValue FROM c');
      expect(result.parameters).toEqual([]);
    });

    it('should build a count query with WHERE condition', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
      });

      const conditionTree = new ConditionTreeLeaf('status', 'Equal', 'active');

      const result = AggregationConverter.buildAggregationQuery(aggregation, conditionTree);

      expect(result.query).toContain('SELECT COUNT(1) as aggregateValue FROM c WHERE');
      expect(result.query).toContain('c.status = @param0');
      expect(result.parameters).toEqual([{ name: '@param0', value: 'active' }]);
    });

    it('should build a grouped count query', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
        groups: [{ field: 'status' }],
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      expect(result.query).toContain('SELECT c.status as groupKey, COUNT(1) as aggregateValue');
      expect(result.query).toContain('FROM c');
      expect(result.query).toContain('GROUP BY c.status');
      expect(result.query).toContain('ORDER BY c.status');
    });

    it('should build aggregation with nested field', () => {
      const aggregation = new Aggregation({
        operation: 'Sum',
        field: 'address.zipCode',
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      // Should generate c.address.zipCode to navigate nested structure
      expect(result.query.trim()).toBe('SELECT SUM(c.address.zipCode) as aggregateValue FROM c');
      expect(result.parameters).toEqual([]);
    });

    it('should build grouped aggregation with nested field', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
        groups: [{ field: 'address.city' }],
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      // Should generate c.address.city to navigate nested structure
      expect(result.query).toContain(
        'SELECT c.address.city as groupKey, COUNT(1) as aggregateValue',
      );
      expect(result.query).toContain('GROUP BY c.address.city');
      expect(result.query).toContain('ORDER BY c.address.city');
    });

    it('should build aggregation on nested field with grouping by another nested field', () => {
      const aggregation = new Aggregation({
        operation: 'Avg',
        field: 'payment.amount',
        groups: [{ field: 'shipping.method' }],
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      expect(result.query).toContain(
        'SELECT c.shipping.method as groupKey, AVG(c.payment.amount) as aggregateValue',
      );
      expect(result.query).toContain('GROUP BY c.shipping.method');
    });
  });

  describe('processAggregationResults', () => {
    it('should process simple aggregation results', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
      });

      const rawResults = [{ aggregateValue: 42 }];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([{ value: 42, group: {} }]);
    });

    it('should process grouped aggregation results', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
        groups: [{ field: 'status' }],
      });

      const rawResults = [
        { groupKey: 'active', aggregateValue: 10 },
        { groupKey: 'inactive', aggregateValue: 5 },
      ];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([
        { value: 10, group: { status: 'active' } },
        { value: 5, group: { status: 'inactive' } },
      ]);
    });

    it('should handle empty results', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
      });

      const rawResults = [];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([{ value: 0, group: {} }]);
    });

    it('should process nested field grouping results', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
        groups: [{ field: 'address.city' }],
      });

      const rawResults = [
        { groupKey: 'New York', aggregateValue: 15 },
        { groupKey: 'Los Angeles', aggregateValue: 10 },
      ];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([
        { value: 15, group: { 'address.city': 'New York' } },
        { value: 10, group: { 'address.city': 'Los Angeles' } },
      ]);
    });

    it('should fallback to "value" for backward compatibility', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
      });

      // Old format with "value" instead of "aggregateValue"
      const rawResults = [{ value: 42 }];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([{ value: 42, group: {} }]);
    });
  });
});
