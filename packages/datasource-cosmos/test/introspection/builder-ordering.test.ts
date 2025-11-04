/**
 * Test Builder Pattern with Ordering Options
 * Verifies that the builder pattern correctly handles orderByField and orderDirection
 */
import { CosmosClient } from '@azure/cosmos';

import { CosmosDatasourceBuilder } from '../../src/introspection/builder';
import introspectContainer from '../../src/introspection/container-introspector';

// Mock the introspectContainer function
jest.mock('../../src/introspection/container-introspector');

describe('Builder Pattern - Ordering Options', () => {
  let mockClient: CosmosClient;
  let builder: CosmosDatasourceBuilder;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CosmosClient
    mockClient = {} as CosmosClient;

    // Mock introspectContainer to return a basic model
    (introspectContainer as jest.Mock).mockResolvedValue({
      collectionName: 'test-collection',
      schema: {},
    });

    builder = new CosmosDatasourceBuilder(mockClient);
  });

  describe('Without Ordering Options', () => {
    it('should call introspectContainer without ordering options', async () => {
      builder.addCollectionFromContainer({
        name: 'users',
        databaseName: 'test-db',
        containerName: 'users-container',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'users',
        'test-db',
        'users-container',
        undefined, // partitionKeyPath
        100, // default sampleSize
        undefined, // overrideTypeConverter
        undefined, // enableCount
        {
          orderByField: undefined,
          orderDirection: 'DESC', // default
        },
      );
    });

    it('should use custom sample size without ordering', async () => {
      builder.addCollectionFromContainer({
        name: 'products',
        databaseName: 'test-db',
        containerName: 'products-container',
        sampleSize: 500,
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'products',
        'test-db',
        'products-container',
        undefined,
        500,
        undefined,
        undefined,
        {
          orderByField: undefined,
          orderDirection: 'DESC',
        },
      );
    });
  });

  describe('With orderByField Only', () => {
    it('should use orderByField with default orderDirection', async () => {
      builder.addCollectionFromContainer({
        name: 'orders',
        databaseName: 'test-db',
        containerName: 'orders-container',
        orderByField: '_ts',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'orders',
        'test-db',
        'orders-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC', // default
        },
      );
    });

    it('should use custom field for ordering', async () => {
      builder.addCollectionFromContainer({
        name: 'transactions',
        databaseName: 'test-db',
        containerName: 'transactions-container',
        orderByField: 'createdAt',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'transactions',
        'test-db',
        'transactions-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: 'createdAt',
          orderDirection: 'DESC',
        },
      );
    });
  });

  describe('With orderDirection', () => {
    it('should use DESC order direction', async () => {
      builder.addCollectionFromContainer({
        name: 'events',
        databaseName: 'test-db',
        containerName: 'events-container',
        orderByField: '_ts',
        orderDirection: 'DESC',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'events',
        'test-db',
        'events-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );
    });

    it('should use ASC order direction', async () => {
      builder.addCollectionFromContainer({
        name: 'logs',
        databaseName: 'test-db',
        containerName: 'logs-container',
        orderByField: 'timestamp',
        orderDirection: 'ASC',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'logs',
        'test-db',
        'logs-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: 'timestamp',
          orderDirection: 'ASC',
        },
      );
    });
  });

  describe('Complete Configuration', () => {
    it('should use all ordering options together with custom sample size', async () => {
      builder.addCollectionFromContainer({
        name: 'analytics',
        databaseName: 'test-db',
        containerName: 'analytics-container',
        sampleSize: 1000,
        orderByField: '_ts',
        orderDirection: 'DESC',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'analytics',
        'test-db',
        'analytics-container',
        undefined,
        1000,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );
    });

    it('should use all options including partitionKeyPath and enableCount', async () => {
      builder.addCollectionFromContainer({
        name: 'documents',
        databaseName: 'test-db',
        containerName: 'documents-container',
        partitionKeyPath: '/userId',
        sampleSize: 2000,
        enableCount: true,
        orderByField: 'updatedAt',
        orderDirection: 'ASC',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'documents',
        'test-db',
        'documents-container',
        '/userId',
        2000,
        undefined,
        true,
        {
          orderByField: 'updatedAt',
          orderDirection: 'ASC',
        },
      );
    });

    it('should use all options including overrideTypeConverter', async () => {
      const mockTypeConverter = jest.fn();

      builder.addCollectionFromContainer({
        name: 'custom',
        databaseName: 'test-db',
        containerName: 'custom-container',
        sampleSize: 500,
        orderByField: 'createdAt',
        orderDirection: 'DESC',
        overrideTypeConverter: mockTypeConverter,
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'custom',
        'test-db',
        'custom-container',
        undefined,
        500,
        mockTypeConverter,
        undefined,
        {
          orderByField: 'createdAt',
          orderDirection: 'DESC',
        },
      );
    });
  });

  describe('Multiple Collections', () => {
    it('should handle multiple collections with different ordering', async () => {
      builder
        .addCollectionFromContainer({
          name: 'users',
          databaseName: 'test-db',
          containerName: 'users-container',
          orderByField: '_ts',
          orderDirection: 'DESC',
        })
        .addCollectionFromContainer({
          name: 'products',
          databaseName: 'test-db',
          containerName: 'products-container',
          orderByField: 'createdAt',
          orderDirection: 'ASC',
        })
        .addCollectionFromContainer({
          name: 'orders',
          databaseName: 'test-db',
          containerName: 'orders-container',
          sampleSize: 500,
        });

      await builder.createCollectionsFromConfiguration();

      // Verify all three collections were configured correctly
      expect(introspectContainer).toHaveBeenCalledTimes(3);

      // First collection - DESC ordering
      expect(introspectContainer).toHaveBeenNthCalledWith(
        1,
        mockClient,
        'users',
        'test-db',
        'users-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );

      // Second collection - ASC ordering
      expect(introspectContainer).toHaveBeenNthCalledWith(
        2,
        mockClient,
        'products',
        'test-db',
        'products-container',
        undefined,
        100,
        undefined,
        undefined,
        {
          orderByField: 'createdAt',
          orderDirection: 'ASC',
        },
      );

      // Third collection - no ordering
      expect(introspectContainer).toHaveBeenNthCalledWith(
        3,
        mockClient,
        'orders',
        'test-db',
        'orders-container',
        undefined,
        500,
        undefined,
        undefined,
        {
          orderByField: undefined,
          orderDirection: 'DESC',
        },
      );
    });
  });

  describe('Builder Chaining', () => {
    it('should support method chaining with ordering options', async () => {
      const result = builder
        .addCollectionFromContainer({
          name: 'collection1',
          databaseName: 'test-db',
          containerName: 'container1',
          orderByField: '_ts',
        })
        .addCollectionFromContainer({
          name: 'collection2',
          databaseName: 'test-db',
          containerName: 'container2',
          orderByField: 'id',
          orderDirection: 'ASC',
        });

      expect(result).toBe(builder); // Verify chaining returns the builder
    });
  });

  describe('Edge Cases', () => {
    it('should handle sample size 1 with ordering', async () => {
      builder.addCollectionFromContainer({
        name: 'minimal',
        databaseName: 'test-db',
        containerName: 'minimal-container',
        sampleSize: 1,
        orderByField: '_ts',
        orderDirection: 'DESC',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'minimal',
        'test-db',
        'minimal-container',
        undefined,
        1,
        undefined,
        undefined,
        {
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      );
    });

    it('should handle large sample size with ordering', async () => {
      builder.addCollectionFromContainer({
        name: 'large',
        databaseName: 'test-db',
        containerName: 'large-container',
        sampleSize: 10000,
        orderByField: 'timestamp',
        orderDirection: 'ASC',
      });

      await builder.createCollectionsFromConfiguration();

      expect(introspectContainer).toHaveBeenCalledWith(
        mockClient,
        'large',
        'test-db',
        'large-container',
        undefined,
        10000,
        undefined,
        undefined,
        {
          orderByField: 'timestamp',
          orderDirection: 'ASC',
        },
      );
    });
  });
});
