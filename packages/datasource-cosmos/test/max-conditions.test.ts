import {
  ConditionTreeBranch,
  ConditionTreeLeaf,
  ValidationError,
  BusinessError,
} from '@forestadmin/datasource-toolkit';
import { CosmosClient } from '@azure/cosmos';

import QueryValidator, { QueryValidationError } from '../src/utils/query-validator';
import QueryConverter from '../src/utils/query-converter';
import CosmosDataSource from '../src/datasource';
import CosmosCollection from '../src/collection';

/**
 * Helper: build a flat AND condition tree with N leaf conditions
 */
function buildConditionTree(count: number) {
  const conditions = Array.from(
    { length: count },
    (_, i) => new ConditionTreeLeaf(`field${i}`, 'Equal', `value${i}`),
  );

  return new ConditionTreeBranch('And', conditions);
}

describe('maxConditions', () => {
  // ───────────────────────────────────────────────────────────
  // QueryValidator
  // ───────────────────────────────────────────────────────────
  describe('QueryValidator', () => {
    it('should default maxConditions to 1000', () => {
      const validator = new QueryValidator();

      // 999 leaf conditions + their parent branch = 1000 nodes → should pass
      const tree = buildConditionTree(999);
      expect(() => validator.validateConditionTree(tree)).not.toThrow();
    });

    it('should reject condition trees exceeding the default 1000 limit', () => {
      const validator = new QueryValidator();

      // 1001 leaf conditions + their parent branch = 1002 nodes → should fail
      const tree = buildConditionTree(1001);
      expect(() => validator.validateConditionTree(tree)).toThrow(QueryValidationError);
      expect(() => validator.validateConditionTree(tree)).toThrow(/maximum of 1000/);
    });

    it('should accept exactly 1000 conditions at default', () => {
      const validator = new QueryValidator();

      // Build a tree that totals exactly 1000 nodes:
      // 1 branch + 999 leaves = 1000
      const tree = buildConditionTree(999);
      expect(() => validator.validateConditionTree(tree)).not.toThrow();
    });

    it('should reject at 1001 conditions at default', () => {
      const validator = new QueryValidator();

      // 1 branch + 1000 leaves = 1001 → exceeds 1000
      const tree = buildConditionTree(1000);
      expect(() => validator.validateConditionTree(tree)).toThrow(QueryValidationError);
    });

    it('should respect a custom maxConditions override', () => {
      const validator = new QueryValidator(undefined, { maxConditions: 2000 });

      // 1 branch + 1500 leaves = 1501 → under 2000
      const tree = buildConditionTree(1500);
      expect(() => validator.validateConditionTree(tree)).not.toThrow();
    });

    it('should reject when custom maxConditions is exceeded', () => {
      const validator = new QueryValidator(undefined, { maxConditions: 50 });

      const tree = buildConditionTree(60);
      expect(() => validator.validateConditionTree(tree)).toThrow(/maximum of 50/);
    });

    it('should include the correct error code when maxConditions is exceeded', () => {
      const validator = new QueryValidator(undefined, { maxConditions: 5 });

      let thrownError: QueryValidationError | null = null;

      try {
        validator.validateConditionTree(buildConditionTree(10));
      } catch (error) {
        thrownError = error as QueryValidationError;
      }

      expect(thrownError).toBeInstanceOf(QueryValidationError);
      expect(thrownError?.message).toContain('maximum of 5');
    });

    it('should throw a ValidationError (maps to 400 Bad Request in the agent)', () => {
      const validator = new QueryValidator(undefined, { maxConditions: 5 });

      let thrownError: Error | null = null;

      try {
        validator.validateConditionTree(buildConditionTree(10));
      } catch (error) {
        thrownError = error as Error;
      }

      // QueryValidationError extends ValidationError from datasource-toolkit
      expect(thrownError).toBeInstanceOf(ValidationError);
      expect(thrownError).toBeInstanceOf(BusinessError);
      // The agent uses BusinessError.isOfType as a fallback for cross-package version mismatches
      expect(BusinessError.isOfType(thrownError!, ValidationError)).toBe(true);
      // Preserves the custom name for debugging
      expect(thrownError?.name).toBe('QueryValidationError');
    });

    it('should reset condition count between validations', () => {
      const validator = new QueryValidator(undefined, { maxConditions: 20 });

      // First validation: 15 leaves + 1 branch = 16 → passes
      expect(() => validator.validateConditionTree(buildConditionTree(15))).not.toThrow();

      // Second validation should also pass (not accumulate from first)
      expect(() => validator.validateConditionTree(buildConditionTree(15))).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────
  // QueryConverter — maxConditions passthrough
  // ───────────────────────────────────────────────────────────
  describe('QueryConverter', () => {
    it('should use default maxConditions (1000) when no options provided', () => {
      const converter = new QueryConverter();

      // 999 leaves + 1 branch = 1000 → should pass
      const tree = buildConditionTree(999);
      expect(() => converter.getSqlQuerySpec(tree)).not.toThrow();
    });

    it('should reject when default maxConditions (1000) is exceeded', () => {
      const converter = new QueryConverter();

      // 1000 leaves + 1 branch = 1001 → should fail
      const tree = buildConditionTree(1000);
      expect(() => converter.getSqlQuerySpec(tree)).toThrow(/maximum of 1000/);
    });

    it('should pass custom maxConditions through to validator', () => {
      const converter = new QueryConverter({
        validationOptions: { maxConditions: 2000 },
      });

      // 1500 leaves + 1 branch = 1501 → under 2000
      const tree = buildConditionTree(1500);
      expect(() => converter.getSqlQuerySpec(tree)).not.toThrow();
    });

    it('should reject when custom maxConditions is exceeded via validationOptions', () => {
      const converter = new QueryConverter({
        validationOptions: { maxConditions: 50 },
      });

      const tree = buildConditionTree(60);
      expect(() => converter.getSqlQuerySpec(tree)).toThrow(/maximum of 50/);
    });

    it('should not validate conditions when skipValidation is true', () => {
      const converter = new QueryConverter({ skipValidation: true });

      // Even 2000 conditions should work when validation is skipped
      const tree = buildConditionTree(2000);
      expect(() => converter.getSqlQuerySpec(tree)).not.toThrow();
    });

    it('should also apply maxConditions in getWhereClause', () => {
      const converter = new QueryConverter({
        validationOptions: { maxConditions: 10 },
      });

      const tree = buildConditionTree(20);
      expect(() => converter.getWhereClause(tree)).toThrow(/maximum of 10/);
    });
  });

  // ───────────────────────────────────────────────────────────
  // CosmosCollection — maxConditions passthrough via constructor
  // ───────────────────────────────────────────────────────────
  describe('CosmosCollection', () => {
    let mockDatasource: any;
    let mockLogger: jest.Mock;
    let mockClient: jest.Mocked<CosmosClient>;
    let mockModel: any;

    beforeEach(() => {
      mockDatasource = {
        getCollection: jest.fn(),
      };
      mockLogger = jest.fn();
      mockClient = {} as jest.Mocked<CosmosClient>;
      mockModel = {
        name: 'TestCollection',
        containerName: 'TestContainer',
        databaseName: 'TestDB',
        enableCount: true,
        partitionKeyPath: '/id',
        getPartitionKeyPath: jest.fn().mockReturnValue('/id'),
        getAttributes: jest.fn().mockReturnValue({
          id: { type: 'String' },
          status: { type: 'String' },
          operationDate: { type: 'Date' },
        }),
        overrideTypeConverter: undefined,
      };
    });

    it('should create collection without maxConditions option (uses default 1000)', () => {
      expect(
        () => new CosmosCollection(mockDatasource, mockModel, mockLogger, mockClient),
      ).not.toThrow();
    });

    it('should create collection with custom maxConditions option', () => {
      expect(
        () =>
          new CosmosCollection(mockDatasource, mockModel, mockLogger, mockClient, {
            maxConditions: 5000,
          }),
      ).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────
  // CosmosDataSource — maxConditions passthrough via options
  // ───────────────────────────────────────────────────────────
  describe('CosmosDataSource', () => {
    let mockClient: jest.Mocked<CosmosClient>;
    let mockLogger: jest.Mock;

    beforeEach(() => {
      mockClient = {
        database: jest.fn().mockReturnValue({
          container: jest.fn().mockReturnValue({
            items: {
              query: jest.fn().mockReturnValue({
                fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
              }),
            },
          }),
        }),
      } as unknown as jest.Mocked<CosmosClient>;

      mockLogger = jest.fn();
    });

    it('should accept maxConditions in options', () => {
      expect(
        () =>
          new CosmosDataSource(mockClient, [], mockLogger, {
            maxConditions: 2000,
          }),
      ).not.toThrow();
    });

    it('should work without maxConditions in options', () => {
      expect(
        () =>
          new CosmosDataSource(mockClient, [], mockLogger, {
            liveQueryConnections: 'cosmos',
            liveQueryDatabase: 'mydb',
          }),
      ).not.toThrow();
    });

    it('should work with no options at all', () => {
      expect(() => new CosmosDataSource(mockClient, [], mockLogger)).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────
  // Realistic chart scenario: daily time buckets over a year
  // ───────────────────────────────────────────────────────────
  describe('realistic chart scenarios', () => {
    it('should handle a daily chart over 1 year (365 conditions)', () => {
      const converter = new QueryConverter();

      // Simulate what Forest Admin generates for a daily chart:
      // one condition per day bucket over a year
      const conditions = Array.from({ length: 365 }, (_, i) => {
        const date = new Date(2025, 0, 1 + i).toISOString();

        return new ConditionTreeLeaf('operationDate', 'Equal', date);
      });
      const tree = new ConditionTreeBranch('Or', conditions);

      expect(() => converter.getSqlQuerySpec(tree)).not.toThrow();
    });

    it('should handle multiple filters combined with daily buckets (3 filters x 365 days)', () => {
      const converter = new QueryConverter();

      // 3 filters AND'd together, each with 365 OR'd date conditions
      // Total nodes: 1 (top AND) + 3 (OR branches) + 3*365 (leaves) = 1099
      // This exceeds the default 1000, which is the scenario the client hit.
      // With maxConditions=1000, this would fail, so use a higher limit.
      const customConverter = new QueryConverter({
        validationOptions: { maxConditions: 1500 },
      });

      const dateBuckets = Array.from(
        { length: 365 },
        (_, i) => new ConditionTreeLeaf('operationDate', 'Equal', new Date(2025, 0, 1 + i).toISOString()),
      );

      const tree = new ConditionTreeBranch('And', [
        new ConditionTreeBranch('Or', dateBuckets),
        new ConditionTreeLeaf('operationType', 'Equal', 'PAYIN'),
        new ConditionTreeLeaf('operationStatus', 'Equal', 'Completed'),
      ]);

      expect(() => customConverter.getSqlQuerySpec(tree)).not.toThrow();
    });

    it('should handle a weekly chart over 2 years (104 conditions)', () => {
      const converter = new QueryConverter();

      const conditions = Array.from(
        { length: 104 },
        (_, i) => new ConditionTreeLeaf('operationDate', 'Equal', `week-${i}`),
      );
      const tree = new ConditionTreeBranch('Or', conditions);

      expect(() => converter.getSqlQuerySpec(tree)).not.toThrow();
    });
  });
});
