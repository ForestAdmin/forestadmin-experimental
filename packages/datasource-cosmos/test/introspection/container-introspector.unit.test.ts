/* eslint-disable @typescript-eslint/no-explicit-any */
import { Container, CosmosClient } from '@azure/cosmos';

import introspectContainer from '../../src/introspection/container-introspector';
import ModelCosmos from '../../src/model-builder/model';

describe('Introspection > containerIntrospector', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockContainer: jest.Mocked<Container>;
  let mockDatabase: any;

  beforeEach(() => {
    mockContainer = {
      read: jest.fn(),
      items: {
        query: jest.fn(),
      },
    } as any;

    mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };

    mockCosmosClient = {
      database: jest.fn().mockReturnValue(mockDatabase),
    } as any;
  });

  describe('introspectContainer', () => {
    it('should introspect a container and create a model', async () => {
      // Mock container definition with partition key
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/userId'],
          },
        },
      } as any);

      // Mock sample documents
      const sampleDocuments = [
        { id: '1', name: 'Alice', age: 30, email: 'alice@example.com', isActive: true },
        { id: '2', name: 'Bob', age: 25, email: 'bob@example.com', isActive: true },
        { id: '3', name: 'Charlie', age: 35, email: 'charlie@example.com', isActive: false },
      ];

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: sampleDocuments,
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'users',
        'testDb',
        'usersContainer',
      );

      expect(model).toBeInstanceOf(ModelCosmos);
      expect(model.name).toBe('users');
      expect(mockCosmosClient.database).toHaveBeenCalledWith('testDb');
      expect(mockDatabase.container).toHaveBeenCalledWith('usersContainer');
      expect(mockContainer.read).toHaveBeenCalled();
    });

    it('should use provided partition key path', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [{ id: '1', name: 'Test' }],
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'test',
        'testDb',
        'testContainer',
        '/customKey',
        10,
      );

      expect(model).toBeInstanceOf(ModelCosmos);
      expect(model.getPartitionKeyPath()).toBe('/customKey');
    });

    it('should infer schema from sample documents', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      // Mixed type documents to test schema inference
      const sampleDocuments = [
        {
          id: '1',
          name: 'Alice',
          age: 30,
          createdAt: '2023-01-15T10:00:00Z',
          tags: ['admin', 'user'],
          settings: { theme: 'dark' },
          location: {
            type: 'Point',
            coordinates: [40.7128, -74.006],
          },
        },
        {
          id: '2',
          name: 'Bob',
          age: 25,
          createdAt: '2023-02-20T15:30:00Z',
          tags: ['user'],
          settings: { theme: 'light' },
          location: {
            type: 'Point',
            coordinates: [51.5074, -0.1278],
          },
        },
      ];

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: sampleDocuments,
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'users',
        'testDb',
        'usersContainer',
        undefined,
        100,
      );

      const schema = model.getAttributes();

      expect(schema).toHaveProperty('id');
      expect(schema.id.type).toBe('string');

      expect(schema).toHaveProperty('name');
      expect(schema.name.type).toBe('string');

      expect(schema).toHaveProperty('age');
      expect(schema.age.type).toBe('number');

      expect(schema).toHaveProperty('createdAt');
      expect(schema.createdAt.type).toBe('date');

      expect(schema).toHaveProperty('tags');
      expect(schema.tags.type).toBe('array');

      // With nested object flattening, settings is flattened to settings.theme
      expect(schema['settings.theme']).toBeDefined();
      expect(schema['settings.theme'].type).toBe('string');

      expect(schema).toHaveProperty('location');
      expect(schema.location.type).toBe('point');
    });

    it('should handle nullable fields', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      const sampleDocuments = [
        { id: '1', name: 'Alice', email: 'alice@example.com' },
        { id: '2', name: 'Bob', email: null },
        { id: '3', name: 'Charlie' }, // email missing
      ];

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: sampleDocuments,
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'users',
        'testDb',
        'usersContainer',
      );

      const schema = model.getAttributes();

      expect(schema.email).toBeDefined();
      expect(schema.email.nullable).toBe(true);
    });

    it('should skip system fields starting with underscore', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      const sampleDocuments = [
        {
          id: '1',
          name: 'Alice',
          _rid: 'system-field',
          _self: 'system-field',
          _etag: 'system-field',
          _attachments: 'system-field',
          _ts: 1234567890,
        },
      ];

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: sampleDocuments,
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'users',
        'testDb',
        'usersContainer',
      );

      const schema = model.getAttributes();

      expect(schema).toHaveProperty('id');
      expect(schema).toHaveProperty('name');
      expect(schema).not.toHaveProperty('_rid');
      expect(schema).not.toHaveProperty('_self');
      expect(schema).not.toHaveProperty('_etag');
      expect(schema).not.toHaveProperty('_attachments');
      expect(schema).not.toHaveProperty('_ts');
    });

    it('should handle empty container', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'empty',
        'testDb',
        'emptyContainer',
      );

      const schema = model.getAttributes();

      expect(schema).toEqual({});
    });

    it('should use default partition key when not specified in container', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: undefined,
          },
        },
      } as any);

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [{ id: '1' }],
        }),
      }) as any;

      const model = await introspectContainer(mockCosmosClient, 'test', 'testDb', 'testContainer');

      expect(model.getPartitionKeyPath()).toBe('/id');
    });

    it('should respect custom sample size', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      const queryMock = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      mockContainer.items.query = queryMock as any;

      await introspectContainer(
        mockCosmosClient,
        'test',
        'testDb',
        'testContainer',
        undefined,
        500, // Custom sample size
      );

      expect(queryMock).toHaveBeenCalledWith({
        query: 'SELECT TOP 500 * FROM c',
      });
    });

    it('should handle mixed types and infer most specific type', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      const sampleDocuments = [
        { id: '1', value: 'text' },
        { id: '2', value: 123 }, // Mixed type
        { id: '3', value: true }, // Mixed type
      ];

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: sampleDocuments,
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'mixed',
        'testDb',
        'mixedContainer',
      );

      const schema = model.getAttributes();

      // Mixed types should be treated as object (Json)
      expect(schema.value.type).toBe('object');
    });

    it('should pass override type converter to model', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [{ id: '1' }],
        }),
      }) as any;

      const overrideConverter = jest.fn();

      const model = await introspectContainer(
        mockCosmosClient,
        'test',
        'testDb',
        'testContainer',
        undefined,
        100,
        overrideConverter,
      );

      expect(model.overrideTypeConverter).toBe(overrideConverter);
    });

    it('should pass enableCount flag to model', async () => {
      mockContainer.read.mockResolvedValue({
        resource: {
          partitionKey: {
            paths: ['/id'],
          },
        },
      } as any);

      mockContainer.items.query = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [{ id: '1' }],
        }),
      }) as any;

      const model = await introspectContainer(
        mockCosmosClient,
        'test',
        'testDb',
        'testContainer',
        undefined,
        100,
        undefined,
        false, // enableCount = false
      );

      expect(model.enableCount).toBe(false);
    });
  });
});
