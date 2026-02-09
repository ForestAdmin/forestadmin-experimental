/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, CosmosClient, Database } from '@azure/cosmos';
import { Logger } from '@forestadmin/datasource-toolkit';

import ModelCosmos, {
  CosmosSchema,
  configureRuLogging,
  isRuLoggingEnabled,
} from '../../src/model-builder/model';

describe('Model Builder > RU Logging', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockDatabase: jest.Mocked<Database>;
  let mockContainer: jest.Mocked<Container>;
  let testSchema: CosmosSchema;
  let mockLogger: jest.MockedFunction<Logger>;

  beforeEach(() => {
    // Reset RU logging configuration before each test
    configureRuLogging(false);

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
    // Reset RU logging after each test
    configureRuLogging(false);
  });

  describe('configureRuLogging', () => {
    it('should enable RU logging', () => {
      configureRuLogging(true, mockLogger);
      expect(isRuLoggingEnabled()).toBe(true);
    });

    it('should disable RU logging', () => {
      configureRuLogging(true, mockLogger);
      expect(isRuLoggingEnabled()).toBe(true);

      configureRuLogging(false);
      expect(isRuLoggingEnabled()).toBe(false);
    });
  });

  describe('isRuLoggingEnabled', () => {
    it('should return false by default', () => {
      expect(isRuLoggingEnabled()).toBe(false);
    });

    it('should return true when enabled', () => {
      configureRuLogging(true, mockLogger);
      expect(isRuLoggingEnabled()).toBe(true);
    });
  });

  describe('RU logging disabled (default)', () => {
    it('should not log RU consumption when disabled', async () => {
      configureRuLogging(false);

      const model = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: { id: '1', name: 'Alice' },
        requestCharge: 5.5,
      });

      await model.create([{ name: 'Alice' }]);

      expect(mockLogger).not.toHaveBeenCalled();
    });
  });

  describe('RU logging enabled', () => {
    let model: ModelCosmos;

    beforeEach(() => {
      configureRuLogging(true, mockLogger);

      model = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );
    });

    describe('create operation', () => {
      it('should log RU consumption for create', async () => {
        (mockContainer.items.create as jest.Mock).mockResolvedValue({
          resource: { id: '1', name: 'Alice' },
          requestCharge: 6.29,
        });

        await model.create([{ name: 'Alice' }]);

        expect(mockLogger).toHaveBeenCalledWith('Info', '[Cosmos RU] users.create: 6.29 RUs');
      });

      it('should log RU for each record created', async () => {
        (mockContainer.items.create as jest.Mock)
          .mockResolvedValueOnce({
            resource: { id: '1', name: 'Alice' },
            requestCharge: 5.5,
          })
          .mockResolvedValueOnce({
            resource: { id: '2', name: 'Bob' },
            requestCharge: 5.8,
          });

        await model.create([{ name: 'Alice' }, { name: 'Bob' }]);

        expect(mockLogger).toHaveBeenCalledTimes(2);
        expect(mockLogger).toHaveBeenNthCalledWith(1, 'Info', '[Cosmos RU] users.create: 5.5 RUs');
        expect(mockLogger).toHaveBeenNthCalledWith(2, 'Info', '[Cosmos RU] users.create: 5.8 RUs');
      });
    });

    describe('update operation', () => {
      it('should log RU for read and replace operations', async () => {
        const mockRead = jest.fn().mockResolvedValue({
          resource: { id: '1', userId: 'user1', name: 'Alice' },
          requestCharge: 1.0,
        });
        const mockReplace = jest.fn().mockResolvedValue({
          requestCharge: 10.5,
        });

        (mockContainer.item as jest.Mock).mockImplementation(() => ({
          read: mockRead,
          replace: mockReplace,
        }));

        await model.update([{ id: '1', partitionKey: 'user1' }], { name: 'Alice Updated' });

        expect(mockLogger).toHaveBeenCalledTimes(2);
        expect(mockLogger).toHaveBeenNthCalledWith(
          1,
          'Info',
          '[Cosmos RU] users.update.read: 1 RUs',
        );
        expect(mockLogger).toHaveBeenNthCalledWith(
          2,
          'Info',
          '[Cosmos RU] users.update.replace: 10.5 RUs',
        );
      });

      it('should only log read RU when item not found', async () => {
        const mockRead = jest.fn().mockResolvedValue({
          resource: undefined,
          requestCharge: 1.0,
        });
        const mockReplace = jest.fn();

        (mockContainer.item as jest.Mock).mockImplementation(() => ({
          read: mockRead,
          replace: mockReplace,
        }));

        await model.update([{ id: 'nonexistent', partitionKey: 'pk' }], { name: 'Test' });

        expect(mockLogger).toHaveBeenCalledTimes(1);
        expect(mockLogger).toHaveBeenCalledWith('Info', '[Cosmos RU] users.update.read: 1 RUs');
      });
    });

    describe('delete operation', () => {
      it('should log RU for delete', async () => {
        const mockDelete = jest.fn().mockResolvedValue({
          requestCharge: 7.14,
        });
        (mockContainer.item as jest.Mock).mockImplementation(() => ({
          delete: mockDelete,
        }));

        await model.delete([{ id: '1', partitionKey: 'user1' }]);

        expect(mockLogger).toHaveBeenCalledWith('Info', '[Cosmos RU] users.delete: 7.14 RUs');
      });

      it('should log RU for each delete operation', async () => {
        const mockDelete = jest
          .fn()
          .mockResolvedValueOnce({ requestCharge: 5.0 })
          .mockResolvedValueOnce({ requestCharge: 5.5 });

        (mockContainer.item as jest.Mock).mockImplementation(() => ({
          delete: mockDelete,
        }));

        await model.delete([
          { id: '1', partitionKey: 'user1' },
          { id: '2', partitionKey: 'user2' },
        ]);

        expect(mockLogger).toHaveBeenCalledTimes(2);
        expect(mockLogger).toHaveBeenNthCalledWith(1, 'Info', '[Cosmos RU] users.delete: 5 RUs');
        expect(mockLogger).toHaveBeenNthCalledWith(2, 'Info', '[Cosmos RU] users.delete: 5.5 RUs');
      });
    });

    describe('query operation', () => {
      it('should log RU for fetchAll query', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ id: '1' }],
            requestCharge: 3.42,
          }),
        }) as any;

        await model.query({ query: 'SELECT * FROM c' });

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          '[Cosmos RU] users.query.fetchAll: 3.42 RUs',
        );
      });

      it('should log RU for each page in paginated query', async () => {
        const mockAsyncIterator = {
          async *[Symbol.asyncIterator]() {
            yield { resources: [{ id: '1' }], continuationToken: 'token1', requestCharge: 2.5 };
            yield { resources: [{ id: '2' }], continuationToken: null, requestCharge: 2.3 };
          },
        };

        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
        }) as any;

        await model.query({ query: 'SELECT * FROM c' }, 0, 10);

        expect(mockLogger).toHaveBeenCalledTimes(2);
        expect(mockLogger).toHaveBeenNthCalledWith(
          1,
          'Info',
          '[Cosmos RU] users.query.page: 2.5 RUs',
        );
        expect(mockLogger).toHaveBeenNthCalledWith(
          2,
          'Info',
          '[Cosmos RU] users.query.page: 2.3 RUs',
        );
      });
    });

    describe('aggregateQuery operation', () => {
      it('should log RU for aggregate query', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ value: 100 }],
            requestCharge: 4.67,
          }),
        }) as any;

        await model.aggregateQuery({ query: 'SELECT COUNT(1) FROM c' });

        expect(mockLogger).toHaveBeenCalledWith('Info', '[Cosmos RU] users.aggregate: 4.67 RUs');
      });
    });

    describe('count operation', () => {
      it('should log RU for count without filter', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [150],
            requestCharge: 2.89,
          }),
        }) as any;

        await model.count();

        expect(mockLogger).toHaveBeenCalledWith('Info', '[Cosmos RU] users.count: 2.89 RUs');
      });

      it('should log RU for count with filter', async () => {
        (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [42],
            requestCharge: 3.21,
          }),
        }) as any;

        await model.count({
          query: 'SELECT c FROM c WHERE c.status = @status',
          parameters: [{ name: '@status', value: 'active' }],
        });

        expect(mockLogger).toHaveBeenCalledWith('Info', '[Cosmos RU] users.count: 3.21 RUs');
      });
    });

    describe('undefined requestCharge handling', () => {
      it('should not log when requestCharge is undefined', async () => {
        (mockContainer.items.create as jest.Mock).mockResolvedValue({
          resource: { id: '1', name: 'Alice' },
          requestCharge: undefined,
        });

        await model.create([{ name: 'Alice' }]);

        expect(mockLogger).not.toHaveBeenCalled();
      });
    });
  });

  describe('logger not provided', () => {
    it('should not throw when logger is not provided', async () => {
      configureRuLogging(true); // No logger provided

      const model = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        testSchema,
      );

      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: { id: '1', name: 'Alice' },
        requestCharge: 5.0,
      });

      // Should not throw
      await expect(model.create([{ name: 'Alice' }])).resolves.not.toThrow();
    });
  });
});
