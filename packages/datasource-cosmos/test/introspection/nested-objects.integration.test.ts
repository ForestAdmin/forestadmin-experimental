/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Integration tests for nested object support in Cosmos DB NoSQL
 */
import { CosmosClient } from '@azure/cosmos';

import introspectContainer from '../../src/introspection/container-introspector';

describe('Nested Objects Support', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockContainer: any;
  let mockDatabase: any;

  beforeEach(() => {
    mockContainer = {
      read: jest.fn().mockResolvedValue({
        resource: {
          partitionKey: { paths: ['/id'] },
        },
      }),
      items: {
        query: jest.fn(),
      },
    };

    mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };

    mockCosmosClient = {
      database: jest.fn().mockReturnValue(mockDatabase),
    } as any;
  });

  describe('Complex nested object introspection', () => {
    it('should flatten nested objects with dot notation', async () => {
      const sampleDocuments = [
        {
          id: '1',
          name: 'John Doe',
          address: {
            street: '123 Main St',
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            coordinates: {
              lat: 40.7128,
              lng: -74.006,
            },
          },
          contact: {
            email: 'john@example.com',
            phone: '555-1234',
          },
        },
        {
          id: '2',
          name: 'Jane Smith',
          address: {
            street: '456 Oak Ave',
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90001',
            coordinates: {
              lat: 34.0522,
              lng: -118.2437,
            },
          },
          contact: {
            email: 'jane@example.com',
            phone: '555-5678',
          },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(
        mockCosmosClient,
        'users',
        'testDb',
        'usersContainer',
      );

      const schema = model.getAttributes();

      // Check root level fields
      expect(schema).toHaveProperty('id');
      expect(schema).toHaveProperty('name');

      // Check flattened nested fields with dot notation
      expect(schema['address->street']).toBeDefined();
      expect(schema['address->city']).toBeDefined();
      expect(schema['address->state']).toBeDefined();
      expect(schema['address->zipCode']).toBeDefined();
      expect(schema['address->coordinates->lat']).toBeDefined();
      expect(schema['address->coordinates->lng']).toBeDefined();
      expect(schema['contact->email']).toBeDefined();
      expect(schema['contact->phone']).toBeDefined();

      // Verify types
      expect(schema['address->street'].type).toBe('string');
      expect(schema['address->city'].type).toBe('string');
      expect(schema['address->coordinates->lat'].type).toBe('number');
      expect(schema['address->coordinates->lng'].type).toBe('number');
      expect(schema['contact->email'].type).toBe('string');
    });

    it('should handle deep nesting up to max depth', async () => {
      const sampleDocuments = [
        {
          id: '1',
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: 'deep',
                  },
                },
              },
            },
          },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(mockCosmosClient, 'deep', 'testDb', 'deepContainer');

      const schema = model.getAttributes();

      // Should flatten up to depth 5 (maxDepth is 5, so we stop at level 5)
      // At depth 5, the object itself is treated as 'object' type, not further flattened
      expect(schema['level1->level2->level3->level4->level5']).toBeDefined();
      expect(schema['level1->level2->level3->level4->level5'].type).toBe('object');
    });

    it('should handle mixed nested and flat fields', async () => {
      const sampleDocuments = [
        {
          id: '1',
          flatField: 'value',
          nestedField: {
            subField: 'nestedValue',
          },
          anotherFlat: 123,
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(
        mockCosmosClient,
        'mixed',
        'testDb',
        'mixedContainer',
      );

      const schema = model.getAttributes();

      expect(schema.flatField).toBeDefined();
      expect(schema['nestedField->subField']).toBeDefined();
      expect(schema.anotherFlat).toBeDefined();

      expect(schema.flatField.type).toBe('string');
      expect(schema['nestedField->subField'].type).toBe('string');
      expect(schema.anotherFlat.type).toBe('number');
    });

    it('should handle arrays within nested objects', async () => {
      const sampleDocuments = [
        {
          id: '1',
          user: {
            name: 'John',
            tags: ['admin', 'user'],
            metadata: {
              roles: ['editor', 'viewer'],
            },
          },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(
        mockCosmosClient,
        'users',
        'testDb',
        'usersContainer',
      );

      const schema = model.getAttributes();

      expect(schema['user->name']).toBeDefined();
      expect(schema['user->tags']).toBeDefined();
      expect(schema['user->metadata->roles']).toBeDefined();

      expect(schema['user->name'].type).toBe('string');
      expect(schema['user->tags'].type).toBe('array');
      expect(schema['user->metadata->roles'].type).toBe('array');
    });

    it('should handle nullable nested fields', async () => {
      const sampleDocuments = [
        {
          id: '1',
          profile: {
            bio: 'Hello',
            website: 'example.com',
          },
        },
        {
          id: '2',
          profile: {
            bio: null,
            website: 'example.org',
          },
        },
        {
          id: '3',
          profile: {
            bio: 'World',
            // website missing
          },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(
        mockCosmosClient,
        'users',
        'testDb',
        'usersContainer',
      );

      const schema = model.getAttributes();

      expect(schema['profile->bio'].nullable).toBe(true);
      expect(schema['profile->website'].nullable).toBe(true);
    });

    it('should handle GeoJSON Point within nested objects', async () => {
      const sampleDocuments = [
        {
          id: '1',
          location: {
            name: 'Home',
            coordinates: {
              type: 'Point',
              coordinates: [40.7128, -74.006],
            },
          },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(
        mockCosmosClient,
        'places',
        'testDb',
        'placesContainer',
      );

      const schema = model.getAttributes();

      expect(schema['location->name']).toBeDefined();
      expect(schema['location->coordinates']).toBeDefined();

      expect(schema['location->name'].type).toBe('string');
      expect(schema['location->coordinates'].type).toBe('point');
    });

    it('should handle Date objects within nested structures', async () => {
      const sampleDocuments = [
        {
          id: '1',
          metadata: {
            created: new Date('2023-01-15T10:00:00Z'),
            modified: new Date('2023-01-20T15:30:00Z'),
            tags: {
              lastUpdated: new Date('2023-01-21T09:00:00Z'),
            },
          },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(mockCosmosClient, 'docs', 'testDb', 'docsContainer');

      const schema = model.getAttributes();

      expect(schema['metadata->created'].type).toBe('date');
      expect(schema['metadata->modified'].type).toBe('date');
      expect(schema['metadata->tags->lastUpdated'].type).toBe('date');
    });

    it('should handle inconsistent nested structures across documents', async () => {
      const sampleDocuments = [
        {
          id: '1',
          data: {
            field1: 'value1',
            field2: 'value2',
          },
        },
        {
          id: '2',
          data: {
            field1: 'value3',
            field3: 'value4', // Different field
          },
        },
        {
          id: '3',
          data: {
            field2: 'value5',
            field4: 123, // Different field, different type
          },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(
        mockCosmosClient,
        'variable',
        'testDb',
        'variableContainer',
      );

      const schema = model.getAttributes();

      // All fields should be present
      expect(schema['data->field1']).toBeDefined();
      expect(schema['data->field2']).toBeDefined();
      expect(schema['data->field3']).toBeDefined();
      expect(schema['data->field4']).toBeDefined();

      // Fields should be nullable when not present in all documents
      expect(schema['data->field1'].nullable).toBe(true);
      expect(schema['data->field2'].nullable).toBe(true);
      expect(schema['data->field3'].nullable).toBe(true);
      expect(schema['data->field4'].nullable).toBe(true);
    });
  });

  describe('Real-world Cosmos DB NoSQL scenarios', () => {
    it('should handle e-commerce order with nested items', async () => {
      const sampleDocuments = [
        {
          id: 'order-001',
          customerId: 'cust-123',
          orderDate: '2023-10-16T10:00:00Z',
          status: 'shipped',
          shipping: {
            address: {
              street: '123 Main St',
              city: 'Seattle',
              state: 'WA',
              zipCode: '98101',
            },
            method: 'express',
            tracking: {
              number: 'TRK123456',
              carrier: 'UPS',
            },
          },
          payment: {
            method: 'credit_card',
            last4: '1234',
            amount: 99.99,
            currency: 'USD',
          },
          items: [
            { sku: 'PROD-001', quantity: 2, price: 29.99 },
            { sku: 'PROD-002', quantity: 1, price: 40.01 },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
      });

      const model = await introspectContainer(mockCosmosClient, 'orders', 'ecommerce', 'orders');

      const schema = model.getAttributes();

      // Verify nested shipping address
      expect(schema['shipping->address->street']).toBeDefined();
      expect(schema['shipping->address->city']).toBeDefined();
      expect(schema['shipping->tracking->number']).toBeDefined();

      // Verify nested payment info
      expect(schema['payment->method']).toBeDefined();
      expect(schema['payment->amount']).toBeDefined();

      // Verify items as array
      expect(schema.items).toBeDefined();
      expect(schema.items.type).toBe('array');
    });
  });
});
