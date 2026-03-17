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
    });

    it('should build aggregation with nested field', () => {
      const aggregation = new Aggregation({
        operation: 'Sum',
        field: 'address->zipCode',
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      // Should use bracket notation for nested fields to avoid reserved keyword issues
      expect(result.query.trim()).toBe('SELECT SUM(c.address["zipCode"]) as aggregateValue FROM c');
      expect(result.parameters).toEqual([]);
    });

    it('should build grouped aggregation with nested field', () => {
      const aggregation = new Aggregation({
        operation: 'Count',
        field: null,
        groups: [{ field: 'address->city' }],
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      // Should use bracket notation for nested fields to avoid reserved keyword issues
      expect(result.query).toContain(
        'SELECT c.address["city"] as groupKey, COUNT(1) as aggregateValue',
      );
      expect(result.query).toContain('GROUP BY c.address["city"]');
    });

    it('should build aggregation on nested field with grouping by another nested field', () => {
      const aggregation = new Aggregation({
        operation: 'Avg',
        field: 'payment->amount',
        groups: [{ field: 'shipping->method' }],
      });

      const result = AggregationConverter.buildAggregationQuery(aggregation);

      expect(result.query).toContain(
        'SELECT c.shipping["method"] as groupKey, AVG(c.payment["amount"]) as aggregateValue',
      );
      expect(result.query).toContain('GROUP BY c.shipping["method"]');
    });

    describe('date group operations (time-based charts)', () => {
      describe('simple LEFT() operations (Day, Month, Year)', () => {
        it.each([
          ['Day', 10],
          ['Month', 7],
          ['Year', 4],
        ])('should build a grouped query with %s date operation', (operation, expectedLength) => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'createdAt', operation: operation as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);
          const expectedExpr = `LEFT(c.createdAt, ${expectedLength})`;

          expect(result.query).toContain(`SELECT ${expectedExpr} as groupKey`);
          expect(result.query).toContain(`GROUP BY ${expectedExpr}`);
          expect(result.query).not.toContain('ORDER BY');
        });

        it('should use LEFT on nested date fields', () => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'metadata->timestamp', operation: 'Year' as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);

          expect(result.query).toContain('LEFT(c.metadata["timestamp"], 4)');
          expect(result.query).toContain('GROUP BY LEFT(c.metadata["timestamp"], 4)');
        });

        it('should combine date grouping with WHERE condition', () => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'createdAt', operation: 'Day' as any }],
          });

          const conditionTree = new ConditionTreeLeaf('status', 'Equal', 'active');
          const result = AggregationConverter.buildAggregationQuery(aggregation, conditionTree);

          expect(result.query).toContain('SELECT LEFT(c.createdAt, 10) as groupKey');
          expect(result.query).toContain('WHERE');
          expect(result.query).toContain('c.status = @param0');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'active' }]);
        });

        it('should combine date grouping with aggregation on a field', () => {
          const aggregation = new Aggregation({
            operation: 'Sum',
            field: 'amount->value',
            groups: [{ field: 'operationDate', operation: 'Month' as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);

          expect(result.query).toContain('LEFT(c.operationDate, 7) as groupKey');
          expect(result.query).toContain('SUM(c.amount["value"]) as aggregateValue');
        });
      });

      describe('Week operation (DateTimeAdd/DateTimePart)', () => {
        it('should compute Monday of the week with exact expression', () => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'createdAt', operation: 'Week' as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);

          // Verify the exact expression structure
          const weekExpr =
            'LEFT(DateTimeAdd("day", -1 * ' +
            '((DateTimePart("dw", c.createdAt) + 5) % 7), ' +
            'c.createdAt), 10)';
          expect(result.query).toContain(`SELECT ${weekExpr} as groupKey`);
          expect(result.query).toContain(`GROUP BY ${weekExpr}`);
        });

        it('should work with nested date fields', () => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'metadata->timestamp', operation: 'Week' as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);

          expect(result.query).toContain('DateTimePart("dw", c.metadata["timestamp"])');
          expect(result.query).toContain('DateTimeAdd("day"');
        });

        it('should combine Week grouping with aggregation on a field', () => {
          const aggregation = new Aggregation({
            operation: 'Sum',
            field: 'amount',
            groups: [{ field: 'createdAt', operation: 'Week' as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);

          expect(result.query).toContain('SUM(c.amount) as aggregateValue');
          expect(result.query).toContain('DateTimeAdd("day"');
        });
      });

      describe('Quarter operation (CONCAT with FLOOR)', () => {
        it('should compute first day of the quarter with exact expression', () => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'createdAt', operation: 'Quarter' as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);

          // Verify the expression builds "YYYY-MM-01" where MM is the quarter start month
          expect(result.query).toContain('CONCAT(LEFT(c.createdAt, 4)');
          expect(result.query).toContain(
            'FLOOR((DateTimePart("mm", c.createdAt) - 1) / 3) * 3 + 1',
          );
          expect(result.query).toContain('"-01")');
          expect(result.query).toContain('as groupKey');
        });

        it('should work with nested date fields', () => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'metadata->timestamp', operation: 'Quarter' as any }],
          });

          const result = AggregationConverter.buildAggregationQuery(aggregation);

          expect(result.query).toContain('LEFT(c.metadata["timestamp"], 4)');
          expect(result.query).toContain('DateTimePart("mm", c.metadata["timestamp"])');
        });

        it('should combine Quarter grouping with WHERE and aggregation', () => {
          const aggregation = new Aggregation({
            operation: 'Avg',
            field: 'score',
            groups: [{ field: 'createdAt', operation: 'Quarter' as any }],
          });

          const conditionTree = new ConditionTreeLeaf('active', 'Equal', true);
          const result = AggregationConverter.buildAggregationQuery(aggregation, conditionTree);

          expect(result.query).toContain('AVG(c.score) as aggregateValue');
          expect(result.query).toContain('CONCAT(LEFT(c.createdAt, 4)');
          expect(result.query).toContain('WHERE');
          expect(result.parameters).toEqual([{ name: '@param0', value: true }]);
        });
      });

      describe('unsupported operations', () => {
        it('should throw for unknown date operations', () => {
          const aggregation = new Aggregation({
            operation: 'Count',
            field: null,
            groups: [{ field: 'createdAt', operation: 'Hour' as any }],
          });

          expect(() => AggregationConverter.buildAggregationQuery(aggregation)).toThrow(
            'Unsupported date operation: "Hour"',
          );
        });
      });
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

    it('should return 0 when aggregateValue is undefined (mixed types in SUM)', () => {
      const aggregation = new Aggregation({
        operation: 'Sum',
        field: 'amount',
      });

      // Cosmos DB returns undefined when SUM encounters non-numeric types
      const rawResults = [{ aggregateValue: undefined }];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([{ value: 0, group: {} }]);
    });

    it('should return 0 when nested object does not exist on any document', () => {
      const aggregation = new Aggregation({
        operation: 'Sum',
        field: 'amount->value',
      });

      // Cosmos DB SUM returns undefined when all values are undefined
      // (e.g. nested object "amount" missing on every document)
      const rawResults = [{ aggregateValue: undefined }];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([{ value: 0, group: {} }]);
    });

    it('should return the partial sum when nested object exists on some documents', () => {
      const aggregation = new Aggregation({
        operation: 'Sum',
        field: 'amount->value',
      });

      // Cosmos DB SUM skips undefined values and sums only the numeric ones
      // So if 3 docs have amount.value=10 and 2 docs don't have "amount" at all,
      // Cosmos returns { aggregateValue: 30 }
      const rawResults = [{ aggregateValue: 30 }];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([{ value: 30, group: {} }]);
    });

    it('should return 0 when aggregateValue is null', () => {
      const aggregation = new Aggregation({
        operation: 'Avg',
        field: 'score',
      });

      const rawResults = [{ aggregateValue: null }];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([{ value: 0, group: {} }]);
    });

    it('should return 0 for undefined aggregateValue in grouped results', () => {
      const aggregation = new Aggregation({
        operation: 'Sum',
        field: 'amount',
        groups: [{ field: 'status' }],
      });

      const rawResults = [
        { groupKey: 'active', aggregateValue: 10 },
        { groupKey: 'mixed', aggregateValue: undefined },
      ];

      const result = AggregationConverter.processAggregationResults(rawResults, aggregation);

      expect(result).toEqual([
        { value: 10, group: { status: 'active' } },
        { value: 0, group: { status: 'mixed' } },
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
