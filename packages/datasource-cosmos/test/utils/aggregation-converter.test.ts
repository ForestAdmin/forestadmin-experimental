import { Aggregation, ConditionTreeLeaf } from '@forestadmin/datasource-toolkit';

import AggregationConverter from '../../src/utils/aggregation-converter';
import { QueryValidationError, QueryValidationErrorCode } from '../../src/utils/query-validator';

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
        field: 'address->zipCode',
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
        groups: [{ field: 'address->city' }],
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
        field: 'payment->amount',
        groups: [{ field: 'shipping->method' }],
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
        groups: [{ field: 'address->city' }],
      });

      const rawResults = [
        { groupKey: 'New York', aggregateValue: 15 },
        { groupKey: 'Los Angeles', aggregateValue: 10 },
      ];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([
        { value: 15, group: { 'address->city': 'New York' } },
        { value: 10, group: { 'address->city': 'Los Angeles' } },
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

  describe('field validation (SQL injection prevention)', () => {
    describe('aggregation target field validation', () => {
      it('should reject field names with SQL injection characters', () => {
        const aggregation = new Aggregation({
          operation: 'Sum',
          field: 'amount; DROP TABLE users--',
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should reject field names with SQL keywords', () => {
        const aggregation = new Aggregation({
          operation: 'Count',
          field: 'SELECT * FROM c',
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should reject field names with quotes', () => {
        const aggregation = new Aggregation({
          operation: 'Avg',
          field: "price' OR '1'='1",
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should reject field names with SQL comment syntax', () => {
        const aggregation = new Aggregation({
          operation: 'Sum',
          field: 'amount--comment',
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should reject field names with block comments', () => {
        const aggregation = new Aggregation({
          operation: 'Max',
          field: 'amount/*comment*/',
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should accept valid field names', () => {
        const aggregation = new Aggregation({
          operation: 'Sum',
          field: 'validField_123',
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).not.toThrow();
      });

      it('should accept valid nested field names with arrow notation', () => {
        const aggregation = new Aggregation({
          operation: 'Avg',
          field: 'address->zipCode',
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).not.toThrow();
      });

      it('should accept valid deeply nested field names', () => {
        const aggregation = new Aggregation({
          operation: 'Sum',
          field: 'payment->details->amount',
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).not.toThrow();
      });
    });

    describe('group by field validation', () => {
      it('should reject group by field with SQL injection', () => {
        const aggregation = new Aggregation({
          operation: 'Count',
          field: null,
          groups: [{ field: 'status; DROP TABLE--' }],
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should reject group by field with SQL keywords', () => {
        const aggregation = new Aggregation({
          operation: 'Count',
          field: null,
          groups: [{ field: 'UNION SELECT * FROM' }],
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should reject group by field with quotes', () => {
        const aggregation = new Aggregation({
          operation: 'Sum',
          field: 'amount',
          groups: [{ field: "category' OR '1'='1" }],
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
          QueryValidationError,
        );
      });

      it('should accept valid group by field names', () => {
        const aggregation = new Aggregation({
          operation: 'Count',
          field: null,
          groups: [{ field: 'status' }],
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).not.toThrow();
      });

      it('should accept valid nested group by field names', () => {
        const aggregation = new Aggregation({
          operation: 'Count',
          field: null,
          groups: [{ field: 'address->city' }],
        });

        expect(() => AggregationConverter.buildAggregationQuery(aggregation)).not.toThrow();
      });
    });

    describe('buildSimpleAggregationQuery validation', () => {
      it('should reject invalid field in simple aggregation', () => {
        expect(() =>
          AggregationConverter.buildSimpleAggregationQuery('Sum', 'amount; DROP--', null),
        ).toThrow(QueryValidationError);
      });

      it('should reject invalid groupByField in simple aggregation', () => {
        expect(() =>
          AggregationConverter.buildSimpleAggregationQuery('Count', null, "status' OR '1'='1"),
        ).toThrow(QueryValidationError);
      });

      it('should accept valid fields in simple aggregation', () => {
        expect(() =>
          AggregationConverter.buildSimpleAggregationQuery('Sum', 'validField', 'validGroupBy'),
        ).not.toThrow();
      });

      it('should accept null fields in simple aggregation (COUNT *)', () => {
        expect(() =>
          AggregationConverter.buildSimpleAggregationQuery('Count', null, null),
        ).not.toThrow();
      });
    });

    describe('error details', () => {
      it('should provide POTENTIAL_INJECTION error code for dangerous patterns', () => {
        const aggregation = new Aggregation({
          operation: 'Sum',
          field: 'amount; DROP--',
        });

        let thrownError: QueryValidationError | null = null;

        try {
          AggregationConverter.buildAggregationQuery(aggregation);
        } catch (error) {
          thrownError = error as QueryValidationError;
        }

        expect(thrownError).not.toBeNull();
        expect(thrownError).toBeInstanceOf(QueryValidationError);
        expect(thrownError?.code).toBe(QueryValidationErrorCode.POTENTIAL_INJECTION);
      });

      it('should provide INVALID_FIELD_NAME error code for invalid characters', () => {
        const aggregation = new Aggregation({
          operation: 'Sum',
          field: '123invalidStart',
        });

        let thrownError: QueryValidationError | null = null;

        try {
          AggregationConverter.buildAggregationQuery(aggregation);
        } catch (error) {
          thrownError = error as QueryValidationError;
        }

        expect(thrownError).not.toBeNull();
        expect(thrownError).toBeInstanceOf(QueryValidationError);
        expect(thrownError?.code).toBe(QueryValidationErrorCode.INVALID_FIELD_NAME);
      });
    });
  });
});
