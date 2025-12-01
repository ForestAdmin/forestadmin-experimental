/**
 * Test pagination efficiency
 * Verifies that the datasource only fetches the required number of records
 * instead of loading everything into memory
 */
import { CosmosClient } from '@azure/cosmos';

import ModelCosmos, { configurePaginationCache } from '../src/model-builder/model';

describe('Model - Pagination Efficiency', () => {
  let mockClient: jest.Mocked<CosmosClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContainer: any;
  let model: ModelCosmos;

  beforeEach(() => {
    // Reset pagination cache before each test
    configurePaginationCache({ maxOffset: 100000, ttlMs: 300000 });

    // Mock CosmosClient
    mockClient = {
      database: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    // Create spy for getAsyncIterator to track how many items are fetched
    // Each page yields resources with a continuation token (except the last page)
    const createMockAsyncIterator = () => ({
      async *[Symbol.asyncIterator]() {
        // Simulate 3 pages of 10 items each (30 total items)
        for (let page = 0; page < 3; page += 1) {
          const resources = Array.from({ length: 10 }, (_, i) => ({
            id: `item-${page * 10 + i}`,
            name: `Item ${page * 10 + i}`,
          }));
          // Last page has no continuation token
          const continuationToken = page < 2 ? `token-page-${page + 1}` : undefined;
          yield { resources, continuationToken };
        }
      },
    });

    // Mock container
    mockContainer = {
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: Array.from({ length: 30 }, (_, i) => ({
              id: `item-${i}`,
              name: `Item ${i}`,
            })),
          }),
          getAsyncIterator: jest.fn().mockImplementation(createMockAsyncIterator),
        }),
      },
    };

    const mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockClient.database.mockReturnValue(mockDatabase as any);

    // Create model directly (bypass introspection to avoid container.read() calls)
    model = new ModelCosmos(mockClient, 'test-collection', 'test-db', 'test-collection', '/id', {
      id: { type: 'string' },
      name: { type: 'string' },
    });
  });

  it('should use pagination API when limit is specified', async () => {
    // Query with pagination (skip=0, limit=5)
    const results = await model.query({ query: 'SELECT * FROM c' }, 0, 5);

    // Should use getAsyncIterator (not fetchAll)
    expect(mockContainer.items.query().getAsyncIterator).toHaveBeenCalled();
    expect(mockContainer.items.query().fetchAll).not.toHaveBeenCalled();

    // Should return exactly 5 results
    expect(results).toHaveLength(5);
    expect(results[0].id).toBe('item-0');
    expect(results[4].id).toBe('item-4');
  });

  it('should handle offset correctly', async () => {
    // Query with offset=10, limit=5
    const results = await model.query({ query: 'SELECT * FROM c' }, 10, 5);

    // Should use getAsyncIterator
    expect(mockContainer.items.query().getAsyncIterator).toHaveBeenCalled();

    // Should return 5 results starting from index 10
    expect(results).toHaveLength(5);
    expect(results[0].id).toBe('item-10');
    expect(results[4].id).toBe('item-14');
  });

  it('should use fetchAll when no pagination parameters', async () => {
    // Query without pagination
    const results = await model.query({ query: 'SELECT * FROM c' });

    // Should use fetchAll (backward compatibility)
    expect(mockContainer.items.query().fetchAll).toHaveBeenCalled();
    expect(mockContainer.items.query().getAsyncIterator).not.toHaveBeenCalled();

    // Should return all results
    expect(results).toHaveLength(30);
  });

  it('should use optimized page size for efficient fetching', async () => {
    // Reset mock to track call arguments
    mockContainer.items.query.mockClear();

    // Query with offset=5, limit=10
    await model.query({ query: 'SELECT * FROM c' }, 5, 10);

    // Check that query was called with maxItemCount
    // Note: Page size is optimized to be between 100 and 1000 for efficiency
    // (larger batches = fewer round trips)
    const queryCall = mockContainer.items.query.mock.calls[0];
    expect(queryCall[1]).toEqual({ maxItemCount: 100 });
  });

  it('should handle edge case: offset larger than available results', async () => {
    // Query with offset=100, limit=5 (but only 30 items total)
    const results = await model.query({ query: 'SELECT * FROM c' }, 100, 5);

    // Should return empty array
    expect(results).toHaveLength(0);
  });

  it('should handle edge case: limit larger than available results', async () => {
    // Query with offset=20, limit=100 (only 10 items left)
    const results = await model.query({ query: 'SELECT * FROM c' }, 20, 100);

    // Should return remaining 10 items
    expect(results).toHaveLength(10);
    expect(results[0].id).toBe('item-20');
    expect(results[9].id).toBe('item-29');
  });
});
