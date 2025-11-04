/**
 * Test SQL query generation with ORDER BY clause
 * Verifies that the container introspector generates correct SQL queries
 * when orderByField and orderDirection are specified
 */
import { CosmosClient } from '@azure/cosmos';

import introspectContainer from '../../src/introspection/container-introspector';

describe('Container Introspector - Order By Query Generation', () => {
  let mockClient: CosmosClient;
  let mockQuery: jest.Mock;
  let mockFetchAll: jest.Mock;
  let mockRead: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetchAll to return empty resources
    mockFetchAll = jest.fn().mockResolvedValue({
      resources: [],
    });

    // Mock query to track the SQL query
    mockQuery = jest.fn().mockReturnValue({
      fetchAll: mockFetchAll,
    });

    // Mock container.read() for partition key
    mockRead = jest.fn().mockResolvedValue({
      resource: {
        partitionKey: {
          paths: ['/id'],
        },
      },
    });

    // Mock Cosmos client structure
    mockClient = {
      database: jest.fn().mockReturnValue({
        container: jest.fn().mockReturnValue({
          items: {
            query: mockQuery,
          },
          read: mockRead,
        }),
      }),
    } as unknown as CosmosClient;
  });

  describe('Without Ordering', () => {
    it('should generate query without ORDER BY when orderByField is not specified', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
      );

      // Verify query was called with basic SELECT without ORDER BY
      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c',
      });
    });

    it('should generate query without ORDER BY when options is empty', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        50,
        undefined,
        undefined,
        {}, // empty options
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 50 * FROM c',
      });
    });
  });

  describe('With ORDER BY _ts (timestamp)', () => {
    it('should generate query with ORDER BY _ts DESC', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c ORDER BY c._ts DESC',
      });
    });

    it('should generate query with ORDER BY _ts ASC', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'ASC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c ORDER BY c._ts ASC',
      });
    });

    it('should default to DESC when orderDirection is not specified', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          // orderDirection not specified
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c ORDER BY c._ts DESC',
      });
    });
  });

  describe('With Custom Fields', () => {
    it('should generate query with ORDER BY createdAt DESC', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: 'createdAt',
          orderDirection: 'DESC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c ORDER BY c.createdAt DESC',
      });
    });

    it('should generate query with ORDER BY updatedAt ASC', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        200,
        undefined,
        undefined,
        {
          orderByField: 'updatedAt',
          orderDirection: 'ASC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 200 * FROM c ORDER BY c.updatedAt ASC',
      });
    });

    it('should generate query with ORDER BY id DESC', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        50,
        undefined,
        undefined,
        {
          orderByField: 'id',
          orderDirection: 'DESC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 50 * FROM c ORDER BY c.id DESC',
      });
    });
  });

  describe('With Different Sample Sizes', () => {
    it('should generate query with sample size 1000 and ordering', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        1000,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 1000 * FROM c ORDER BY c._ts DESC',
      });
    });

    it('should generate query with sample size 5000 and ordering', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        5000,
        undefined,
        undefined,
        {
          orderByField: 'createdAt',
          orderDirection: 'ASC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 5000 * FROM c ORDER BY c.createdAt ASC',
      });
    });

    it('should generate query with sample size 1', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        1,
        undefined,
        undefined,
        {
          orderByField: '_ts',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 1 * FROM c ORDER BY c._ts DESC',
      });
    });
  });

  describe('Query Execution', () => {
    it('should call fetchAll on the query result', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );

      expect(mockFetchAll).toHaveBeenCalledTimes(1);
    });

    it('should process documents returned by fetchAll', async () => {
      // Mock some sample documents
      mockFetchAll.mockResolvedValue({
        resources: [
          { id: '1', name: 'Test 1', _ts: 1000 },
          { id: '2', name: 'Test 2', _ts: 2000 },
        ],
      });

      const result = await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );

      // Verify the model was created with the correct schema
      expect(result).toBeDefined();
      expect(result.name).toBe('test-collection');
    });
  });

  describe('Field Name Handling', () => {
    it('should handle field names with underscores', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: 'created_at',
          orderDirection: 'DESC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c ORDER BY c.created_at DESC',
      });
    });

    it('should handle field names with camelCase', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: 'lastModifiedDate',
          orderDirection: 'ASC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c ORDER BY c.lastModifiedDate ASC',
      });
    });
  });

  describe('Combined Options', () => {
    it('should work with all introspection options together', async () => {
      await introspectContainer(
        mockClient,
        'test-collection',
        'test-database',
        'test-container',
        '/partitionKey',
        1000,
        undefined,
        true, // enableCount
        {
          flattenNestedObjects: true,
          maxDepth: 5,
          introspectArrayItems: false,
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );

      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT TOP 1000 * FROM c ORDER BY c._ts DESC',
      });
    });
  });
});
