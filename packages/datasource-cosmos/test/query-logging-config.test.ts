/**
 * Test logQueries parameter for createCosmosDataSource
 * Verifies that the query logging configuration option works correctly:
 * 1. Query logging is disabled by default
 * 2. Query logging can be enabled via logQueries option
 * 3. Works alongside other options
 */
import { createCosmosDataSource, createCosmosDataSourceForEmulator } from '../src/index';
import Introspector from '../src/introspection/introspector';
import { configureQueryLogging, isQueryLoggingEnabled } from '../src/model-builder/model';

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

describe('logQueries Parameter', () => {
  let mockLogger: jest.Mock;
  let mockRestartAgent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset query logging configuration before each test
    configureQueryLogging(false);

    mockLogger = jest.fn();
    mockRestartAgent = jest.fn().mockResolvedValue(undefined);

    // Mock Introspector.introspect to return empty array
    (Introspector.introspect as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    // Reset query logging after each test
    configureQueryLogging(false);
  });

  describe('Default Behavior', () => {
    it('should not enable query logging when option is not provided', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(false);
    });

    it('should not enable query logging when options object is empty', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {},
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(false);
    });

    it('should not enable query logging when logQueries is false', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logQueries: false,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(false);
    });
  });

  describe('Enabling Query Logging', () => {
    it('should enable query logging when logQueries is true', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logQueries: true,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(true);
    });
  });

  describe('createCosmosDataSourceForEmulator', () => {
    it('should support logQueries option', async () => {
      const factory = createCosmosDataSourceForEmulator('test-database', {
        logQueries: true,
      });

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(true);
    });

    it('should not enable query logging by default', async () => {
      const factory = createCosmosDataSourceForEmulator('test-database');

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(false);
    });
  });

  describe('With Other Options', () => {
    it('should work alongside logRuConsumption', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logQueries: true,
          logRuConsumption: true,
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(true);
    });

    it('should work alongside introspectionConfig', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logQueries: true,
          introspectionConfig: {
            sampleSize: 500,
            orderByField: '_ts',
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(true);

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
          logQueries: true,
          clientOptions: {
            connectionPolicy: {
              requestTimeout: 30000,
            },
          },
        },
      );

      await callFactory(factory, mockLogger, mockRestartAgent);

      expect(isQueryLoggingEnabled()).toBe(true);
    });

    it('should work alongside disableIntrospection and schema', async () => {
      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        {
          logQueries: true,
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

      expect(isQueryLoggingEnabled()).toBe(true);
    });
  });

  describe('Type Safety', () => {
    it('should accept logQueries as boolean', () => {
      const config: { logQueries: boolean } = {
        logQueries: true,
      };

      const factory = createCosmosDataSource(
        'https://test.documents.azure.com:443/',
        'test-key',
        'test-database',
        config,
      );

      expect(factory).toBeDefined();
    });

    it('should accept logQueries alongside other options', () => {
      const config: {
        logQueries: boolean;
        logRuConsumption: boolean;
        introspectionConfig: { sampleSize: number };
      } = {
        logQueries: true,
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
