/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, CosmosClient, Database } from '@azure/cosmos';
import { Logger } from '@forestadmin/datasource-toolkit';

import ModelCosmos, {
  CosmosSchema,
  configureQueryLogging,
  isQueryLoggingEnabled,
} from '../../src/model-builder/model';

describe('Model Builder > Query Logging', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockDatabase: jest.Mocked<Database>;
  let mockContainer: jest.Mocked<Container>;
  let testSchema: CosmosSchema;
  let mockLogger: jest.MockedFunction<Logger>;

  beforeEach(() => {
    // Reset query logging configuration before each test
    configureQueryLogging(false);

    // Setup logger mock
    mockLogger = jest.fn();

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
  });

  afterEach(() => {
    // Reset query logging after each test
    configureQueryLogging(false);
  });

  describe('configureQueryLogging', () => {
    it('should enable query logging', () => {
      configureQueryLogging(true, mockLogger);
      expect(isQueryLoggingEnabled()).toBe(true);
    });

    it('should disable query logging', () => {
      configureQueryLogging(true, mockLogger);
      expect(isQueryLoggingEnabled()).toBe(true);

      configureQueryLogging(false);
      expect(isQueryLoggingEnabled()).toBe(false);
    });
  });

  describe('isQueryLoggingEnabled', () => {
    it('should return false by default', () => {
      expect(isQueryLoggingEnabled()).toBe(false);
    });

    it('should return true when enabled', () => {
      configureQueryLogging(true, mockLogger);
      expect(isQueryLoggingEnabled()).toBe(true);
    });
  });

  describe('Query logging disabled (default)', () => {
    it('should not log queries when disabled', async () => {
      configureQueryLogging(false);

      const model = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [{ id: '1' }],
          requestCharge: 3.42,
        }),
      }) as any;

      await model.query({ query: 'SELECT * FROM c' });

      expect(mockLogger).not.toHaveBeenCalled();
    });
  });

  describe('Query logging enabled', () => {
    let model: ModelCosmos;

    beforeEach(() => {
      configureQueryLogging(true, mockLogger);

      model = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );
    });

    describe('query operation', () => {
      it('should log query for fetchAll', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ id: '1' }],
            requestCharge: 3.42,
          }),
        }) as any;

        await model.query({ query: 'SELECT * FROM c' });

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.query: SELECT * FROM c | Params: [] | PartitionKey: undefined',
        );
      });

      it('should log query with parameters', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ id: '1' }],
            requestCharge: 3.42,
          }),
        }) as any;

        await model.query({
          query: 'SELECT * FROM c WHERE c.name = @name',
          parameters: [{ name: '@name', value: 'Alice' }],
        });

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.query: SELECT * FROM c WHERE c.name = @name | Params: [{"name":"@name","value":"Alice"}] | PartitionKey: undefined',
        );
      });

      it('should log query with partition key', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ id: '1' }],
            requestCharge: 3.42,
          }),
        }) as any;

        await model.query({ query: 'SELECT * FROM c' }, undefined, undefined, 'pk1');

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.query: SELECT * FROM c | Params: [] | PartitionKey: pk1',
        );
      });

      it('should log query for paginated query', async () => {
        const mockAsyncIterator = {
          async *[Symbol.asyncIterator]() {
            yield { resources: [{ id: '1' }], continuationToken: null, requestCharge: 2.5 };
          },
        };

        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
        }) as any;

        await model.query({ query: 'SELECT * FROM c' }, 0, 10);

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.query: SELECT * FROM c | Params: [] | PartitionKey: undefined',
        );
      });
    });

    describe('aggregateQuery operation', () => {
      it('should log aggregate query', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ value: 100 }],
            requestCharge: 4.67,
          }),
        }) as any;

        await model.aggregateQuery({
          query: 'SELECT COUNT(1) as cnt FROM c',
          parameters: [{ name: '@status', value: 'active' }],
        });

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.aggregate: SELECT COUNT(1) as cnt FROM c | Params: [{"name":"@status","value":"active"}] | PartitionKey: undefined',
        );
      });

      it('should log aggregate query with partition key', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ value: 100 }],
            requestCharge: 4.67,
          }),
        }) as any;

        await model.aggregateQuery({ query: 'SELECT COUNT(1) FROM c' }, 'pk1');

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.aggregate: SELECT COUNT(1) FROM c | Params: [] | PartitionKey: pk1',
        );
      });
    });

    describe('count operation', () => {
      it('should log count query without filter', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [150],
            requestCharge: 2.89,
          }),
        }) as any;

        await model.count();

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.count: SELECT VALUE COUNT(1) FROM c | Params: [] | PartitionKey: undefined',
        );
      });

      it('should log count query with filter', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [42],
            requestCharge: 3.21,
          }),
        }) as any;

        await model.count({
          query: 'SELECT * FROM c WHERE c.status = @status',
          parameters: [{ name: '@status', value: 'active' }],
        });

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.count: SELECT VALUE COUNT(1) FROM c WHERE c.status = @status | Params: [{"name":"@status","value":"active"}] | PartitionKey: undefined',
        );
      });

      it('should log count query with partition key', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [10],
            requestCharge: 2.0,
          }),
        }) as any;

        await model.count(undefined, 'pk1');

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos Query] users.count: SELECT VALUE COUNT(1) FROM c | Params: [] | PartitionKey: pk1',
        );
      });
    });

    describe('logger not provided', () => {
      it('should not throw when logger is not provided', async () => {
        configureQueryLogging(true); // No logger provided

        const modelNoLogger = new ModelCosmos(
          mockCosmosClient,
          'users',
          'testDatabase',
          'usersContainer',
          '/userId',
          testSchema,
        );

        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ id: '1' }],
            requestCharge: 3.0,
          }),
        }) as any;

        // Should not throw
        await expect(modelNoLogger.query({ query: 'SELECT * FROM c' })).resolves.not.toThrow();
      });
    });
  });
});
