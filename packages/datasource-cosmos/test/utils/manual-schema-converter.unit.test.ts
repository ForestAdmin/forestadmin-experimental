import { CosmosClient } from '@azure/cosmos';

import { ManualSchemaConfig } from '../../src/types/manual-schema';
import {
  convertManualSchemaToModels,
  validateManualSchema,
} from '../../src/utils/manual-schema-converter';

describe('Utils > ManualSchemaConverter', () => {
  describe('validateManualSchema', () => {
    describe('basic validation', () => {
      it('should throw if schema is null or undefined', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => validateManualSchema(null as any)).toThrow(
          'Manual schema must have a collections array',
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => validateManualSchema(undefined as any)).toThrow(
          'Manual schema must have a collections array',
        );
      });

      it('should throw if collections is not an array', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect(() => validateManualSchema({ collections: 'not-an-array' } as any)).toThrow(
          'Manual schema collections must be an array',
        );
      });

      it('should throw if collections array is empty', () => {
        expect(() => validateManualSchema({ collections: [] })).toThrow(
          'Manual schema must have at least one collection',
        );
      });
    });

    describe('collection validation', () => {
      it('should throw if collection has no name', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: '',
              databaseName: 'testDb',
              containerName: 'testContainer',
              fields: [{ name: 'id', type: 'string' }],
            } as any,
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow('Collection must have a name');
      });

      it('should throw if collection has no databaseName', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: '',
              containerName: 'testContainer',
              fields: [{ name: 'id', type: 'string' }],
            } as any,
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Collection 'users' must have a databaseName",
        );
      });

      it('should throw if collection has no containerName', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: '',
              fields: [{ name: 'id', type: 'string' }],
            } as any,
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Collection 'users' must have a containerName",
        );
      });

      it('should throw if collection has duplicate names', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'id', type: 'string' }],
            },
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users2',
              fields: [{ name: 'id', type: 'string' }],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow("Duplicate collection name: 'users'");
      });

      it('should throw if collection has no fields', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Collection 'users' must have at least one field",
        );
      });
    });

    describe('field validation', () => {
      it('should throw if field has no name', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: '', type: 'string' } as any],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow('must have a name');
      });

      it('should throw if field has no type', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'id' } as any],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow('must have a type');
      });

      it('should throw if field has invalid type', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'id', type: 'invalid-type' as any }],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow("has invalid type 'invalid-type'");
      });

      it('should throw if duplicate field names at same level', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'id', type: 'string' },
                { name: 'id', type: 'string' },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Duplicate field name: 'id' in collection 'users'",
        );
      });

      it('should accept all valid types', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'str', type: 'string' },
                { name: 'num', type: 'number' },
                { name: 'bool', type: 'boolean' },
                { name: 'dt', type: 'date' },
                { name: 'dateOnly', type: 'dateonly' },
                { name: 'timeOnly', type: 'timeonly' },
                { name: 'arr', type: 'array', subType: 'string' },
                { name: 'obj', type: 'object', fields: [{ name: 'nested', type: 'string' }] },
                { name: 'pt', type: 'point' },
                { name: 'bin', type: 'binary' },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).not.toThrow();
      });
    });

    describe('array field validation', () => {
      it('should throw if array field has no subType', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'tags', type: 'array' } as any],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Array field 'tags' in collection 'users' must have a subType",
        );
      });

      it('should throw if array of objects has no nested fields', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'items', type: 'array', subType: 'object' }],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Array field 'items' in collection 'users' with subType 'object' must have nested field definitions",
        );
      });

      it('should accept array of primitives', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'tags', type: 'array', subType: 'string' },
                { name: 'scores', type: 'array', subType: 'number' },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).not.toThrow();
      });

      it('should accept array of objects with nested fields', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                {
                  name: 'items',
                  type: 'array',
                  subType: 'object',
                  fields: [
                    { name: 'productId', type: 'string' },
                    { name: 'quantity', type: 'number' },
                  ],
                },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).not.toThrow();
      });

      it('should throw if non-array field has subType', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'name', type: 'string', subType: 'object' } as any],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Field 'name' in collection 'users' has subType but is not an array",
        );
      });
    });

    describe('object field validation', () => {
      it('should throw if object field has no nested fields', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'address', type: 'object' }],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Object field 'address' in collection 'users' must have nested field definitions",
        );
      });

      it('should accept object field with nested fields', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                {
                  name: 'address',
                  type: 'object',
                  fields: [
                    { name: 'street', type: 'string' },
                    { name: 'city', type: 'string' },
                  ],
                },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).not.toThrow();
      });

      it('should accept deeply nested objects', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                {
                  name: 'address',
                  type: 'object',
                  fields: [
                    { name: 'street', type: 'string' },
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

        expect(() => validateManualSchema(schema)).not.toThrow();
      });

      it('should throw if non-object field has nested fields property', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                {
                  name: 'name',
                  type: 'string',
                  fields: [{ name: 'nested', type: 'string' }],
                } as any,
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Field 'name' in collection 'users' has nested fields but is not an object or array of objects",
        );
      });
    });

    describe('nested field validation', () => {
      it('should validate nested field names', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                {
                  name: 'address',
                  type: 'object',
                  fields: [
                    { name: 'street', type: 'string' },
                    { name: 'street', type: 'string' },
                  ],
                },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow(
          "Duplicate field name: 'address.street' in collection 'users'",
        );
      });

      it('should validate nested field types', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                {
                  name: 'address',
                  type: 'object',
                  fields: [{ name: 'invalid', type: 'bad-type' as any }],
                },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).toThrow("has invalid type 'bad-type'");
      });
    });

    describe('complex schema validation', () => {
      it('should accept valid complex schema with multiple collections', () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'id', type: 'string' },
                { name: 'email', type: 'string' },
                {
                  name: 'address',
                  type: 'object',
                  fields: [
                    { name: 'street', type: 'string' },
                    { name: 'city', type: 'string' },
                  ],
                },
              ],
            },
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
                  ],
                },
              ],
            },
          ],
        };

        expect(() => validateManualSchema(schema)).not.toThrow();
      });
    });
  });

  describe('convertManualSchemaToModels', () => {
    let mockClient: jest.Mocked<CosmosClient>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mockContainer: any;
    let mockLogger: jest.Mock;

    beforeEach(() => {
      mockContainer = {
        read: jest.fn().mockResolvedValue({
          resource: {
            partitionKey: {
              paths: ['/userId'],
            },
          },
        }),
      };

      mockClient = {
        database: jest.fn().mockReturnValue({
          container: jest.fn().mockReturnValue(mockContainer),
        }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any;

      mockLogger = jest.fn();
    });

    describe('basic conversion', () => {
      it('should convert simple schema to models', async () => {
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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(models).toHaveLength(1);
        expect(models[0].name).toBe('users');
        expect(models[0].getDatabaseName()).toBe('testDb');
        expect(models[0].getContainerName()).toBe('users');
        expect(models[0].getPartitionKeyPath()).toBe('/userId');

        const modelSchema = models[0].getAttributes();
        expect(modelSchema.id).toBeDefined();
        expect(modelSchema.email).toBeDefined();
        expect(modelSchema.age).toBeDefined();
      });

      it('should validate schema before conversion', async () => {
        const invalidSchema: ManualSchemaConfig = {
          collections: [],
        };

        await expect(
          convertManualSchemaToModels(mockClient, invalidSchema, mockLogger),
        ).rejects.toThrow('Manual schema must have at least one collection');
      });

      it('should use provided partition key path', async () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              partitionKeyPath: '/customKey',
              fields: [{ name: 'id', type: 'string' }],
            },
          ],
        };

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(models[0].getPartitionKeyPath()).toBe('/customKey');
        expect(mockContainer.read).not.toHaveBeenCalled();
      });

      it('should fetch partition key if not provided', async () => {
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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(models[0].getPartitionKeyPath()).toBe('/userId');
        expect(mockContainer.read).toHaveBeenCalled();
      });

      it('should use default /id if partition key fetch fails', async () => {
        mockContainer.read.mockRejectedValue(new Error('Container not found'));

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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(models[0].getPartitionKeyPath()).toBe('/id');
        expect(mockLogger).toHaveBeenCalledWith(
          'Warn',
          expect.stringContaining('Failed to fetch partition key path'),
        );
      });
    });

    describe('nested object conversion', () => {
      it('should flatten nested objects using arrow notation', async () => {
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
                  ],
                },
              ],
            },
          ],
        };

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema['address->street']).toBeDefined();
        expect(modelSchema['address->street'].type).toBe('string');
        expect(modelSchema['address->city']).toBeDefined();
        expect(modelSchema['address->city'].type).toBe('string');
      });

      it('should flatten deeply nested objects', async () => {
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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema['address->street']).toBeDefined();
        expect(modelSchema['address->coordinates->lat']).toBeDefined();
        expect(modelSchema['address->coordinates->lat'].type).toBe('number');
        expect(modelSchema['address->coordinates->lng']).toBeDefined();
        expect(modelSchema['address->coordinates->lng'].type).toBe('number');
      });
    });

    describe('array field conversion', () => {
      it('should handle array of primitives', async () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'id', type: 'string' },
                { name: 'tags', type: 'array', subType: 'string' },
              ],
            },
          ],
        };

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema.tags).toBeDefined();
        expect(modelSchema.tags.type).toBe('array');
      });

      it('should handle array of objects with nested fields', async () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'id', type: 'string' },
                {
                  name: 'items',
                  type: 'array',
                  subType: 'object',
                  fields: [
                    { name: 'productId', type: 'string' },
                    { name: 'quantity', type: 'number' },
                  ],
                },
              ],
            },
          ],
        };

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema.items).toBeDefined();
        expect(modelSchema.items.type).toBe('array');
        expect(modelSchema['items->productId']).toBeDefined();
        expect(modelSchema['items->quantity']).toBeDefined();
      });
    });

    describe('field properties conversion', () => {
      it('should respect nullable property', async () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'id', type: 'string', nullable: false },
                { name: 'email', type: 'string', nullable: true },
              ],
            },
          ],
        };

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema.id.nullable).toBe(false);
        expect(modelSchema.email.nullable).toBe(true);
      });

      it('should default nullable to false', async () => {
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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema.id.nullable).toBe(false);
      });

      it('should respect indexed property', async () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [
                { name: 'id', type: 'string', indexed: true },
                { name: 'notes', type: 'string', indexed: false },
              ],
            },
          ],
        };

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema.id.indexed).toBe(true);
        expect(modelSchema.notes.indexed).toBe(false);
      });

      it('should default indexed to true', async () => {
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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        const modelSchema = models[0].getAttributes();
        expect(modelSchema.id.indexed).toBe(true);
      });
    });

    describe('multiple collections conversion', () => {
      it('should convert multiple collections', async () => {
        const schema: ManualSchemaConfig = {
          collections: [
            {
              name: 'users',
              databaseName: 'testDb',
              containerName: 'users',
              fields: [{ name: 'id', type: 'string' }],
            },
            {
              name: 'orders',
              databaseName: 'testDb',
              containerName: 'orders',
              fields: [{ name: 'orderId', type: 'string' }],
            },
          ],
        };

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(models).toHaveLength(2);
        expect(models[0].name).toBe('users');
        expect(models[1].name).toBe('orders');
      });
    });

    describe('enableCount property', () => {
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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(models[0].enableCount).toBe(false);
      });

      it('should default enableCount to true', async () => {
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

        const models = await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(models[0].enableCount).toBe(true);
      });
    });

    describe('logging', () => {
      it('should log collection creation', async () => {
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

        await convertManualSchemaToModels(mockClient, schema, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          "Creating collection 'users' from manual schema definition",
        );
        expect(mockLogger).toHaveBeenCalledWith(
          'Info',
          expect.stringContaining("Successfully created collection 'users'"),
        );
      });
    });
  });
});
