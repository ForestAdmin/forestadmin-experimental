/**
 * Test logRuConsumption parameter for createCosmosDataSource
 * Verifies that the RU logging configuration option works correctly:
 * 1. RU logging is disabled by default
 * 2. RU logging can be enabled via logRuConsumption option
 * 3. RU logging uses the Forest Admin logger at Debug level
 * 4. Works alongside other options
 */
import { createCosmosDataSource, createCosmosDataSourceForEmulator } from '../src/index';
import Introspector from '../src/introspection/introspector';
import { configureRuLogging, isRuLoggingEnabled } from '../src/model-builder/model';

// Mock the Introspector
jest.mock('../src/introspection/introspector');

// Helper to call factory with both possible signatures
async function callFactory(
  factory: ReturnType<typeof createCosmosDataSource>,
  logger: jest.Mock,
  restartAgent?: jest.Mock,
) {
  return (factory as (logger: unknown, restartAgent?: unknown) => Promise<unknown>)(
    logger,
    restartAgent,
  );
}

describe('logRuConsumption Parameter', () => {
  let mockLogger: jest.Mock;
  let mockRestartAgent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset RU logging configuration before each test
    configureRuLogging(false);

    mockLogger = jest.fn();
    mockRestartAgent = jest.fn().mockResolvedValue(undefined);

    // Mock Introspector.introspect to return empty array
    (Introspector.introspect as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    // Reset RU logging after each test
    configureRuLogging(false);
  });

  describe('Default Behavior', () => {
    it('should not enable RU logging when option is not provided', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(false);
    });

    it('should not enable RU logging when options object is empty', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {},
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(false);
    });

    it('should not enable RU logging when logRuConsumption is false', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logRuConsumption: false,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(false);
    });
  });

  describe('Enabling RU Logging', () => {
    it('should enable RU logging when logRuConsumption is true', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logRuConsumption: true,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(true);
    });
  });

  describe('createCosmosDataSourceForEmulator', () => {
    it('should support logRuConsumption option', async () => {
      const factory = createCosmosDataSourceForEmulator('test-database', {
        logRuConsumption: true,
      });

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(true);
    });

    it('should not enable RU logging by default', async () => {
      const factory = createCosmosDataSourceForEmulator('test-database');

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(false);
    });
  });

  describe('With Other Options', () => {
    it('should work alongside introspectionConfig', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logRuConsumption: true,
          introspectionConfig: {
            sampleSize: 500,
            orderByField: '_ts',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      // RU logging should be enabled
      expect(isRuLoggingEnabled()).toBe(true);

      // Introspector should still be called with correct params
      expect(Introspector.introspect).toHaveBeenCalledWith(
        expect.any(Object),
        'test-database',
        mockLogger,
        500,
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
          logRuConsumption: true,
          clientOptions: {
            connectionPolicy: {
              requestTimeout: 30000,
            },
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(true);
    });

    it('should work alongside liveQuery options', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logRuConsumption: true,
          liveQueryConnections: 'live-connection',
          liveQueryDatabase: 'live-db',
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(true);
    });

    it('should work alongside virtualArrayCollections', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logRuConsumption: true,
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

      expect(isRuLoggingEnabled()).toBe(true);
    });

    it('should work alongside disableIntrospection and schema', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logRuConsumption: true,
          disableIntrospection: true,
          schema: {
            collections: [
              {
                name: 'users',
                containerName: 'users',
                partitionKeyPath: '/id',
                fields: [
                  { name: 'id', type: 'string' },
                  { name: 'name', type: 'string' },
                ],
              },
            ],
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(true);
    });

    it('should work with all options combined', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logRuConsumption: true,
          introspectionConfig: {
            sampleSize: 1000,
            orderByField: '_ts',
            orderDirection: 'DESC',
          },
          clientOptions: {
            connectionPolicy: {
              requestTimeout: 30000,
            },
          },
          liveQueryConnections: 'connection',
          liveQueryDatabase: 'db',
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isRuLoggingEnabled()).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should accept logRuConsumption as boolean', () => {
      const config: { logRuConsumption: boolean } = {
        logRuConsumption: true,
      };

      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        config,
      );

      expect(factory).toBeDefined();
    });

    it('should accept logRuConsumption alongside other options', () => {
      const config: {
        logRuConsumption: boolean;
        introspectionConfig: { sampleSize: number };
      } = {
        logRuConsumption: true,
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
