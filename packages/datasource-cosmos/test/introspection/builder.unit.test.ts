import { CosmosClient } from '@azure/cosmos';

import { CosmosDatasourceBuilder } from '../../src/introspection/builder';
import ModelCosmos from '../../src/model-builder/model';

describe('Introspection > Builder', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let builder: CosmosDatasourceBuilder;
  let mockDatabase: any;
  let mockContainer: any;

  beforeEach(() => {
    mockContainer = {
      read: jest.fn().mockResolvedValue({
        resource: {
          partitionKey: { paths: ['/id'] },
        },
      }),
      items: {
        query: jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [{ id: '1', name: 'Test', age: 30 }],
          }),
        }),
      },
    };

    mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };

    mockCosmosClient = {
      database: jest.fn().mockReturnValue(mockDatabase),
    } as any;

    builder = new CosmosDatasourceBuilder(mockCosmosClient);
  });

  describe('CosmosDatasourceBuilder', () => {
    describe('addCollectionFromContainer', () => {
      it('should add a single collection', async () => {
        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
        });

        const models = await builder.createCollectionsFromConfiguration();

        expect(models).toHaveLength(1);
        expect(models[0]).toBeInstanceOf(ModelCosmos);
        expect(models[0].name).toBe('Users');
        expect(models[0].getDatabaseName()).toBe('testDb');
        expect(models[0].getContainerName()).toBe('users');
      });

      it('should add multiple collections', async () => {
        builder
          .addCollectionFromContainer({
            name: 'Users',
            databaseName: 'testDb',
            containerName: 'users',
          })
          .addCollectionFromContainer({
            name: 'Products',
            databaseName: 'testDb',
            containerName: 'products',
          })
          .addCollectionFromContainer({
            name: 'Orders',
            databaseName: 'testDb',
            containerName: 'orders',
          });

        const models = await builder.createCollectionsFromConfiguration();

        expect(models).toHaveLength(3);
        expect(models[0].name).toBe('Users');
        expect(models[1].name).toBe('Products');
        expect(models[2].name).toBe('Orders');
      });

      it('should support method chaining', () => {
        const result = builder
          .addCollectionFromContainer({
            name: 'Users',
            databaseName: 'testDb',
            containerName: 'users',
          })
          .addCollectionFromContainer({
            name: 'Products',
            databaseName: 'testDb',
            containerName: 'products',
          });

        expect(result).toBe(builder);
      });

      it('should use custom partition key when provided', async () => {
        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
          partitionKeyPath: '/userId',
        });

        const models = await builder.createCollectionsFromConfiguration();

        expect(models[0].getPartitionKeyPath()).toBe('/userId');
      });

      it('should auto-detect partition key when not provided', async () => {
        mockContainer.read.mockResolvedValue({
          resource: {
            partitionKey: { paths: ['/customKey'] },
          },
        });

        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
          // partitionKeyPath not provided
        });

        const models = await builder.createCollectionsFromConfiguration();

        expect(models[0].getPartitionKeyPath()).toBe('/customKey');
      });

      it('should use custom sample size', async () => {
        const queryMock = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [],
          }),
        });

        mockContainer.items.query = queryMock;

        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
          sampleSize: 500,
        });

        await builder.createCollectionsFromConfiguration();

        expect(queryMock).toHaveBeenCalledWith({
          query: 'SELECT TOP 500 * FROM c',
        });
      });

      it('should default to 100 sample size', async () => {
        const queryMock = jest.fn().mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({
            resources: [],
          }),
        });

        mockContainer.items.query = queryMock;

        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
        });

        await builder.createCollectionsFromConfiguration();

        expect(queryMock).toHaveBeenCalledWith({
          query: 'SELECT TOP 100 * FROM c',
        });
      });

      it('should pass enableCount flag', async () => {
        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
          enableCount: false,
        });

        const models = await builder.createCollectionsFromConfiguration();

        expect(models[0].enableCount).toBe(false);
      });

      it('should pass overrideTypeConverter', async () => {
        const overrideConverter = jest.fn();

        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
          overrideTypeConverter: overrideConverter,
        });

        const models = await builder.createCollectionsFromConfiguration();

        expect(models[0].overrideTypeConverter).toBe(overrideConverter);
      });

      it('should handle collections from different databases', async () => {
        const mockDatabase2 = {
          container: jest.fn().mockReturnValue({
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
          }),
        };

        mockCosmosClient.database.mockImplementation((dbName: string) => {
          if (dbName === 'db2') return mockDatabase2;
          return mockDatabase;
        });

        builder
          .addCollectionFromContainer({
            name: 'Users',
            databaseName: 'db1',
            containerName: 'users',
          })
          .addCollectionFromContainer({
            name: 'Products',
            databaseName: 'db2',
            containerName: 'products',
          });

        const models = await builder.createCollectionsFromConfiguration();

        expect(models).toHaveLength(2);
        expect(models[0].getDatabaseName()).toBe('db1');
        expect(models[1].getDatabaseName()).toBe('db2');
      });

      it('should resolve all collections in parallel', async () => {
        const startTime = Date.now();
        let callOrder: string[] = [];

        mockContainer.items.query = jest.fn().mockImplementation(() => ({
          fetchAll: jest.fn().mockImplementation(async () => {
            // Simulate async delay
            await new Promise(resolve => setTimeout(resolve, 50));
            callOrder.push('fetch');
            return { resources: [{ id: '1' }] };
          }),
        }));

        builder
          .addCollectionFromContainer({
            name: 'Collection1',
            databaseName: 'testDb',
            containerName: 'container1',
          })
          .addCollectionFromContainer({
            name: 'Collection2',
            databaseName: 'testDb',
            containerName: 'container2',
          })
          .addCollectionFromContainer({
            name: 'Collection3',
            databaseName: 'testDb',
            containerName: 'container3',
          });

        const models = await builder.createCollectionsFromConfiguration();
        const endTime = Date.now();
        const duration = endTime - startTime;

        expect(models).toHaveLength(3);
        // If parallel, should take ~50ms. If sequential, would take ~150ms
        expect(duration).toBeLessThan(120); // Allow some buffer
      });
    });

    describe('createCollectionsFromConfiguration', () => {
      it('should return empty array when no collections added', async () => {
        const models = await builder.createCollectionsFromConfiguration();

        expect(models).toEqual([]);
      });

      it('should handle errors in collection creation', async () => {
        mockContainer.read.mockRejectedValue(new Error('Container not found'));

        builder.addCollectionFromContainer({
          name: 'Users',
          databaseName: 'testDb',
          containerName: 'users',
        });

        await expect(builder.createCollectionsFromConfiguration()).rejects.toThrow(
          'Container not found',
        );
      });

      it('should maintain collection order', async () => {
        builder
          .addCollectionFromContainer({
            name: 'Zebra',
            databaseName: 'testDb',
            containerName: 'zebra',
          })
          .addCollectionFromContainer({
            name: 'Alpha',
            databaseName: 'testDb',
            containerName: 'alpha',
          })
          .addCollectionFromContainer({
            name: 'Beta',
            databaseName: 'testDb',
            containerName: 'beta',
          });

        const models = await builder.createCollectionsFromConfiguration();

        // Builder should maintain order (datasource sorts later)
        expect(models.map(m => m.name)).toEqual(['Zebra', 'Alpha', 'Beta']);
      });
    });
  });
});
