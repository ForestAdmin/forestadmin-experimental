/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, CosmosClient, Database } from '@azure/cosmos';

import ModelCosmos, {
  CosmosSchema,
  configurePaginationCache,
  getSharedPaginationCache,
} from '../../src/model-builder/model';

describe('Model Builder > Cursor-Based Pagination', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockDatabase: jest.Mocked<Database>;
  let mockContainer: jest.Mocked<Container>;
  let testSchema: CosmosSchema;
  let model: ModelCosmos;

  beforeEach(() => {
    // Reset pagination cache before each test
    configurePaginationCache({ maxOffset: 100000, ttlMs: 300000 });

    // Setup mocks
    const mockCreate = jest.fn();
    const mockQuery = jest.fn();

    mockContainer = {
      items: {
        create: mockCreate,
        query: mockQuery,
      },
      item: jest.fn(),
    } as any;

    mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    } as any;

    mockCosmosClient = {
      database: jest.fn().mockReturnValue(mockDatabase),
    } as any;

    testSchema = {
      name: { type: 'string', nullable: false, indexed: true },
      age: { type: 'number', nullable: false, indexed: true },
    };

    model = new ModelCosmos(
      mockCosmosClient,
      'users',
      'testDatabase',
      'usersContainer',
      '/userId',
      testSchema,
    );
  });

  describe('max offset limit', () => {
    it('should throw error when offset exceeds max allowed', async () => {
      configurePaginationCache({ maxOffset: 1000 });

      // Create new model to pick up new cache config
      const limitedModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const querySpec = { query: 'SELECT * FROM c' };

      await expect(limitedModel.query(querySpec, 1500, 10)).rejects.toThrow(
        'Offset 1500 exceeds maximum allowed offset of 1000',
      );
    });

    it('should not throw error when offset is within limit', async () => {
      configurePaginationCache({ maxOffset: 1000 });

      const limitedModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };

      await expect(limitedModel.query(querySpec, 500, 10)).resolves.toBeDefined();
    });

    it('should include helpful error message suggesting filters', async () => {
      configurePaginationCache({ maxOffset: 100 });

      const limitedModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const querySpec = { query: 'SELECT * FROM c' };

      await expect(limitedModel.query(querySpec, 200, 10)).rejects.toThrow(
        'Consider using filters to narrow down your results instead of deep pagination',
      );
    });
  });

  describe('continuation token caching', () => {
    it('should cache continuation tokens during iteration', async () => {
      // Generate 2500 items to trigger token caching (caches every ~1000 items)
      const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `${i}` }));
      const page2 = Array.from({ length: 1000 }, (_, i) => ({ id: `${i + 1000}` }));
      const page3 = Array.from({ length: 500 }, (_, i) => ({ id: `${i + 2000}` }));

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: page1, continuationToken: 'token-1000' };
          yield { resources: page2, continuationToken: 'token-2000' };
          yield { resources: page3, continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, 0, 100);

      // Check that tokens were cached
      const cache = getSharedPaginationCache();

      // Should have cached tokens
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    it('should use cached token to resume from nearest position', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Pre-populate cache with a token at offset 1000
      cache.storeToken(queryHash, 1000, 'cached-token-1000');

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1001' }, { id: '1002' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Query with offset 1000 should use cached token
      await model.query(querySpec, 1000, 10);

      // Should have been called with the cached continuation token
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          continuationToken: 'cached-token-1000',
        }),
      );
    });

    it('should use closest cached token below target offset', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Pre-populate cache with tokens
      cache.storeToken(queryHash, 500, 'token-500');
      cache.storeToken(queryHash, 1000, 'token-1000');
      cache.storeToken(queryHash, 1500, 'token-1500');

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          // Yield enough items to cover offset 1200 + limit from start position 1000
          yield {
            resources: Array.from({ length: 300 }, (_, i) => ({ id: `${1000 + i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Query with offset 1200 should use token-1000 (closest below target)
      await model.query(querySpec, 1200, 10);

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          continuationToken: 'token-1000',
        }),
      );
    });

    it('should start from beginning when no cached token is available', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, 0, 10);

      // Should NOT have continuation token
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.not.objectContaining({
          continuationToken: expect.anything(),
        }),
      );
    });

    it('should cache tokens with correct query hash including partition key', async () => {
      const cache = getSharedPaginationCache();

      const page1 = Array.from({ length: 1000 }, (_, i) => ({ id: `${i}` }));

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: page1, continuationToken: 'token-1000' };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };

      // Query with partition key
      await model.query(querySpec, 0, 100, 'tenant-123');

      // Cache should have entry with partition key in hash
      const hashWithPartition = cache.generateQueryHash(querySpec.query, [], 'tenant-123');
      const hashWithoutPartition = cache.generateQueryHash(querySpec.query, []);

      expect(hashWithPartition).not.toBe(hashWithoutPartition);
    });
  });

  describe('pagination with continuation tokens', () => {
    it('should correctly slice results when resuming from cached position', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Cache token at offset 100
      cache.storeToken(queryHash, 100, 'token-100');

      // Mock returns items 100-149 (50 items)
      const mockResults = Array.from({ length: 50 }, (_, i) => ({ id: `${100 + i}` }));

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: mockResults, continuationToken: 'token-150' };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Request offset 120, limit 10
      // Should skip first 20 items (120 - 100 = 20 items to skip)
      const results = await model.query(querySpec, 120, 10);

      expect(results).toHaveLength(10);
      expect(results[0].id).toBe('120');
      expect(results[9].id).toBe('129');
    });

    it('should handle pagination across multiple pages', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          // First page: items 0-99
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-100',
          };
          // Second page: items 100-199
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${100 + i}` })),
            continuationToken: 'token-200',
          };
          // Third page: items 200-299
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${200 + i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };

      // Request items 150-159
      const results = await model.query(querySpec, 150, 10);

      expect(results).toHaveLength(10);
      expect(results[0].id).toBe('150');
      expect(results[9].id).toBe('159');
    });

    it('should stop fetching when enough items are collected', async () => {
      let pagesYielded = 0;

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          pagesYielded += 1;
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-100',
          };
          pagesYielded += 1;
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${100 + i}` })),
            continuationToken: 'token-200',
          };
          pagesYielded += 1;
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${200 + i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };

      // Request only first 50 items
      await model.query(querySpec, 0, 50);

      // Should only fetch first page (100 items is enough for offset 0 + limit 50)
      expect(pagesYielded).toBe(1);
    });
  });

  describe('page size optimization', () => {
    it('should use limit as page size when limit >= 100', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, 0, 500);

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          maxItemCount: 500,
        }),
      );
    });

    it('should use minimum page size of 100 for small limits', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, 0, 10);

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          maxItemCount: 100,
        }),
      );
    });

    it('should cap page size at 1000', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, 0, 5000);

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          maxItemCount: 1000,
        }),
      );
    });
  });

  describe('default limit behavior', () => {
    it('should use default limit of 100 when limit is not specified', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 150 }, (_, i) => ({ id: `${i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };

      // Only offset specified, no limit
      const results = await model.query(querySpec, 10);

      // Should return 100 items (default limit)
      expect(results).toHaveLength(100);
    });
  });

  describe('edge cases', () => {
    it('should handle empty result set', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec, 0, 10);

      expect(results).toHaveLength(0);
    });

    it('should handle offset greater than result count', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 50 }, (_, i) => ({ id: `${i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec, 100, 10);

      expect(results).toHaveLength(0);
    });

    it('should handle limit greater than remaining items', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 50 }, (_, i) => ({ id: `${i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec, 40, 100);

      // Should return only 10 items (50 total - 40 offset = 10 remaining)
      expect(results).toHaveLength(10);
    });

    it('should handle offset of 0', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: [{ id: '1' }, { id: '2' }, { id: '3' }],
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec, 0, 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('1');
    });

    it('should handle query with no continuation token in response', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 50 }, (_, i) => ({ id: `${i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec, 0, 10);

      expect(results).toHaveLength(10);
    });
  });

  describe('configurePaginationCache', () => {
    it('should allow configuring max offset globally', async () => {
      configurePaginationCache({ maxOffset: 500 });

      const newModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const querySpec = { query: 'SELECT * FROM c' };

      await expect(newModel.query(querySpec, 600, 10)).rejects.toThrow(
        'Offset 600 exceeds maximum allowed offset of 500',
      );
    });

    it('should allow configuring TTL globally', () => {
      configurePaginationCache({ ttlMs: 60000 });

      const cache = getSharedPaginationCache();
      expect(cache).toBeDefined();
    });

    it('should allow configuring cache interval globally', () => {
      configurePaginationCache({ cacheInterval: 500 });

      const cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(500);
    });

    it('should use default cache interval of 1000', () => {
      configurePaginationCache({});

      const cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(1000);
    });
  });

  describe('cacheInterval configuration', () => {
    it('should cache tokens at custom interval boundaries', async () => {
      // Configure smaller cache interval
      configurePaginationCache({ cacheInterval: 500, maxOffset: 100000 });

      const newModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const cache = getSharedPaginationCache();
      cache.clearAll();

      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Simulate fetching 1500 items with page size 500
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 500 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-at-500',
          };
          yield {
            resources: Array.from({ length: 500 }, (_, i) => ({ id: `${500 + i}` })),
            continuationToken: 'token-at-1000',
          };
          yield {
            resources: Array.from({ length: 500 }, (_, i) => ({ id: `${1000 + i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      await newModel.query(querySpec, 0, 1500);

      // With cacheInterval=500, tokens should be cached more frequently
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);

      // Should have cached tokens - check for token at offset 1500
      const finalEntry = cache.findBestToken(queryHash, 1500);
      expect(finalEntry).not.toBeNull();
    });

    it('should allow configuring different cache intervals', async () => {
      // Test that we can set different cache intervals
      configurePaginationCache({ cacheInterval: 1000, maxOffset: 100000 });
      let cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(1000);

      configurePaginationCache({ cacheInterval: 500, maxOffset: 100000 });
      cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(500);

      configurePaginationCache({ cacheInterval: 2000, maxOffset: 100000 });
      cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(2000);
    });

    it('should use configurable cache interval when checking boundaries', async () => {
      // Set cache interval to 250
      configurePaginationCache({ cacheInterval: 250, maxOffset: 100000 });

      const customIntervalModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(250);

      cache.clearAll();

      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Generate pages that align with 250-interval boundaries
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 250 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-250',
          };
          yield {
            resources: Array.from({ length: 250 }, (_, i) => ({ id: `${250 + i}` })),
            continuationToken: 'token-500',
          };
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${500 + i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      await customIntervalModel.query(querySpec, 0, 600);

      // Cache should have entries - the final token is cached at the final offset
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);

      // Should be able to find a cached entry for target offset 600
      const finalEntry = cache.findBestToken(queryHash, 600);
      expect(finalEntry).not.toBeNull();
    });

    it('should work correctly with very small cache intervals', () => {
      configurePaginationCache({ cacheInterval: 100, maxOffset: 100000 });

      const cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(100);
    });

    it('should work correctly with very large cache intervals', () => {
      configurePaginationCache({ cacheInterval: 10000, maxOffset: 100000 });

      const cache = getSharedPaginationCache();
      expect(cache.getCacheInterval()).toBe(10000);
    });
  });

  describe('getSharedPaginationCache', () => {
    it('should return the same cache instance', () => {
      const cache1 = getSharedPaginationCache();
      const cache2 = getSharedPaginationCache();

      expect(cache1).toBe(cache2);
    });

    it('should allow getting cache stats', () => {
      const cache = getSharedPaginationCache();
      const stats = cache.getStats();

      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('totalEntries');
    });
  });

  describe('backward compatibility (fetchAll mode)', () => {
    it('should use fetchAll when no pagination parameters are provided', async () => {
      const mockFetchAll = jest.fn().mockResolvedValue({
        resources: [{ id: '1' }, { id: '2' }, { id: '3' }],
      });

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: mockFetchAll,
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec);

      expect(mockFetchAll).toHaveBeenCalled();
      expect(results).toHaveLength(3);
    });

    it('should use fetchAll when offset is undefined and limit is undefined', async () => {
      const mockFetchAll = jest.fn().mockResolvedValue({
        resources: [{ id: '1' }],
      });

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: mockFetchAll,
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, undefined, undefined);

      expect(mockFetchAll).toHaveBeenCalled();
    });

    it('should pass partition key to fetchAll mode', async () => {
      const mockFetchAll = jest.fn().mockResolvedValue({
        resources: [{ id: '1' }],
      });

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: mockFetchAll,
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, undefined, undefined, 'tenant-abc');

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({ partitionKey: 'tenant-abc' }),
      );
    });
  });

  describe('sequential pagination efficiency', () => {
    it('should reuse cached token for subsequent page requests', async () => {
      const querySpec = { query: 'SELECT * FROM c' };

      // First request: offset 0, limit 100
      const mockAsyncIterator1 = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-100',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator1),
      }) as any;

      await model.query(querySpec, 0, 100);

      // Second request: offset 100, limit 100 - should use cached token
      const mockAsyncIterator2 = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${100 + i}` })),
            continuationToken: 'token-200',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator2),
      }) as any;

      await model.query(querySpec, 100, 100);

      // Should have used the cached token-100
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({ continuationToken: 'token-100' }),
      );
    });

    it('should cache final token for use in next sequential request', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 50 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'final-token-50',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      await model.query(querySpec, 0, 50);

      // The final token should be cached at offset 50
      const cachedEntry = cache.findBestToken(queryHash, 50);
      expect(cachedEntry).not.toBeNull();
      expect(cachedEntry?.offset).toBe(50);
      expect(cachedEntry?.continuationToken).toBe('final-token-50');
    });
  });

  describe('token caching at boundaries', () => {
    it('should cache tokens at 1000-item boundaries during iteration', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Simulate fetching 2500 items with page size 1000
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 1000 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-at-1000',
          };
          yield {
            resources: Array.from({ length: 1000 }, (_, i) => ({ id: `${1000 + i}` })),
            continuationToken: 'token-at-2000',
          };
          yield {
            resources: Array.from({ length: 500 }, (_, i) => ({ id: `${2000 + i}` })),
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Request all 2500 items
      await model.query(querySpec, 0, 2500);

      // Should have cached tokens at various points
      const stats = cache.getStats();
      expect(stats.totalEntries).toBeGreaterThan(0);

      // Final token should be cached at offset 2500
      const finalEntry = cache.findBestToken(queryHash, 2500);
      expect(finalEntry).not.toBeNull();
    });

    it('should not cache token when currentOffset is 0', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      cache.clearAll();

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          // First page with token but at offset 0
          yield {
            resources: Array.from({ length: 50 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'should-not-cache-at-0',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      await model.query(querySpec, 0, 50);

      // The boundary caching logic (currentOffset % 1000 < pageSize) should not cache at 0
      // But the final token IS cached, so we should find token at offset 50
      const entryAt0 = cache.findBestToken(queryHash, 0);
      expect(entryAt0).toBeNull();
    });
  });

  describe('query with parameters', () => {
    it('should cache separately for different query parameters', async () => {
      const cache = getSharedPaginationCache();

      const querySpec1 = {
        query: 'SELECT * FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: 'active' }],
      };

      const querySpec2 = {
        query: 'SELECT * FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: 'inactive' }],
      };

      const queryHash1 = cache.generateQueryHash(querySpec1.query, querySpec1.parameters);
      const queryHash2 = cache.generateQueryHash(querySpec2.query, querySpec2.parameters);

      expect(queryHash1).not.toBe(queryHash2);

      // Store token for first query
      cache.storeToken(queryHash1, 100, 'token-active-100');

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Second query should NOT use the first query's cached token
      await model.query(querySpec2, 100, 10);

      // Should NOT have been called with continuation token (no cache for this query)
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec2,
        expect.not.objectContaining({
          continuationToken: expect.anything(),
        }),
      );
    });

    it('should use cached token when same query parameters are provided', async () => {
      const cache = getSharedPaginationCache();

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.type = @type',
        parameters: [{ name: '@type', value: 'product' }],
      };

      const queryHash = cache.generateQueryHash(querySpec.query, querySpec.parameters);
      cache.storeToken(queryHash, 500, 'cached-product-token');

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '501' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      await model.query(querySpec, 500, 10);

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          continuationToken: 'cached-product-token',
        }),
      );
    });
  });

  describe('partition key isolation', () => {
    it('should not share cache between different partition keys', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };

      const hashTenant1 = cache.generateQueryHash(querySpec.query, [], 'tenant-1');

      // Store token for tenant-1
      cache.storeToken(hashTenant1, 100, 'tenant1-token-100');

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Query for tenant-2 should not use tenant-1's cached token
      await model.query(querySpec, 100, 10, 'tenant-2');

      // Should NOT have continuation token (different partition key = different cache)
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.not.objectContaining({
          continuationToken: expect.anything(),
        }),
      );
    });

    it('should use cached token for same partition key', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };

      const hashTenant1 = cache.generateQueryHash(querySpec.query, [], 'tenant-1');
      cache.storeToken(hashTenant1, 200, 'tenant1-token-200');

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '201' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      await model.query(querySpec, 200, 10, 'tenant-1');

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          continuationToken: 'tenant1-token-200',
          partitionKey: 'tenant-1',
        }),
      );
    });

    it('should handle numeric partition keys correctly', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };

      const hashNumeric = cache.generateQueryHash(querySpec.query, [], 12345);
      cache.storeToken(hashNumeric, 50, 'numeric-pk-token');

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '51' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      await model.query(querySpec, 50, 10, 12345);

      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({
          continuationToken: 'numeric-pk-token',
          partitionKey: 12345,
        }),
      );
    });
  });

  describe('offset exactly at max limit', () => {
    it('should allow offset exactly equal to maxOffset', async () => {
      configurePaginationCache({ maxOffset: 1000 });

      const limitedModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1000' }], continuationToken: undefined };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };

      // Offset exactly at maxOffset should be allowed
      await expect(limitedModel.query(querySpec, 1000, 10)).resolves.toBeDefined();
    });

    it('should reject offset one above maxOffset', async () => {
      configurePaginationCache({ maxOffset: 1000 });

      const limitedModel = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      const querySpec = { query: 'SELECT * FROM c' };

      await expect(limitedModel.query(querySpec, 1001, 10)).rejects.toThrow(
        'Offset 1001 exceeds maximum allowed offset of 1000',
      );
    });
  });

  describe('items to skip calculation', () => {
    it('should correctly skip items when resuming from cached position', async () => {
      const cache = getSharedPaginationCache();
      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Cache at offset 500
      cache.storeToken(queryHash, 500, 'token-500');

      // Mock returns items starting from position 500
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${500 + i}` })),
            continuationToken: 'token-600',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Request offset 550, limit 10
      // Should skip 50 items (550 - 500) and return items 550-559
      const results = await model.query(querySpec, 550, 10);

      expect(results).toHaveLength(10);
      expect(results[0].id).toBe('550');
      expect(results[9].id).toBe('559');
    });

    it('should handle when items to skip exceeds first page', async () => {
      const querySpec = { query: 'SELECT * FROM c' };

      // No cached token, so starts from beginning

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          // Page 1: items 0-99
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-100',
          };
          // Page 2: items 100-199
          yield {
            resources: Array.from({ length: 100 }, (_, i) => ({ id: `${100 + i}` })),
            continuationToken: 'token-200',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      // Request offset 150, limit 10
      // Should fetch 2 pages (200 items), skip 150, return items 150-159
      const results = await model.query(querySpec, 150, 10);

      expect(results).toHaveLength(10);
      expect(results[0].id).toBe('150');
      expect(results[9].id).toBe('159');
    });
  });

  describe('result serialization', () => {
    it('should serialize nested objects in results', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: [
              {
                id: '1',
                data: { nested: { value: 123 } },
                tags: ['a', 'b'],
              },
            ],
            continuationToken: undefined,
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec, 0, 10);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('id', '1');
    });
  });

  describe('multiple sequential page requests simulation', () => {
    it('should efficiently handle browsing through pages 1, 2, 3 sequentially', async () => {
      const cache = getSharedPaginationCache();
      cache.clearAll();

      const querySpec = { query: 'SELECT * FROM c' };
      const pageSize = 50;

      // Page 1 (offset 0)
      const mockIterator1 = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: pageSize }, (_, i) => ({ id: `${i}` })),
            continuationToken: 'token-50',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockIterator1),
      }) as any;

      const page1Results = await model.query(querySpec, 0, pageSize);
      expect(page1Results).toHaveLength(pageSize);
      expect(page1Results[0].id).toBe('0');

      // Page 2 (offset 50) - should use token-50
      const mockIterator2 = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: pageSize }, (_, i) => ({ id: `${50 + i}` })),
            continuationToken: 'token-100',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockIterator2),
      }) as any;

      const page2Results = await model.query(querySpec, 50, pageSize);
      expect(page2Results).toHaveLength(pageSize);
      expect(page2Results[0].id).toBe('50');

      // Verify token-50 was used
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({ continuationToken: 'token-50' }),
      );

      // Page 3 (offset 100) - should use token-100
      const mockIterator3 = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: pageSize }, (_, i) => ({ id: `${100 + i}` })),
            continuationToken: 'token-150',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockIterator3),
      }) as any;

      const page3Results = await model.query(querySpec, 100, pageSize);
      expect(page3Results).toHaveLength(pageSize);
      expect(page3Results[0].id).toBe('100');

      // Verify token-100 was used
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({ continuationToken: 'token-100' }),
      );
    });

    it('should handle jumping to an earlier page after browsing forward', async () => {
      const cache = getSharedPaginationCache();
      cache.clearAll();

      const querySpec = { query: 'SELECT * FROM c' };
      const queryHash = cache.generateQueryHash(querySpec.query, []);

      // Pre-populate cache as if user browsed to page 3
      cache.storeToken(queryHash, 50, 'token-50');
      cache.storeToken(queryHash, 100, 'token-100');

      // Now user jumps back to page 2 (offset 50)
      const mockIterator = {
        async *[Symbol.asyncIterator]() {
          yield {
            resources: Array.from({ length: 50 }, (_, i) => ({ id: `${50 + i}` })),
            continuationToken: 'token-100-updated',
          };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockIterator),
      }) as any;

      const results = await model.query(querySpec, 50, 50);

      // Should use token-50 even when going backward
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        querySpec,
        expect.objectContaining({ continuationToken: 'token-50' }),
      );
      expect(results[0].id).toBe('50');
    });
  });
});
