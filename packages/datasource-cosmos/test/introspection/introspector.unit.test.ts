/* eslint-disable @typescript-eslint/no-explicit-any */
import { CosmosClient } from '@azure/cosmos';

import Introspector from '../../src/introspection/introspector';
import ModelCosmos from '../../src/model-builder/model';

describe('Introspection > Introspector', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockLogger: jest.Mock;
  let mockDatabase: any;
  let mockContainers: any;

  beforeEach(() => {
    mockLogger = jest.fn();

    mockContainers = {
      readAll: jest.fn(),
    };

    mockDatabase = {
      containers: mockContainers,
      container: jest.fn(),
    };

    mockCosmosClient = {
      database: jest.fn().mockReturnValue(mockDatabase),
    } as any;
  });

  describe('introspect', () => {
    it('should introspect all containers in a database', async () => {
      const containerList = [{ id: 'users' }, { id: 'products' }, { id: 'orders' }];

      mockContainers.readAll.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: containerList,
        }),
      });

      // Mock each container's read and query
      mockDatabase.container.mockImplementation(() => ({
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/id'] },
          },
        }),
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({
              resources: [{ id: '1', name: 'Test' }],
            }),
          }),
        },
      }));

      const models = await Introspector.introspect(mockCosmosClient, 'testDatabase', mockLogger);

      expect(models).toHaveLength(3);
      expect(models[0]).toBeInstanceOf(ModelCosmos);
      expect(models[1]).toBeInstanceOf(ModelCosmos);
      expect(models[2]).toBeInstanceOf(ModelCosmos);

      expect(mockLogger).toHaveBeenCalledWith('Info', 'Introspector - Introspect Cosmos DB');
      expect(mockLogger).toHaveBeenCalledWith(
        'Info',
        "Introspector - Found 3 containers in database 'testDatabase'",
      );
      expect(mockLogger).toHaveBeenCalledWith(
        'Info',
        'Introspector - The following containers have been loaded: users, products, orders',
      );
    });

    it('should filter out system containers starting with underscore', async () => {
      const containerList = [
        { id: 'users' },
        { id: '_system' },
        { id: 'products' },
        { id: '_metadata' },
      ];

      mockContainers.readAll.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: containerList,
        }),
      });

      mockDatabase.container.mockImplementation(() => ({
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/id'] },
          },
        }),
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({
              resources: [{ id: '1' }],
            }),
          }),
        },
      }));

      const models = await Introspector.introspect(mockCosmosClient, 'testDatabase', mockLogger);

      expect(models).toHaveLength(2);
      expect(models.map(m => m.name)).toEqual(['users', 'products']);

      expect(mockLogger).toHaveBeenCalledWith(
        'Info',
        "Introspector - Found 2 containers in database 'testDatabase'",
      );
    });

    it('should handle empty database', async () => {
      mockContainers.readAll.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      const models = await Introspector.introspect(mockCosmosClient, 'emptyDatabase', mockLogger);

      expect(models).toHaveLength(0);
      expect(mockLogger).toHaveBeenCalledWith(
        'Info',
        "Introspector - Found 0 containers in database 'emptyDatabase'",
      );
    });

    it('should log warnings for failed container introspections', async () => {
      const containerList = [{ id: 'valid' }, { id: 'failing' }];

      mockContainers.readAll.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: containerList,
        }),
      });

      mockDatabase.container.mockImplementation((_name: string) => {
        if (_name === 'failing') {
          return {
            read: jest.fn().mockRejectedValue(new Error('Container not accessible')),
            items: {
              query: jest.fn(),
            },
          };
        }

        return {
          read: jest.fn().mockResolvedValue({
            resource: {
              partitionKey: { paths: ['/id'] },
            },
          }),
          items: {
            query: jest.fn().mockReturnValue({
              fetchAll: jest.fn().mockResolvedValue({
                resources: [{ id: '1' }],
              }),
            }),
          },
        };
      });

      const models = await Introspector.introspect(mockCosmosClient, 'testDatabase', mockLogger);

      expect(models).toHaveLength(1);
      expect(models[0].name).toBe('valid');

      expect(mockLogger).toHaveBeenCalledWith(
        'Warn',
        expect.stringContaining("Introspector - Failed to introspect container 'failing'"),
      );
    });

    it('should work without logger', async () => {
      const containerList = [{ id: 'users' }];

      mockContainers.readAll.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: containerList,
        }),
      });

      mockDatabase.container.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/id'] },
          },
        }),
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({
              resources: [{ id: '1' }],
            }),
          }),
        },
      });

      const models = await Introspector.introspect(mockCosmosClient, 'testDatabase');

      expect(models).toHaveLength(1);
    });
  });

  describe('introspectContainer', () => {
    it('should introspect a specific container', async () => {
      mockDatabase.container.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/userId'] },
          },
        }),
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({
              resources: [
                { id: '1', name: 'Alice', age: 30 },
                { id: '2', name: 'Bob', age: 25 },
              ],
            }),
          }),
        },
      });

      const model = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDatabase',
        'users',
        100,
        mockLogger,
      );

      expect(model).toBeInstanceOf(ModelCosmos);
      expect(model.name).toBe('users');
      expect(model.getDatabaseName()).toBe('testDatabase');
      expect(model.getContainerName()).toBe('users');

      expect(mockLogger).toHaveBeenCalledWith(
        'Info',
        "Introspector - Introspecting container 'users'",
      );
      expect(mockLogger).toHaveBeenCalledWith(
        'Info',
        "Introspector - Successfully introspected container 'users'",
      );
    });

    it('should use custom sample size', async () => {
      const queryMock = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      mockDatabase.container.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/id'] },
          },
        }),
        items: {
          query: queryMock,
        },
      });

      await Introspector.introspectContainer(
        mockCosmosClient,
        'testDatabase',
        'users',
        250, // Custom sample size
        mockLogger,
      );

      expect(queryMock).toHaveBeenCalledWith({
        query: 'SELECT TOP 250 * FROM c',
      });
    });

    it('should default to 100 sample size when not specified', async () => {
      const queryMock = jest.fn().mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({
          resources: [],
        }),
      });

      mockDatabase.container.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/id'] },
          },
        }),
        items: {
          query: queryMock,
        },
      });

      await Introspector.introspectContainer(
        mockCosmosClient,
        'testDatabase',
        'users',
        undefined,
        mockLogger,
      );

      expect(queryMock).toHaveBeenCalledWith({
        query: 'SELECT TOP 100 * FROM c',
      });
    });

    it('should work without logger', async () => {
      mockDatabase.container.mockReturnValue({
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/id'] },
          },
        }),
        items: {
          query: jest.fn().mockReturnValue({
            fetchAll: jest.fn().mockResolvedValue({
              resources: [{ id: '1' }],
            }),
          }),
        },
      });

      const model = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDatabase',
        'users',
      );

      expect(model).toBeInstanceOf(ModelCosmos);
    });
  });
});
