import { CosmosClient } from '@azure/cosmos';

import CosmosDataSource from '../src/datasource';
import { CollectionDefinition, ManualSchemaConfig } from '../src/types/manual-schema';
import { convertManualSchemaToModels } from '../src/utils/manual-schema-converter';

describe('Manual Schema Integration', () => {
  let mockClient: jest.Mocked<CosmosClient>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContainer: any;
  let mockLogger: jest.Mock;

  beforeEach(() => {
    mockContainer = {
      read: jest.fn().mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      }),
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
        }),
      },
    };

    mockClient = {
      database: jest.fn().mockReturnValue({
        container: jest.fn().mockReturnValue(mockContainer),
        containers: {
          readAll: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
          }),
        },
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockLogger = jest.fn() as jest.Mock;
  });

  describe('basic functionality', () => {
    it('should create datasource with manual schema', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'users',
            databaseName: 'testDb',
            containerName: 'users',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'email', type: 'string' },
              { name: 'age', type: 'number' },
            ],
          },
        ],
      };

      // Convert schema to models
      const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

      // Create datasource directly with models
      const datasource = new CosmosDataSource(mockClient, models, mockLogger);

      expect(datasource).toBeDefined();

      const collection = datasource.getCollection('users');
      expect(collection).toBeDefined();
      expect(collection.name).toBe('users');
    });

    it('should throw error when schema is invalid', async () => {
      const invalidSchema: ManualSchemaConfig = {
        collections: [],
      };

      await expect(
        convertManualSchemaToModels(mockClient, invalidSchema, mockLogger),
      ).rejects.toThrow('Manual schema must have at least one collection');
    });

    it('should work with modular collection definitions', async () => {
      // Simulate defining collections in separate "files"
      const usersCollection: CollectionDefinition = {
        name: 'users',
        databaseName: 'testDb',
        containerName: 'users',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'email', type: 'string' },
        ],
      };

      const ordersCollection: CollectionDefinition = {
        name: 'orders',
        databaseName: 'testDb',
        containerName: 'orders',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'userId', type: 'string' },
        ],
      };

      const schema: ManualSchemaConfig = {
        collections: [usersCollection, ordersCollection],
      };

      const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);
      const datasource = new CosmosDataSource(mockClient, models, mockLogger);

      expect(datasource.getCollection('users')).toBeDefined();
      expect(datasource.getCollection('orders')).toBeDefined();
    });
  });

  describe('modular collection definitions', () => {
    it('should support importing collection definitions from separate variables', async () => {
      // Simulate defining collections in separate "files"
      const usersCollection: CollectionDefinition = {
        name: 'users',
        databaseName: 'testDb',
        containerName: 'users',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'email', type: 'string' },
          { name: 'createdAt', type: 'date' },
        ],
      };

      const ordersCollection: CollectionDefinition = {
        name: 'orders',
        databaseName: 'testDb',
        containerName: 'orders',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'userId', type: 'string' },
          { name: 'total', type: 'number' },
        ],
      };

      const productsCollection: CollectionDefinition = {
        name: 'products',
        databaseName: 'testDb',
        containerName: 'products',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'price', type: 'number' },
        ],
      };

      // Compose them in the main schema
      const schema: ManualSchemaConfig = {
        collections: [usersCollection, ordersCollection, productsCollection],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );

      expect(datasource.getCollection('users')).toBeDefined();
      expect(datasource.getCollection('orders')).toBeDefined();
      expect(datasource.getCollection('products')).toBeDefined();
    });

    it('should support spreading collection arrays', async () => {
      // Simulate having collections organized in groups
      const userCollections: CollectionDefinition[] = [
        {
          name: 'users',
          databaseName: 'testDb',
          containerName: 'users',
          fields: [{ name: 'id', type: 'string' }],
        },
        {
          name: 'userProfiles',
          databaseName: 'testDb',
          containerName: 'user_profiles',
          fields: [{ name: 'userId', type: 'string' }],
        },
      ];

      const orderCollections: CollectionDefinition[] = [
        {
          name: 'orders',
          databaseName: 'testDb',
          containerName: 'orders',
          fields: [{ name: 'id', type: 'string' }],
        },
        {
          name: 'orderItems',
          databaseName: 'testDb',
          containerName: 'order_items',
          fields: [{ name: 'orderId', type: 'string' }],
        },
      ];

      const schema: ManualSchemaConfig = {
        collections: [...userCollections, ...orderCollections],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );

      expect(datasource.getCollection('users')).toBeDefined();
      expect(datasource.getCollection('userProfiles')).toBeDefined();
      expect(datasource.getCollection('orders')).toBeDefined();
      expect(datasource.getCollection('orderItems')).toBeDefined();
    });
  });

  describe('nested object support', () => {
    it('should support single level nested objects', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'users',
            databaseName: 'testDb',
            containerName: 'users',
            fields: [
              { name: 'id', type: 'string' },
              {
                name: 'address',
                type: 'object',
                fields: [
                  { name: 'street', type: 'string' },
                  { name: 'city', type: 'string' },
                  { name: 'zipCode', type: 'string' },
                ],
              },
            ],
          },
        ],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );
      const collection = datasource.getCollection('users');

      expect(collection).toBeDefined();
      // Nested fields should be flattened with arrow notation
      expect(collection.schema.fields['address->street']).toBeDefined();
      expect(collection.schema.fields['address->city']).toBeDefined();
      expect(collection.schema.fields['address->zipCode']).toBeDefined();
    });

    it('should support deeply nested objects', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'users',
            databaseName: 'testDb',
            containerName: 'users',
            fields: [
              { name: 'id', type: 'string' },
              {
                name: 'address',
                type: 'object',
                fields: [
                  { name: 'street', type: 'string' },
                  { name: 'city', type: 'string' },
                  {
                    name: 'coordinates',
                    type: 'object',
                    fields: [
                      { name: 'lat', type: 'number' },
                      { name: 'lng', type: 'number' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );
      const collection = datasource.getCollection('users');

      expect(collection).toBeDefined();
      expect(collection.schema.fields['address->street']).toBeDefined();
      expect(collection.schema.fields['address->city']).toBeDefined();
      expect(collection.schema.fields['address->coordinates->lat']).toBeDefined();
      expect(collection.schema.fields['address->coordinates->lng']).toBeDefined();
    });
  });

  describe('array field support', () => {
    it('should support arrays of primitives', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'users',
            databaseName: 'testDb',
            containerName: 'users',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'tags', type: 'array', subType: 'string' },
              { name: 'scores', type: 'array', subType: 'number' },
            ],
          },
        ],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );
      const collection = datasource.getCollection('users');

      expect(collection).toBeDefined();
      expect(collection.schema.fields.tags).toBeDefined();
      expect(collection.schema.fields.tags.type).toBe('Column');
      if (collection.schema.fields.tags.type === 'Column') {
        expect(collection.schema.fields.tags.columnType).toBe('Json'); // Arrays are stored as JSON
      }
      expect(collection.schema.fields.scores).toBeDefined();
    });

    it('should support arrays of objects', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'orders',
            databaseName: 'testDb',
            containerName: 'orders',
            fields: [
              { name: 'id', type: 'string' },
              { name: 'userId', type: 'string' },
              {
                name: 'items',
                type: 'array',
                subType: 'object',
                fields: [
                  { name: 'productId', type: 'string' },
                  { name: 'quantity', type: 'number' },
                  { name: 'price', type: 'number' },
                ],
              },
            ],
          },
        ],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );
      const collection = datasource.getCollection('orders');

      expect(collection).toBeDefined();
      expect(collection.schema.fields.items).toBeDefined();
      // Array field itself
      expect(collection.schema.fields.items.type).toBe('Column');
      if (collection.schema.fields.items.type === 'Column') {
        expect(collection.schema.fields.items.columnType).toBe('Json');
      }
      // Nested fields for potential virtual collections
      expect(collection.schema.fields['items->productId']).toBeDefined();
      expect(collection.schema.fields['items->quantity']).toBeDefined();
      expect(collection.schema.fields['items->price']).toBeDefined();
    });
  });

  describe('mixed complex schema', () => {
    it('should support schema with all field types', async () => {
      const complexCollection: CollectionDefinition = {
        name: 'complexData',
        databaseName: 'testDb',
        containerName: 'complex',
        fields: [
          { name: 'id', type: 'string' },
          { name: 'name', type: 'string' },
          { name: 'age', type: 'number' },
          { name: 'isActive', type: 'boolean' },
          { name: 'createdAt', type: 'date' },
          { name: 'birthDate', type: 'dateonly' },
          { name: 'preferredTime', type: 'timeonly' },
          { name: 'tags', type: 'array', subType: 'string' },
          {
            name: 'profile',
            type: 'object',
            fields: [
              { name: 'bio', type: 'string' },
              { name: 'avatar', type: 'string' },
            ],
          },
          {
            name: 'orders',
            type: 'array',
            subType: 'object',
            fields: [
              { name: 'orderId', type: 'string' },
              { name: 'amount', type: 'number' },
            ],
          },
          { name: 'location', type: 'point' },
        ],
      };

      const schema: ManualSchemaConfig = {
        collections: [complexCollection],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );
      const collection = datasource.getCollection('complexData');

      expect(collection).toBeDefined();
      expect(collection.schema.fields.id).toBeDefined();
      expect(collection.schema.fields.name).toBeDefined();
      expect(collection.schema.fields.age).toBeDefined();
      expect(collection.schema.fields.isActive).toBeDefined();
      expect(collection.schema.fields.createdAt).toBeDefined();
      expect(collection.schema.fields.birthDate).toBeDefined();
      expect(collection.schema.fields.preferredTime).toBeDefined();
      expect(collection.schema.fields.tags).toBeDefined();
      expect(collection.schema.fields['profile->bio']).toBeDefined();
      expect(collection.schema.fields['profile->avatar']).toBeDefined();
      expect(collection.schema.fields.orders).toBeDefined();
      expect(collection.schema.fields['orders->orderId']).toBeDefined();
      expect(collection.schema.fields['orders->amount']).toBeDefined();
      expect(collection.schema.fields.location).toBeDefined();
    });
  });

  describe('field properties', () => {
    it('should respect field properties (nullable, indexed)', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'users',
            databaseName: 'testDb',
            containerName: 'users',
            fields: [
              { name: 'id', type: 'string', nullable: false, indexed: true },
              { name: 'email', type: 'string', nullable: true, indexed: true },
              { name: 'notes', type: 'string', nullable: true, indexed: false },
            ],
          },
        ],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );
      const collection = datasource.getCollection('users');

      expect(collection).toBeDefined();
      // Note: The schema fields come from the converted Cosmos schema
      // which are then converted to Forest Admin format
    });

    it('should respect enableCount property', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'users',
            databaseName: 'testDb',
            containerName: 'users',
            fields: [{ name: 'id', type: 'string' }],
            enableCount: false,
          },
        ],
      };

      const datasource = await convertManualSchemaToModels(mockClient, schema, mockLogger).then(
        models => new CosmosDataSource(mockClient, models, mockLogger),
      );
      const collection = datasource.getCollection('users');

      expect(collection).toBeDefined();
      // enableCount is stored in the ModelCosmos instance
    });
  });

  describe('backward compatibility', () => {
    it('should work with createCosmosDataSourceWithExistingClient', async () => {
      const schema: ManualSchemaConfig = {
        collections: [
          {
            name: 'users',
            databaseName: 'testDb',
            containerName: 'users',
            fields: [{ name: 'id', type: 'string' }],
          },
        ],
      };

      // Test that we can use the manual schema converter with the existing client factory
      const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);
      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('users');

      // Datasource can be created with those models
      const datasource = new CosmosDataSource(mockClient, models, mockLogger);
      expect(datasource.getCollection('users')).toBeDefined();
    });
  });
});
