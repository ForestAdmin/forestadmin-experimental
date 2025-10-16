/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, CosmosClient, Database } from '@azure/cosmos';
// RecordData import removed - not directly used from '@forestadmin/datasource-toolkit';

import ModelCosmos, { CosmosSchema } from '../../src/model-builder/model';

describe('Model Builder > ModelCosmos', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockDatabase: jest.Mocked<Database>;
  let mockContainer: jest.Mocked<Container>;
  let testSchema: CosmosSchema;
  let model: ModelCosmos;

  beforeEach(() => {
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
      email: { type: 'string', nullable: true, indexed: true },
      isActive: { type: 'boolean', nullable: false, indexed: true },
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

  describe('constructor', () => {
    it('should create a model with all properties', () => {
      expect(model.name).toBe('users');
      expect(model.getDatabaseName()).toBe('testDatabase');
      expect(model.getContainerName()).toBe('usersContainer');
      expect(model.getPartitionKeyPath()).toBe('/userId');
      expect(model.getAttributes()).toEqual(testSchema);
    });

    it('should accept override type converter', () => {
      const overrideConverter = jest.fn();
      const modelWithOverride = new ModelCosmos(
        mockCosmosClient,
        'test',
        'db',
        'container',
        '/id',
        testSchema,
        overrideConverter,
      );

      expect(modelWithOverride.overrideTypeConverter).toBe(overrideConverter);
    });

    it('should accept enableCount flag', () => {
      const modelWithCount = new ModelCosmos(
        mockCosmosClient,
        'test',
        'db',
        'container',
        '/id',
        testSchema,
        undefined,
        true,
      );

      expect(modelWithCount.enableCount).toBe(true);
    });

    it('should initialize container reference', () => {
      expect(mockCosmosClient.database).toHaveBeenCalledWith('testDatabase');
      expect(mockDatabase.container).toHaveBeenCalledWith('usersContainer');
    });
  });

  describe('create', () => {
    it('should create single record', async () => {
      const newRecord = { name: 'Alice', age: 30, email: 'alice@example.com' };

      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: { id: 'generated-id-1', ...newRecord },
      });

      const result = await model.create([newRecord]);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id');
      expect(result[0].name).toBe('Alice');
      expect(mockContainer.items.create).toHaveBeenCalledTimes(1);
    });

    it('should create multiple records', async () => {
      const records = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
        { name: 'Charlie', age: 35 },
      ];

      (mockContainer.items.create as jest.Mock).mockImplementation(item =>
        Promise.resolve({
          resource: { id: `id-${item.name}`, ...item },
        } as any),
      );

      const result = await model.create(records);

      expect(result).toHaveLength(3);
      expect(mockContainer.items.create).toHaveBeenCalledTimes(3);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Bob');
      expect(result[2].name).toBe('Charlie');
    });

    it('should generate id if not provided', async () => {
      const newRecord = { name: 'Alice', age: 30 };

      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: { id: 'auto-generated', ...newRecord },
      } as any);

      await model.create([newRecord]);

      const createCall = (mockContainer.items.create as jest.Mock).mock.calls[0][0];
      expect(createCall).toHaveProperty('id');
    });

    it('should use provided id', async () => {
      const newRecord = { id: 'custom-id', name: 'Alice', age: 30 };

      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: newRecord,
      } as any);

      await model.create([newRecord]);

      const createCall = (mockContainer.items.create as jest.Mock).mock.calls[0][0];
      expect(createCall.id).toBe('custom-id');
    });

    it('should add createdAt timestamp if schema includes it', async () => {
      const schemaWithTimestamp = {
        ...testSchema,
        createdAt: { type: 'date', nullable: false, indexed: true },
      };

      const modelWithTimestamp = new ModelCosmos(
        mockCosmosClient,
        'users',
        'testDatabase',
        'usersContainer',
        '/userId',
        schemaWithTimestamp,
      );

      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: { id: '1', name: 'Alice', createdAt: new Date().toISOString() },
      } as any);

      const newRecord = { name: 'Alice', age: 30 };
      await modelWithTimestamp.create([newRecord]);

      const createCall = (mockContainer.items.create as jest.Mock).mock.calls[0][0];
      expect(createCall).toHaveProperty('createdAt');
    });

    it('should serialize result', async () => {
      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: {
          id: '1',
          name: 'Alice',
          createdAt: new Date('2023-01-15'),
        },
      } as any);

      const result = await model.create([{ name: 'Alice' }]);

      expect(typeof result[0].createdAt).toBe('string');
    });
  });

  describe('update', () => {
    it('should update records by ids', async () => {
      const mockItems = [
        { id: '1', userId: 'user1', name: 'Alice', age: 30 },
        { id: '2', userId: 'user2', name: 'Bob', age: 25 },
      ];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockItems }),
      }) as any;

      const mockReplace = jest.fn().mockResolvedValue({});
      mockContainer.item.mockImplementation(
        () =>
          ({
            replace: mockReplace,
          } as any),
      );

      const patch = { age: 31 };
      await model.update(['1', '2'], patch);

      expect(mockContainer.items.query).toHaveBeenCalled();
      expect(mockReplace).toHaveBeenCalledTimes(2);
      expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ id: '1', age: 31 }));
    });

    it('should extract partition key from items', async () => {
      const mockItems = [{ id: '1', userId: 'user1', name: 'Alice' }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockItems }),
      }) as any;

      const mockReplace = jest.fn().mockResolvedValue({});
      mockContainer.item.mockImplementation(
        () =>
          ({
            replace: mockReplace,
          } as any),
      );

      await model.update(['1'], { name: 'Alice Updated' });

      expect(mockContainer.item).toHaveBeenCalledWith('1', 'user1');
    });

    it('should handle nested partition key paths', async () => {
      const nestedModel = new ModelCosmos(
        mockCosmosClient,
        'orders',
        'testDatabase',
        'ordersContainer',
        '/customer/id',
        testSchema,
      );

      const mockItems = [{ id: '1', customer: { id: 'cust1' }, total: 100 }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockItems }),
      }) as any;

      const mockReplace = jest.fn().mockResolvedValue({});
      mockContainer.item.mockImplementation(
        () =>
          ({
            replace: mockReplace,
          } as any),
      );

      await nestedModel.update(['1'], { total: 150 });

      expect(mockContainer.item).toHaveBeenCalledWith('1', 'cust1');
    });

    it('should merge patch with existing item', async () => {
      const existingItem = {
        id: '1',
        userId: 'user1',
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [existingItem] }),
      }) as any;

      const mockReplace = jest.fn().mockResolvedValue({});
      mockContainer.item.mockImplementation(
        () =>
          ({
            replace: mockReplace,
          } as any),
      );

      const patch = { age: 31, email: 'alice.new@example.com' };
      await model.update(['1'], patch);

      expect(mockReplace).toHaveBeenCalledWith({
        id: '1',
        userId: 'user1',
        name: 'Alice',
        age: 31,
        email: 'alice.new@example.com',
      });
    });
  });

  describe('delete', () => {
    it('should delete records by ids', async () => {
      const mockItems = [
        { id: '1', userId: 'user1', name: 'Alice' },
        { id: '2', userId: 'user2', name: 'Bob' },
      ];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockItems }),
      }) as any;

      const mockDelete = jest.fn().mockResolvedValue({});
      mockContainer.item.mockImplementation(
        () =>
          ({
            delete: mockDelete,
          } as any),
      );

      await model.delete(['1', '2']);

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockContainer.item).toHaveBeenCalledWith('1', 'user1');
      expect(mockContainer.item).toHaveBeenCalledWith('2', 'user2');
    });

    it('should extract partition keys correctly', async () => {
      const mockItems = [{ id: '1', userId: 'user1', name: 'Alice' }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockItems }),
      }) as any;

      const mockDelete = jest.fn().mockResolvedValue({});
      mockContainer.item.mockImplementation(
        () =>
          ({
            delete: mockDelete,
          } as any),
      );

      await model.delete(['1']);

      expect(mockContainer.item).toHaveBeenCalledWith('1', 'user1');
    });

    it('should handle empty id array', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      }) as any;

      await model.delete([]);

      expect(mockContainer.items.query).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should execute query and return results', async () => {
      const mockResults = [
        { id: '1', name: 'Alice', age: 30 },
        { id: '2', name: 'Bob', age: 25 },
      ];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.age > @minAge',
        parameters: [{ name: '@minAge', value: 20 }],
      };

      const results = await model.query(querySpec);

      expect(results).toEqual(mockResults);
      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, {
        maxItemCount: undefined,
      });
    });

    it('should apply limit', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, undefined, 10);

      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, { maxItemCount: 10 });
    });

    it('should apply offset by slicing results', async () => {
      const mockResults = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' },
        { id: '4', name: 'David' },
      ];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const results = await model.query({ query: 'SELECT * FROM c' }, 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('3');
      expect(results[1].id).toBe('4');
    });

    it('should apply both offset and limit', async () => {
      const mockResults = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const results = await model.query({ query: 'SELECT * FROM c' }, 1, 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('2');
      expect(results[1].id).toBe('3');
    });

    it('should serialize results', async () => {
      const mockResults = [{ id: '1', createdAt: new Date('2023-01-15') }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const results = await model.query({ query: 'SELECT * FROM c' });

      expect(typeof results[0].createdAt).toBe('string');
    });
  });

  describe('aggregateQuery', () => {
    it('should execute aggregation query', async () => {
      const mockResults = [
        { groupKey: 'active', value: 42 },
        { groupKey: 'inactive', value: 15 },
      ];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const querySpec = {
        query: 'SELECT c.status as groupKey, COUNT(1) as value FROM c GROUP BY c.status',
      };

      const results = await model.aggregateQuery(querySpec);

      expect(results).toEqual(mockResults);
      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec);
    });

    it('should serialize aggregation results', async () => {
      const mockResults = [{ groupKey: '2023-01', value: 100, date: new Date('2023-01-01') }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const results = await model.aggregateQuery({ query: 'SELECT * FROM c' });

      expect(typeof results[0].date).toBe('string');
    });
  });

  describe('count', () => {
    it('should count all records without filter', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [150] }),
      }) as any;

      const count = await model.count();

      expect(count).toBe(150);
      expect(mockContainer.items.query).toHaveBeenCalledWith({
        query: 'SELECT VALUE COUNT(1) FROM c',
      });
    });

    it('should count with filter', async () => {
      const mockResults = [{ id: '1' }, { id: '2' }, { id: '3' }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const querySpec = {
        query: 'SELECT * FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: 'active' }],
      };

      const count = await model.count(querySpec);

      expect(count).toBe(3);
    });

    it('should return 0 for empty results', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
      }) as any;

      const count = await model.count();

      expect(count).toBe(0);
    });
  });

  describe('getAttributes', () => {
    it('should return schema', () => {
      const attributes = model.getAttributes();
      expect(attributes).toEqual(testSchema);
    });
  });

  describe('getContainer', () => {
    it('should return container reference', () => {
      const container = model.getContainer();
      expect(container).toBe(mockContainer);
    });
  });

  describe('getPartitionKeyPath', () => {
    it('should return partition key path', () => {
      expect(model.getPartitionKeyPath()).toBe('/userId');
    });
  });

  describe('getDatabaseName', () => {
    it('should return database name', () => {
      expect(model.getDatabaseName()).toBe('testDatabase');
    });
  });

  describe('getContainerName', () => {
    it('should return container name', () => {
      expect(model.getContainerName()).toBe('usersContainer');
    });
  });

  describe('generateId', () => {
    it('should generate unique ids', async () => {
      const ids = new Set();

      (mockContainer.items.create as jest.Mock).mockImplementation(item =>
        Promise.resolve({ resource: item } as any),
      );

      // Create multiple records to test id generation
      await model.create([{}, {}, {}, {}, {}]);

      const { calls } = (mockContainer.items.create as jest.Mock).mock;
      calls.forEach(call => {
        const { id } = call[0];
        expect(id).toBeDefined();
        expect(ids.has(id)).toBe(false);
        ids.add(id);
      });

      expect(ids.size).toBe(5);
    });

    it('should generate ids with timestamp and random component', async () => {
      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: { id: 'test' },
      } as any);

      await model.create([{}]);

      const generatedId = (mockContainer.items.create as jest.Mock).mock.calls[0][0].id;

      // Should match pattern: timestamp-randomstring
      expect(generatedId).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('partition key extraction', () => {
    it('should extract simple partition key', async () => {
      const simpleModel = new ModelCosmos(
        mockCosmosClient,
        'test',
        'db',
        'container',
        '/id',
        testSchema,
      );

      const item = { id: '123', name: 'Test' };
      const partitionKey = (simpleModel as any).getPartitionKeyValue(item);

      expect(partitionKey).toBe('123');
    });

    it('should extract nested partition key', async () => {
      const nestedModel = new ModelCosmos(
        mockCosmosClient,
        'test',
        'db',
        'container',
        '/user/id',
        testSchema,
      );

      const item = { id: '123', user: { id: 'user456', name: 'Alice' } };
      const partitionKey = (nestedModel as any).getPartitionKeyValue(item);

      expect(partitionKey).toBe('user456');
    });

    it('should handle multi-level nested partition key', async () => {
      const deepModel = new ModelCosmos(
        mockCosmosClient,
        'test',
        'db',
        'container',
        '/customer/address/city',
        testSchema,
      );

      const item = {
        id: '123',
        customer: {
          name: 'Alice',
          address: {
            city: 'New York',
            state: 'NY',
          },
        },
      };

      const partitionKey = (deepModel as any).getPartitionKeyValue(item);

      expect(partitionKey).toBe('New York');
    });

    it('should handle partition key with leading slash', async () => {
      const item = { userId: 'user123', name: 'Alice' };
      const partitionKey = (model as any).getPartitionKeyValue(item);

      expect(partitionKey).toBe('user123');
    });
  });
});
