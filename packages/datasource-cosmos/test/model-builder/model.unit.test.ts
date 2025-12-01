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
    it('should update records using point reads and writes', async () => {
      const existingItems = [
        { id: '1', userId: 'user1', name: 'Alice', age: 30 },
        { id: '2', userId: 'user2', name: 'Bob', age: 25 },
      ];

      const mockRead = jest.fn();
      const mockReplace = jest.fn().mockResolvedValue({});

      // Setup mock to return different items based on id
      (mockContainer.item as jest.Mock).mockImplementation((id: string) => ({
        read: mockRead.mockResolvedValueOnce({
          resource: existingItems.find(item => item.id === id),
        }),
        replace: mockReplace,
      }));

      const patch = { age: 31 };
      await model.update(
        [
          { id: '1', partitionKey: 'user1' },
          { id: '2', partitionKey: 'user2' },
        ],
        patch,
      );

      // Should use point reads (id + partition key)
      expect(mockContainer.item).toHaveBeenCalledWith('1', 'user1');
      expect(mockContainer.item).toHaveBeenCalledWith('2', 'user2');
      expect(mockReplace).toHaveBeenCalledTimes(2);
      expect(mockReplace).toHaveBeenCalledWith(expect.objectContaining({ id: '1', age: 31 }));
    });

    it('should use partition key for point operations', async () => {
      const existingItem = { id: '1', userId: 'user1', name: 'Alice' };

      const mockRead = jest.fn().mockResolvedValue({ resource: existingItem });
      const mockReplace = jest.fn().mockResolvedValue({});
      (mockContainer.item as jest.Mock).mockImplementation(() => ({
        read: mockRead,
        replace: mockReplace,
      }));

      await model.update([{ id: '1', partitionKey: 'user1' }], { name: 'Alice Updated' });

      // Verify point read was used with correct partition key
      expect(mockContainer.item).toHaveBeenCalledWith('1', 'user1');
    });

    it('should skip items that are not found', async () => {
      const mockRead = jest.fn().mockResolvedValue({ resource: undefined });
      const mockReplace = jest.fn().mockResolvedValue({});
      (mockContainer.item as jest.Mock).mockImplementation(() => ({
        read: mockRead,
        replace: mockReplace,
      }));

      await model.update([{ id: 'nonexistent', partitionKey: 'pk' }], { name: 'Test' });

      expect(mockRead).toHaveBeenCalled();
      expect(mockReplace).not.toHaveBeenCalled();
    });

    it('should merge patch with existing item', async () => {
      const existingItem = {
        id: '1',
        userId: 'user1',
        name: 'Alice',
        age: 30,
        email: 'alice@example.com',
      };

      const mockRead = jest.fn().mockResolvedValue({ resource: existingItem });
      const mockReplace = jest.fn().mockResolvedValue({});
      (mockContainer.item as jest.Mock).mockImplementation(() => ({
        read: mockRead,
        replace: mockReplace,
      }));

      const patch = { age: 31, email: 'alice.new@example.com' };
      await model.update([{ id: '1', partitionKey: 'user1' }], patch);

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
    it('should delete records using point deletes', async () => {
      const mockDelete = jest.fn().mockResolvedValue({});
      (mockContainer.item as jest.Mock).mockImplementation(() => ({
        delete: mockDelete,
      }));

      await model.delete([
        { id: '1', partitionKey: 'user1' },
        { id: '2', partitionKey: 'user2' },
      ]);

      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockContainer.item).toHaveBeenCalledWith('1', 'user1');
      expect(mockContainer.item).toHaveBeenCalledWith('2', 'user2');
    });

    it('should use partition key for point delete operations', async () => {
      const mockDelete = jest.fn().mockResolvedValue({});
      (mockContainer.item as jest.Mock).mockImplementation(() => ({
        delete: mockDelete,
      }));

      await model.delete([{ id: '1', partitionKey: 'user1' }]);

      expect(mockContainer.item).toHaveBeenCalledWith('1', 'user1');
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });

    it('should handle empty array', async () => {
      const mockDelete = jest.fn().mockResolvedValue({});
      (mockContainer.item as jest.Mock).mockImplementation(() => ({
        delete: mockDelete,
      }));

      await model.delete([]);

      expect(mockDelete).not.toHaveBeenCalled();
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
      // Should use fetchAll when no pagination parameters (with empty options)
      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, {});
    });

    it('should apply limit', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }, { id: '2' }] };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      const results = await model.query(querySpec, undefined, 10);

      // Note: Page size is optimized to be between 100 and 1000 for efficiency
      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, { maxItemCount: 100 });
      expect(results).toHaveLength(2);
    });

    it('should apply offset by slicing results', async () => {
      const mockResults = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
        { id: '3', name: 'Charlie' },
        { id: '4', name: 'David' },
      ];

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: mockResults };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const results = await model.query({ query: 'SELECT * FROM c' }, 2);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('3');
      expect(results[1].id).toBe('4');
    });

    it('should apply both offset and limit', async () => {
      const mockResults = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }];

      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: mockResults };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
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

    it('should pass partition key to query options when provided', async () => {
      const mockResults = [{ id: '1', tenantId: 'tenant-123' }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c WHERE c.tenantId = @param0' };
      await model.query(querySpec, undefined, undefined, 'tenant-123');

      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, {
        partitionKey: 'tenant-123',
      });
    });

    it('should pass partition key with pagination options', async () => {
      const mockAsyncIterator = {
        async *[Symbol.asyncIterator]() {
          yield { resources: [{ id: '1' }, { id: '2' }] };
        },
      };

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        getAsyncIterator: jest.fn().mockReturnValue(mockAsyncIterator),
      }) as any;

      const querySpec = { query: 'SELECT * FROM c' };
      await model.query(querySpec, 0, 10, 'tenant-456');

      // Note: Page size is optimized to be between 100 and 1000 for efficiency
      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, {
        maxItemCount: 100,
        partitionKey: 'tenant-456',
      });
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
      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, {});
    });

    it('should serialize aggregation results', async () => {
      const mockResults = [{ groupKey: '2023-01', value: 100, date: new Date('2023-01-01') }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const results = await model.aggregateQuery({ query: 'SELECT * FROM c' });

      expect(typeof results[0].date).toBe('string');
    });

    it('should pass partition key to aggregation query', async () => {
      const mockResults = [{ groupKey: 'active', value: 10 }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const querySpec = {
        query: 'SELECT c.status as groupKey, COUNT(1) as value FROM c GROUP BY c.status',
      };

      const results = await model.aggregateQuery(querySpec, 'tenant-123');

      expect(results).toEqual(mockResults);
      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, {
        partitionKey: 'tenant-123',
      });
    });

    it('should pass numeric partition key to aggregation query', async () => {
      const mockResults = [{ value: 500 }];

      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: mockResults }),
      }) as any;

      const querySpec = { query: 'SELECT SUM(c.amount) as value FROM c' };

      await model.aggregateQuery(querySpec, 42);

      expect(mockContainer.items.query).toHaveBeenCalledWith(querySpec, {
        partitionKey: 42,
      });
    });
  });

  describe('count', () => {
    it('should count all records without filter', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [150] }),
      }) as any;

      const count = await model.count();

      expect(count).toBe(150);
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        { query: 'SELECT VALUE COUNT(1) FROM c' },
        {},
      );
    });

    it('should convert filter query to COUNT query', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [42] }),
      }) as any;

      const querySpec = {
        query: 'SELECT c FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: 'active' }],
      };

      const count = await model.count(querySpec);

      expect(count).toBe(42);
      // Should convert to COUNT query instead of fetching all records
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        {
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status',
          parameters: [{ name: '@status', value: 'active' }],
        },
        {},
      );
    });

    it('should handle query with ORDER BY clause', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [25] }),
      }) as any;

      const querySpec = {
        query: 'SELECT c FROM c WHERE c.age > @age ORDER BY c.name ASC',
        parameters: [{ name: '@age', value: 18 }],
      };

      const count = await model.count(querySpec);

      expect(count).toBe(25);
      // Should strip ORDER BY and convert to COUNT
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        {
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.age > @age',
          parameters: [{ name: '@age', value: 18 }],
        },
        {},
      );
    });

    it('should pass partition key to count query', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [10] }),
      }) as any;

      const count = await model.count(undefined, 'tenant-123');

      expect(count).toBe(10);
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        { query: 'SELECT VALUE COUNT(1) FROM c' },
        { partitionKey: 'tenant-123' },
      );
    });

    it('should pass partition key with filter query', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [5] }),
      }) as any;

      const querySpec = {
        query: 'SELECT c FROM c WHERE c.status = @status',
        parameters: [{ name: '@status', value: 'active' }],
      };

      const count = await model.count(querySpec, 'tenant-456');

      expect(count).toBe(5);
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        {
          query: 'SELECT VALUE COUNT(1) FROM c WHERE c.status = @status',
          parameters: [{ name: '@status', value: 'active' }],
        },
        { partitionKey: 'tenant-456' },
      );
    });

    it('should return 0 for empty results', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [0] }),
      }) as any;

      const count = await model.count();

      expect(count).toBe(0);
    });

    it('should handle query without WHERE clause', async () => {
      (mockContainer.items.query as jest.Mock) = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: [100] }),
      }) as any;

      const querySpec = {
        query: 'SELECT c FROM c ORDER BY c.name ASC',
        parameters: [],
      };

      const count = await model.count(querySpec);

      expect(count).toBe(100);
      expect(mockContainer.items.query).toHaveBeenCalledWith(
        {
          query: 'SELECT VALUE COUNT(1) FROM c',
          parameters: [],
        },
        {},
      );
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

  describe('getCosmosClient', () => {
    it('should return cosmos client', () => {
      expect(model.getCosmosClient()).toBe(mockCosmosClient);
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

    it('should generate ids with UUID v4 format', async () => {
      (mockContainer.items.create as jest.Mock).mockResolvedValue({
        resource: { id: 'test' },
      } as any);

      await model.create([{}]);

      const generatedId = (mockContainer.items.create as jest.Mock).mock.calls[0][0].id;

      // Should match UUID v4 pattern: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      expect(generatedId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
  });
});
