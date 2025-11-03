/**
 * ArrayCollection - Performance and Scalability Tests
 *
 * This test suite validates the key scalability features:
 * 1. Maximum result limit enforcement (MAX_UNFILTERED_RESULTS = 1000)
 * 2. Performance warning logging for potentially slow queries
 * 3. Proper handling of large datasets
 *
 * Focus is on verifying BEHAVIORS, not implementation details.
 */
import { CosmosClient } from '@azure/cosmos';
import {
  Caller,
  ConditionTreeLeaf,
  PaginatedFilter,
  Projection,
} from '@forestadmin/datasource-toolkit';

import ArrayCollection from '../src/array-collection';
import CosmosCollection from '../src/collection';
import CosmosDataSource from '../src/datasource';
import Introspector from '../src/introspection/introspector';

describe('ArrayCollection - Performance and Scalability', () => {
  let datasource: CosmosDataSource;
  let parentCollection: CosmosCollection;
  let arrayCollection: ArrayCollection;
  let mockClient: jest.Mocked<CosmosClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContainer: any;
  let mockLogger: jest.Mock;
  const caller = {} as Caller;

  beforeEach(async () => {
    mockLogger = jest.fn();

    // Mock CosmosClient
    mockClient = {
      database: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Mock container
    mockContainer = {
      items: {
        query: jest.fn(),
        create: jest.fn(),
      },
      item: jest.fn(),
      read: jest.fn().mockResolvedValue({
        resource: {
          id: 'orders',
          partitionKey: { paths: ['/id'] },
        },
      }),
    };

    const mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockClient.database.mockReturnValue(mockDatabase as any);

    // Setup sample parent documents
    const parentDocuments = [
      {
        id: 'order-123',
        items: [
          { sku: 'PROD-001', quantity: 2 },
          { sku: 'PROD-002', quantity: 1 },
        ],
      },
    ];

    mockContainer.items.query.mockReturnValue({
      fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
    });

    // Create parent collection using Introspector
    const parentModel = await Introspector.introspectContainer(mockClient, 'test-db', 'orders');

    datasource = new CosmosDataSource(mockClient, [parentModel], mockLogger);
    parentCollection = datasource.getCollection('orders') as CosmosCollection;

    // Create array collection with optimizations enabled
    arrayCollection = new ArrayCollection(
      datasource,
      parentCollection,
      'order_items',
      'items',
      {
        actions: {},
        charts: [],
        countable: true,
        fields: {
          id: {
            columnType: 'String',
            filterOperators: new Set(['Equal', 'In']),
            isPrimaryKey: true,
            isReadOnly: true,
            isSortable: true,
            type: 'Column',
          },
          parentsId: {
            columnType: 'String',
            filterOperators: new Set(['Equal', 'In']),
            isPrimaryKey: false,
            isReadOnly: true,
            isSortable: true,
            type: 'Column',
          },
          sku: {
            columnType: 'String',
            filterOperators: new Set(['Equal', 'In']),
            isPrimaryKey: false,
            isReadOnly: false,
            isSortable: true,
            type: 'Column',
          },
          quantity: {
            columnType: 'Number',
            filterOperators: new Set(['Equal', 'GreaterThan', 'LessThan']),
            isPrimaryKey: false,
            isReadOnly: false,
            isSortable: true,
            type: 'Column',
          },
        },
        searchable: false,
        segments: [],
      },
      mockLogger,
      mockClient,
      [],
      true, // enableOptimizations = true
    );
  });

  describe('1. Maximum Result Limit Enforcement', () => {
    it('should throw error when result set exceeds 1000 items', async () => {
      // Mock 5 parent documents with 250 items each = 1250 total items
      const parentDocs = Array.from({ length: 5 }, (_unused, i) => ({
        id: `order-${i}`,
        items: Array.from({ length: 250 }, (_unusedInner, j) => ({
          sku: `PROD-${i}-${j}`,
          quantity: j + 1,
        })),
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      // Query without filters or pagination (should hit limit)
      const filter = new PaginatedFilter({});

      await expect(arrayCollection.list(caller, filter, new Projection('sku'))).rejects.toThrow(
        /Result set too large \(1250 items\)/,
      );

      // Should log error
      expect(mockLogger).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('exceeding maximum of 1000'),
      );
    });

    it('should NOT throw error when result set is under 1000 items', async () => {
      // Mock 4 parent documents with 200 items each = 800 total items
      const parentDocs = Array.from({ length: 4 }, (_unused, i) => ({
        id: `order-${i}`,
        items: Array.from({ length: 200 }, (_unusedJ, j) => ({
          sku: `PROD-${i}-${j}`,
          quantity: j + 1,
        })),
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      // Query without filters (but under limit)
      const filter = new PaginatedFilter({});

      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should succeed
      expect(results).toHaveLength(800);

      // Should NOT throw error or log error
      expect(mockLogger).not.toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('exceeding maximum'),
      );
    });

    it('should respect pagination and not throw error even with many items', async () => {
      // Mock many parent documents (would exceed limit without pagination)
      const parentDocs = Array.from({ length: 10 }, (_unusedI, i) => ({
        id: `order-${i}`,
        items: Array.from({ length: 200 }, (_unusedJ, j) => ({
          sku: `PROD-${i}-${j}`,
          quantity: j + 1,
        })),
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      // Query with pagination (limit 50)
      const filter = new PaginatedFilter({
        page: { limit: 50, skip: 0, apply: (records: unknown[]) => records },
      });

      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should apply pagination and succeed
      expect(results).toHaveLength(50);

      // Should NOT throw error
      expect(mockLogger).not.toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('exceeding maximum'),
      );
    });

    it('should allow exactly 1000 items (boundary test)', async () => {
      // Mock exactly 1000 items
      const parentDocs = Array.from({ length: 10 }, (_unusedI, i) => ({
        id: `order-${i}`,
        items: Array.from({ length: 100 }, (_, j) => ({
          sku: `PROD-${i}-${j}`,
          quantity: j + 1,
        })),
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({});

      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should succeed (exactly 1000 is OK)
      expect(results).toHaveLength(1000);
    });

    it('should reject 1001 items (boundary + 1 test)', async () => {
      // Mock 1001 items (just over limit)
      const parentDocs = [
        {
          id: 'order-0',
          items: Array.from({ length: 1001 }, (_, j) => ({
            sku: `PROD-${j}`,
            quantity: j + 1,
          })),
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({});

      await expect(arrayCollection.list(caller, filter, new Projection('sku'))).rejects.toThrow(
        /Result set too large \(1001 items\)/,
      );
    });
  });

  describe('2. Performance Warning Logging', () => {
    it('should warn when querying without any filters', async () => {
      const parentDocs = Array.from({ length: 3 }, (_, i) => ({
        id: `order-${i}`,
        items: [{ sku: `PROD-${i}-001`, quantity: 2 }],
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({});

      await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should log performance warning
      expect(mockLogger).toHaveBeenCalledWith(
        'Warn',
        expect.stringContaining('without specific filters may be slow'),
      );
    });

    it('should NOT warn when filtering by composite ID', async () => {
      const parentDoc = {
        id: 'order-123',
        items: [{ sku: 'PROD-001', quantity: 2 }],
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [parentDoc] }),
      });

      const filter = new PaginatedFilter({
        conditionTree: new ConditionTreeLeaf('id', 'Equal', 'order-123:0'),
      });

      await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should NOT log warning (has composite ID filter - very specific query)
      expect(mockLogger).not.toHaveBeenCalledWith('Warn', expect.stringContaining('may be slow'));
    });

    it('should NOT warn when using pagination', async () => {
      const parentDocs = Array.from({ length: 5 }, (_, i) => ({
        id: `order-${i}`,
        items: [{ sku: `PROD-${i}`, quantity: 1 }],
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({
        page: { limit: 10, skip: 0, apply: (records: unknown[]) => records },
      });

      await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should NOT log warning (has pagination)
      expect(mockLogger).not.toHaveBeenCalledWith(
        'Warn',
        expect.stringContaining('without specific filters may be slow'),
      );
    });

    it('should warn when requesting very large result set', async () => {
      const parentDocs = [{ id: 'order-1', items: [{ sku: 'PROD-001', quantity: 1 }] }];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({
        page: { limit: 5000, skip: 0, apply: (records: unknown[]) => records },
      });

      await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should log warning about large result set
      expect(mockLogger).toHaveBeenCalledWith(
        'Warn',
        expect.stringContaining('Requesting 5000 items'),
      );
    });

    it('should NOT warn for reasonable pagination limits', async () => {
      const parentDocs = [{ id: 'order-1', items: [{ sku: 'PROD-001', quantity: 1 }] }];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({
        page: { limit: 100, skip: 0, apply: (records: unknown[]) => records },
      });

      await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should NOT warn (reasonable limit)
      expect(mockLogger).not.toHaveBeenCalledWith('Warn', expect.stringContaining('Requesting'));
    });
  });

  describe('3. Large Dataset Handling', () => {
    it('should handle 100 parents with 10 items each efficiently', async () => {
      // Mock 100 parents with 10 items each = 1000 items total
      const parentDocs = Array.from({ length: 100 }, (_unusedI, i) => ({
        id: `order-${i}`,
        items: Array.from({ length: 10 }, (_, j) => ({
          sku: `PROD-${i}-${j}`,
          quantity: j + 1,
        })),
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({
        page: { limit: 50, skip: 0, apply: (records: unknown[]) => records },
      });

      const startTime = Date.now();
      const results = await arrayCollection.list(caller, filter, new Projection('sku'));
      const duration = Date.now() - startTime;

      // Should complete quickly (< 1 second for test)
      expect(duration).toBeLessThan(1000);
      expect(results).toHaveLength(50);
    });

    it('should handle queries with specific parent filter efficiently', async () => {
      // Mock 50 parents
      const parentDocs = Array.from({ length: 50 }, (_, i) => ({
        id: `order-${i}`,
        items: [{ sku: `PROD-${i}`, quantity: 1 }],
      }));

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({
        conditionTree: new ConditionTreeLeaf('parentsId', 'Equal', 'order-25'),
        page: { limit: 20, skip: 0, apply: (records: unknown[]) => records },
      });

      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      // Should return paginated results
      expect(results.length).toBeLessThanOrEqual(20);
    });
  });

  describe('4. Edge Cases', () => {
    it('should handle empty result set gracefully', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      });

      const filter = new PaginatedFilter({
        conditionTree: new ConditionTreeLeaf('parentsId', 'Equal', 'nonexistent'),
      });

      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      expect(results).toHaveLength(0);
      expect(mockLogger).not.toHaveBeenCalledWith('Error', expect.anything());
    });

    it('should handle parent with empty array', async () => {
      const parentDoc = {
        id: 'order-123',
        items: [],
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [parentDoc] }),
      });

      const filter = new PaginatedFilter({
        conditionTree: new ConditionTreeLeaf('parentsId', 'Equal', 'order-123'),
      });

      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      expect(results).toHaveLength(0);
    });

    it('should handle parent with null array', async () => {
      const parentDoc = {
        id: 'order-123',
        items: null,
      };

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [parentDoc] }),
      });

      const filter = new PaginatedFilter({
        conditionTree: new ConditionTreeLeaf('parentsId', 'Equal', 'order-123'),
      });

      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      expect(results).toHaveLength(0);
    });
  });

  describe('5. Optimization Flag', () => {
    it('should work with optimizations enabled', async () => {
      // arrayCollection already has optimizations enabled
      const parentDocs = [
        {
          id: 'order-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({
        page: { limit: 10, skip: 0, apply: (records: unknown[]) => records },
      });

      // Should not throw error
      const results = await arrayCollection.list(caller, filter, new Projection('sku'));

      // Just verify it completes successfully
      expect(Array.isArray(results)).toBe(true);
    });

    it('should work with optimizations disabled', async () => {
      // Create new collection with optimizations disabled
      const arrayCollectionNoOpt = new ArrayCollection(
        datasource,
        parentCollection,
        'order_items_no_opt',
        'items',
        arrayCollection.schema,
        mockLogger,
        mockClient,
        [],
        false, // enableOptimizations = false
      );

      const parentDocs = [
        {
          id: 'order-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocs }),
      });

      const filter = new PaginatedFilter({
        page: { limit: 10, skip: 0, apply: (records: unknown[]) => records },
      });

      // Should not throw error
      const results = await arrayCollectionNoOpt.list(caller, filter, new Projection('sku'));

      // Just verify it completes successfully
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
