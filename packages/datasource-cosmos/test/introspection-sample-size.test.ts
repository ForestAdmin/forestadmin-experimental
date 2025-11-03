/**
 * Test introspectionSampleSize parameter
 * Verifies that the sample size parameter works correctly:
 * 1. Default value of 100 is used when not specified
 * 2. Custom values can be provided and are respected
 * 3. Parameter is passed through all introspection paths
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

describe('Introspection Sample Size Parameter', () => {
  let mockLogger: jest.Mock;
  let mockRestartAgent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = jest.fn();
    mockRestartAgent = jest.fn().mockResolvedValue(undefined);

    // Mock Introspector.introspect to return empty array
    (Introspector.introspect as jest.Mock).mockResolvedValue([]);
  });

  describe('Default Value (100)', () => {
    it('should use default sample size of 100 when not specified', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      // Verify Introspector.introspect was called with default sample size of 100
      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object), // client
        'test-database',
        mockLogger,
        100, // default sample size
      );
    });

    it(
      'should use default sample size of 100 when options object is provided but ' +
        'introspectionSampleSize is not',
      async () => {
        const factory = createCosmosDataSource(
          'https://test.documents.azure.com:443/',
          'test-key',
          'test-database',
          {
            // Other options but no introspectionSampleSize
          },
        );

        await callFactory(factory, mockLogger, mockRestartAgent);

        // Verify default sample size is used
        expect(Introspector.introspect).toHaveBeenCalledWith(
          expect.any(Object),
          'test-database',
          mockLogger,
          100,
        );
      },
    );
  });

  describe('Custom Values', () => {
    it('should use custom sample size of 200 when specified', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 200,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      // Verify custom sample size is used
      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        200,
      );
    });

    it('should use custom sample size of 50 when specified', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 50,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        50,
      );
    });

    it('should use custom sample size of 500 when specified', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 500,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        500,
      );
    });

    it('should work with introspectionSampleSize of 1', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 1,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        1,
      );
    });
  });

  describe('With Other Options', () => {
    it('should work alongside virtualArrayCollections option', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 150,
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
        150,
      );
    });

    it('should work alongside clientOptions', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 250,
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
        250,
      );
    });
  });

  describe('No Database Name (No Introspection)', () => {
    it('should not call introspect when no database name is provided', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        undefined, // no database name
        {
          introspectionSampleSize: 200,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      // Introspector should not be called when there's no database name
      expect(Introspector.introspect).not.toHaveBeenCalled();
    });

    it('should not call introspect when builder is used instead', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 200,
          builder: configurator => configurator,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      // Introspector should not be called when builder is used
      expect(Introspector.introspect).not.toHaveBeenCalled();
    });
  });

  describe('Boundary Values', () => {
    it('should handle very small sample size (1)', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 1,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        1,
      );
    });

    it('should handle very large sample size (10000)', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: 10000,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        10000,
      );
    });
  });

  describe('Type Safety', () => {
    it('should accept number type for introspectionSampleSize', () => {
      const sampleSize = 150;

      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          introspectionSampleSize: sampleSize,
        },
      );

      // If this compiles, type safety is working correctly
      expect(factory).toBeDefined();
    });

    it('should accept optional introspectionSampleSize', () => {
      const options: { introspectionSampleSize?: number } = {};

      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        options,
      );

      // If this compiles, type safety is working correctly
      expect(factory).toBeDefined();
    });
  });
});
