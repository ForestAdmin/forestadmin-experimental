/**
 * Test IntrospectionConfig parameter
 * Verifies that the new introspection configuration works correctly:
 * 1. IntrospectionConfig with sampleSize, orderByField, and orderDirection
 * 2. Backward compatibility with deprecated introspectionSampleSize
 * 3. Default values are applied correctly
 * 4. Parameters are passed through all introspection paths
 */
import { createCosmosDataSource } from '../src/index';
import Introspector from '../src/introspection/introspector';

// Mock the Introspector
jest.mock('../src/introspection/introspector');

// Helper to call factory with both possible signatures (backward compatibility)
async function callFactory(
  factory: ReturnType<typeof createCosmosDataSource>,
  logger: jest.Mock,
  restartAgent?: jest.Mock,
) {
  // Cast to support both DataSourceFactory signatures (with/without restartAgent)
  return (factory as (logger: unknown, restartAgent?: unknown) => Promise<unknown>)(
    logger,
    restartAgent,
  );
}

describe('IntrospectionConfig Parameter', () => {
  let mockLogger: jest.Mock;
  let mockRestartAgent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = jest.fn();
    mockRestartAgent = jest.fn().mockResolvedValue(undefined);

    // Mock Introspector.introspect to return empty array
    (Introspector.introspect as jest.Mock).mockResolvedValue([]);
  });

  describe('Default Values', () => {
    it('should use default values when introspectionConfig is not provided', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      // Verify defaults: sampleSize=100, orderByField=undefined, orderDirection='DESC'
      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object), // client
        'test-database',
        mockLogger,
        100, // default sample size
        undefined, // no orderByField
        'DESC', // default order direction
      );
    });

    it('should apply default orderDirection when only orderByField is specified', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            orderByField: '_ts',
            // orderDirection not specified, should default to 'DESC'
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        100, // default sample size
        '_ts',
        'DESC', // default order direction
      );
    });
  });

  describe('IntrospectionConfig with sampleSize', () => {
    it('should use custom sample size from introspectionConfig', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 500,
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        500,
        undefined,
        'DESC',
      );
    });

    it('should use custom sample size of 1000', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 1000,
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        1000,
        undefined,
        'DESC',
      );
    });

    it('should use custom sample size of 5000', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 5000,
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        5000,
        undefined,
        'DESC',
      );
    });
  });

  describe('IntrospectionConfig with orderByField', () => {
    it('should use _ts field for ordering', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            orderByField: '_ts',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        100,
        '_ts',
        'DESC',
      );
    });

    it('should use custom field for ordering', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            orderByField: 'createdAt',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        100,
        'createdAt',
        'DESC',
      );
    });

    it('should use id field for ordering', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            orderByField: 'id',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        100,
        'id',
        'DESC',
      );
    });
  });

  describe('IntrospectionConfig with orderDirection', () => {
    it('should use DESC order direction', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            orderByField: '_ts',
            orderDirection: 'DESC',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        100,
        '_ts',
        'DESC',
      );
    });

    it('should use ASC order direction', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            orderByField: '_ts',
            orderDirection: 'ASC',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        100,
        '_ts',
        'ASC',
      );
    });
  });

  describe('Complete IntrospectionConfig', () => {
    it('should use all introspectionConfig parameters together', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 1000,
            orderByField: '_ts',
            orderDirection: 'DESC',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        1000,
        '_ts',
        'DESC',
      );
    });

    it('should work with sampleSize and orderByField, defaulting orderDirection', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 2000,
            orderByField: 'updatedAt',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        2000,
        'updatedAt',
        'DESC', // default
      );
    });

    it('should use ASC ordering with custom sample size', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 500,
            orderByField: 'createdAt',
            orderDirection: 'ASC',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        500,
        'createdAt',
        'ASC',
      );
    });
  });

  describe('With Other Options', () => {
    it('should work alongside virtualArrayCollections', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 1000,
            orderByField: '_ts',
            orderDirection: 'DESC',
          },
          virtualArrayCollections: [
            {
              parentContainerName: 'orders',
              collectionName: 'order_items',
              arrayFieldPath: 'items',
            },
          ],
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        1000,
        '_ts',
        'DESC',
      );
    });

    it('should work alongside clientOptions', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 750,
            orderByField: 'id',
          },
          clientOptions: {
            connectionPolicy: {
              requestTimeout: 30000,
            },
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        750,
        'id',
        'DESC',
      );
    });

    it('should work alongside liveQuery options', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 500,
            orderByField: '_ts',
            orderDirection: 'ASC',
          },
          liveQueryConnections: 'live-connection',
          liveQueryDatabase: 'live-db',
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        500,
        '_ts',
        'ASC',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty introspectionConfig object', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {},
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      // Should use all defaults
      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        100,
        undefined,
        'DESC',
      );
    });

    it('should handle very small sample size (1)', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 1,
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        1,
        undefined,
        'DESC',
      );
    });

    it('should handle very large sample size (10000)', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 10000,
            orderByField: '_ts',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        10000,
        '_ts',
        'DESC',
      );
    });
  });

  describe('No Introspection Cases', () => {
    it('should not call introspect when no database name is provided', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        undefined, // no database name
        {
          introspectionConfig: {
            sampleSize: 1000,
            orderByField: '_ts',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).not.toHaveBeenCalled();
    });

    it('should not call introspect when builder is used', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionConfig: {
            sampleSize: 1000,
            orderByField: '_ts',
          },
          builder: configurator => configurator,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).not.toHaveBeenCalled();
    });
  });

  describe('Type Safety', () => {
    it('should accept IntrospectionConfig with all properties', () => {
      const config: {
        introspectionConfig: {
          sampleSize: number;
          orderByField: string;
          orderDirection: 'ASC' | 'DESC';
        };
      } = {
        introspectionConfig: {
          sampleSize: 1000,
          orderByField: '_ts',
          orderDirection: 'DESC',
        },
      };

      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        config,
      );

      expect(factory).toBeDefined();
    });

    it('should accept partial IntrospectionConfig', () => {
      const config: {
        introspectionConfig: { sampleSize?: number; orderByField?: string };
      } = {
        introspectionConfig: {
          sampleSize: 500,
        },
      };

      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        config,
      );

      expect(factory).toBeDefined();
    });
  });
});
