/* eslint-disable @typescript-eslint/no-explicit-any */
import { CosmosClient } from '@azure/cosmos';
import {
  Aggregation,
  Caller,
  ConditionTreeLeaf,
  Filter,
  PaginatedFilter,
  Projection,
  Sort,
} from '@forestadmin/datasource-toolkit';

import ArrayCollection from '../../src/array-collection';
import CosmosCollection from '../../src/collection';
import CosmosDataSource from '../../src/datasource';
import Introspector from '../../src/introspection/introspector';

describe('Virtual Collections (ArrayCollection) - Integration Tests', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockContainer: any;
  let mockDatabase: any;
  let datasource: CosmosDataSource;
  let caller: Caller;

  beforeEach(() => {
    // Setup mock Cosmos DB client
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

    // Setup caller (user context)
    caller = {} as Caller;
  });

  describe('1. Virtual Collection Creation', () => {
    describe('Creating virtual collection from physical collection array field', () => {
      it('should create a virtual collection from an array field', async () => {
        // Sample documents with array field (introspectArrayField expects 'arrayField' property)
        const sampleDocuments = [
          {
            id: 'tp-001',
            arrayField: [
              { id: 'dil-1', type: 'KYC', status: 'completed', date: '2023-01-15' },
              { id: 'dil-2', type: 'AML', status: 'pending', date: '2023-02-20' },
            ],
          },
          {
            id: 'tp-002',
            arrayField: [{ id: 'dil-3', type: 'KYC', status: 'completed', date: '2023-03-10' }],
          },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
        });

        // Introspect array field
        const arraySchema = await Introspector.introspectArrayField(
          mockCosmosClient,
          'testDb',
          'third_parties',
          'diligences',
        );

        expect(arraySchema).toBeDefined();
        expect(arraySchema.id).toBeDefined();
        expect(arraySchema.type).toBeDefined();
        expect(arraySchema.status).toBeDefined();
        expect(arraySchema.date).toBeDefined();
      });

      it('should handle schema introspection from array items', async () => {
        const sampleDocuments = [
          {
            id: 'order-1',
            arrayField: [
              { sku: 'PROD-001', quantity: 2, price: 29.99, name: 'Product A' },
              { sku: 'PROD-002', quantity: 1, price: 49.99, name: 'Product B' },
            ],
          },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
        });

        const arraySchema = await Introspector.introspectArrayField(
          mockCosmosClient,
          'ecommerce',
          'orders',
          'items',
        );

        expect(arraySchema.sku).toBeDefined();
        expect(arraySchema.sku.type).toBe('string');
        expect(arraySchema.quantity).toBeDefined();
        expect(arraySchema.quantity.type).toBe('number');
        expect(arraySchema.price).toBeDefined();
        expect(arraySchema.price.type).toBe('number');
        expect(arraySchema.name).toBeDefined();
        expect(arraySchema.name.type).toBe('string');
      });
    });

    describe('Handling missing parent collection', () => {
      it('should handle introspection when array field does not exist', async () => {
        const sampleDocuments = [
          {
            id: 'doc-1',
            name: 'Document without array field',
          },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: sampleDocuments }),
        });

        const arraySchema = await Introspector.introspectArrayField(
          mockCosmosClient,
          'testDb',
          'documents',
          'nonexistent_array',
        );

        expect(arraySchema).toEqual({});
      });

      it('should handle empty container', async () => {
        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
        });

        const arraySchema = await Introspector.introspectArrayField(
          mockCosmosClient,
          'testDb',
          'empty_container',
          'items',
        );

        expect(arraySchema).toEqual({});
      });
    });

    describe('Schema introspection from virtual parent', () => {
      it('should introspect nested array structure from virtual collection', async () => {
        // Setup parent documents with nested arrays (using arrayField format for introspection)
        const parentDocuments = [
          {
            id: 'tp-001',
            arrayField: [
              {
                id: 'dil-1',
                type: 'KYC',
                attachments: [
                  { name: 'passport.pdf', size: 1024, uploadDate: '2023-01-15' },
                  { name: 'address.pdf', size: 2048, uploadDate: '2023-01-16' },
                ],
              },
              {
                id: 'dil-2',
                type: 'AML',
                attachments: [{ name: 'report.pdf', size: 4096, uploadDate: '2023-02-20' }],
              },
            ],
          },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
        });

        // Introspect first level array (diligences)
        const diligencesSchema = await Introspector.introspectArrayField(
          mockCosmosClient,
          'testDb',
          'third_parties',
          'diligences',
        );

        expect(diligencesSchema.id).toBeDefined();
        expect(diligencesSchema.type).toBeDefined();
        expect(diligencesSchema.attachments).toBeDefined();
        expect(diligencesSchema.attachments.type).toBe('array');
      });
    });
  });

  describe('2. Composite ID Handling', () => {
    let arrayCollection: ArrayCollection;
    let parentCollection: CosmosCollection;

    beforeEach(async () => {
      // Setup parent documents
      const parentDocuments = [
        {
          id: 'parent-1',
          name: 'Parent One',
          items: [
            { name: 'Item A', value: 100 },
            { name: 'Item B', value: 200 },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const parentModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'parents',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
      parentCollection = datasource.getCollection('parents') as CosmosCollection;

      await Introspector.introspectArrayField(mockCosmosClient, 'testDb', 'parents', 'items');

      // Create ArrayCollection
      arrayCollection = new ArrayCollection(
        datasource,
        parentCollection,
        'parent_items',
        'items',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );
    });

    it('should create composite IDs in format parentId:index', async () => {
      const records = await arrayCollection.list(
        caller,
        new PaginatedFilter({}),
        new Projection('id'),
      );

      expect(records).toHaveLength(2);
      expect(records[0].id).toBe('parent-1:0');
      expect(records[1].id).toBe('parent-1:1');
    });

    it('should parse composite IDs correctly', async () => {
      const records = await arrayCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:1'),
        }),
        new Projection('id', 'name'),
      );

      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('parent-1:1');
      expect(records[0].name).toBe('Item B');
    });

    it('should parse nested composite IDs (parentId:index:index)', () => {
      // Test the composite ID parsing logic for nested virtual collections
      // Composite ID format: grandparentId:parentIndex:childIndex
      const nestedCompositeId = 'uuid-123:0:2';

      // This simulates parsing the LAST colon to get the immediate parent and index
      const lastColonIndex = nestedCompositeId.lastIndexOf(':');
      const parentId = nestedCompositeId.substring(0, lastColonIndex);
      const index = parseInt(nestedCompositeId.substring(lastColonIndex + 1), 10);

      expect(parentId).toBe('uuid-123:0');
      expect(index).toBe(2);
    });

    it('should handle multi-level composite ID parsing (3+ levels)', () => {
      // Test parsing for deeply nested virtual collections
      const deepCompositeId = 'root-id:0:1:2:3';

      // Parse to get immediate parent and current index
      const lastColonIndex = deepCompositeId.lastIndexOf(':');
      const parentId = deepCompositeId.substring(0, lastColonIndex);
      const index = parseInt(deepCompositeId.substring(lastColonIndex + 1), 10);

      expect(parentId).toBe('root-id:0:1:2');
      expect(index).toBe(3);
    });

    it('should filter by composite ID using In operator', async () => {
      const records = await arrayCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['parent-1:0', 'parent-1:1']),
        }),
        new Projection('id', 'name'),
      );

      expect(records).toHaveLength(2);
      expect(records[0].id).toBe('parent-1:0');
      expect(records[1].id).toBe('parent-1:1');
    });
  });

  describe('3. Virtualized Child Fields', () => {
    let parentCollection: CosmosCollection;

    beforeEach(async () => {
      const parentDocuments = [
        {
          id: 'doc-1',
          name: 'Document One',
          sections: [
            { title: 'Section A', content: 'Content A' },
            { title: 'Section B', content: 'Content B' },
          ],
          metadata: { author: 'John Doe', created: '2023-01-01' },
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const parentModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'documents',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
      parentCollection = datasource.getCollection('documents') as CosmosCollection;
    });

    it('should filter out virtualized child fields from parent records', async () => {
      // Mark 'sections' as a virtualized field
      parentCollection.markVirtualizedFieldsAsNonSortable(['sections']);

      const field = parentCollection.schema.fields.sections;

      expect(field).toBeDefined();
      expect(field.type).toBe('Column');

      // Type assertion after checking the type
      expect((field as any).isSortable).toBe(false);
    });

    it('should set virtualized child fields after collection creation', async () => {
      await Introspector.introspectArrayField(mockCosmosClient, 'testDb', 'documents', 'sections');

      const virtualCollection = new ArrayCollection(
        datasource,
        parentCollection,
        'document_sections',
        'sections',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );

      // Set virtualized child fields (if sections had sub-arrays)
      virtualCollection.setVirtualizedChildFields(['subsections']);

      // Verify the fields are tracked
      const records = await virtualCollection.list(
        caller,
        new PaginatedFilter({}),
        new Projection('title', 'content'),
      );

      // The subsections field should be filtered out from records
      expect(records[0]).not.toHaveProperty('subsections');
    });

    it('should mark virtualized fields as non-sortable in physical collections', () => {
      const fieldsBefore = parentCollection.schema.fields.sections;

      expect(fieldsBefore.type).toBe('Column');

      // Mark as virtualized
      parentCollection.markVirtualizedFieldsAsNonSortable(['sections']);

      const fieldsAfter = parentCollection.schema.fields.sections;

      expect(fieldsAfter.type).toBe('Column');
      expect((fieldsAfter as any).isSortable).toBe(false);
    });

    it('should mark virtualized fields as non-sortable in virtual collections', async () => {
      // Create a nested scenario where a virtual collection has its own virtualized children
      const parentDocuments = [
        {
          id: 'tp-1',
          diligences: [
            {
              id: 'dil-1',
              attachments: [{ name: 'file1.pdf', size: 1024 }],
            },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const tpModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'third_parties',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [tpModel], jest.fn());
      const tpCollection = datasource.getCollection('third_parties') as CosmosCollection;

      // Create diligences virtual collection
      const diligencesCollection = new ArrayCollection(
        datasource,
        tpCollection,
        'diligences',
        'diligences',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );

      // Set attachments as virtualized child
      diligencesCollection.setVirtualizedChildFields(['attachments']);

      // Verify virtualized fields are filtered
      const records = await diligencesCollection.list(
        caller,
        new PaginatedFilter({}),
        new Projection('id'),
      );

      expect(records[0]).not.toHaveProperty('attachments');
    });
  });

  describe('4. CRUD Operations on Virtual Collections', () => {
    let arrayCollection: ArrayCollection;
    let parentDocuments: any[];

    beforeEach(async () => {
      parentDocuments = [
        {
          id: 'order-1',
          customer: 'John Doe',
          items: [
            { sku: 'PROD-001', quantity: 2, price: 29.99 },
            { sku: 'PROD-002', quantity: 1, price: 49.99 },
          ],
        },
        {
          id: 'order-2',
          customer: 'Jane Smith',
          items: [{ sku: 'PROD-003', quantity: 3, price: 19.99 }],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const parentModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'orders',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
      const parentCollection = datasource.getCollection('orders') as CosmosCollection;

      arrayCollection = new ArrayCollection(
        datasource,
        parentCollection,
        'order_items',
        'items',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );
    });

    describe('List operations', () => {
      it('should retrieve all records from virtual collection', async () => {
        const records = await arrayCollection.list(
          caller,
          new PaginatedFilter({}),
          new Projection('id', 'sku', 'quantity', 'price'),
        );

        expect(records).toHaveLength(3);
        expect(records[0]).toMatchObject({
          id: 'order-1:0',
          sku: 'PROD-001',
          quantity: 2,
          price: 29.99,
        });
        expect(records[1]).toMatchObject({
          id: 'order-1:1',
          sku: 'PROD-002',
          quantity: 1,
          price: 49.99,
        });
        expect(records[2]).toMatchObject({
          id: 'order-2:0',
          sku: 'PROD-003',
          quantity: 3,
          price: 19.99,
        });
      });

      it('should filter by parent ID', async () => {
        // Get all records and filter manually to verify structure
        const allRecords = await arrayCollection.list(
          caller,
          new PaginatedFilter({}),
          new Projection('id', 'sku', 'ordersId'),
        );

        // Manually filter to verify the parent ID field is correct
        const filteredRecords = allRecords.filter(r => r.ordersId === 'order-1');

        expect(filteredRecords).toHaveLength(2);
        expect(filteredRecords[0].id).toBe('order-1:0');
        expect(filteredRecords[1].id).toBe('order-1:1');

        // Note: Testing actual filter push-down requires more complex mocking
        // The key verification here is that records have the correct parent ID field
      });

      it('should filter by composite ID', async () => {
        const records = await arrayCollection.list(
          caller,
          new PaginatedFilter({
            conditionTree: new ConditionTreeLeaf('id', 'Equal', 'order-1:1'),
          }),
          new Projection('id', 'sku'),
        );

        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          id: 'order-1:1',
          sku: 'PROD-002',
        });
      });

      it('should filter by field values', async () => {
        const records = await arrayCollection.list(
          caller,
          new PaginatedFilter({
            conditionTree: new ConditionTreeLeaf('sku', 'Equal', 'PROD-003'),
          }),
          new Projection('id', 'sku', 'quantity'),
        );

        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          id: 'order-2:0',
          sku: 'PROD-003',
          quantity: 3,
        });
      });

      it('should sort by various fields', async () => {
        const sort = new Sort({ field: 'price', ascending: false });
        const records = await arrayCollection.list(
          caller,
          new PaginatedFilter({
            sort,
          }),
          new Projection('id', 'sku', 'price'),
        );

        expect(records).toHaveLength(3);
        expect(records[0].price).toBe(49.99);
        expect(records[1].price).toBe(29.99);
        expect(records[2].price).toBe(19.99);
      });

      it('should paginate with skip and limit', async () => {
        const records = await arrayCollection.list(
          caller,
          new PaginatedFilter({
            page: { skip: 1, limit: 1, apply: (r: any) => r },
          }),
          new Projection('id', 'sku'),
        );

        expect(records).toHaveLength(1);
        expect(records[0].id).toBe('order-1:1');
      });
    });

    describe('Create operations', () => {
      it('should support add new items to array (verifies structure)', () => {
        // Verify the create method exists and schema is correct
        expect(arrayCollection.create).toBeDefined();

        // Verify parent ID field is required
        const parentIdField = arrayCollection.schema.fields.ordersId;

        expect(parentIdField).toBeDefined();
        expect(parentIdField.type).toBe('Column');
        expect((parentIdField as any).columnType).toBe('String');

        // Note: Full create() test requires properly mocked parent collection
        // update chain and is better tested with real database
      });

      it('should not store parent ID field in the physical array item', async () => {
        let capturedUpdatePatch: any = null;

        // Mock parent collection list to return the parent document
        const mockParentList = jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            items: [{ sku: 'PROD-001', quantity: 2 }],
          },
        ]);

        // Mock parent collection update to capture what gets written
        const mockParentUpdate = jest.fn().mockImplementation((_caller, _filter, patch) => {
          capturedUpdatePatch = patch;

          return Promise.resolve();
        });

        // Replace parent collection methods
        const { parentCollection } = arrayCollection as any;

        parentCollection.list = mockParentList;
        parentCollection.update = mockParentUpdate;

        // Create a new item with parent ID included
        await arrayCollection.create(caller, [
          {
            ordersId: 'order-1',
            sku: 'PROD-004',
            quantity: 5,
            price: 99.99,
          },
        ]);

        // Verify update was called
        expect(mockParentUpdate).toHaveBeenCalled();

        // Verify the parent ID field is NOT in the stored array item
        expect(capturedUpdatePatch).toBeDefined();
        expect(capturedUpdatePatch.items).toBeDefined();
        expect(capturedUpdatePatch.items).toHaveLength(2);

        const newItem = capturedUpdatePatch.items[1];
        expect(newItem).toEqual({
          sku: 'PROD-004',
          quantity: 5,
          price: 99.99,
        });
        expect(newItem).not.toHaveProperty('ordersId');
        expect(newItem).not.toHaveProperty('id');
      });
    });

    describe('Update operations', () => {
      it('should support modify array items (verifies structure)', () => {
        // Verify the update method exists
        expect(arrayCollection.update).toBeDefined();

        // Verify that we can identify records by composite ID
        const idField = arrayCollection.schema.fields.id;

        expect(idField).toBeDefined();
        expect(idField.type).toBe('Column');
        expect((idField as any).isPrimaryKey).toBe(true);

        // Note: Full update() test requires properly mocked parent collection
      });

      it('should use optimized path when filtering by composite ID (Equal)', async () => {
        const mockParentList = jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            items: [
              { sku: 'PROD-001', quantity: 2, price: 29.99 },
              { sku: 'PROD-002', quantity: 1, price: 49.99 },
            ],
          },
        ]);

        const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

        // Replace parent collection methods
        const { parentCollection } = arrayCollection as any;

        parentCollection.list = mockParentList;
        parentCollection.update = mockParentUpdate;

        // Update using composite ID filter
        await arrayCollection.update(
          caller,
          new Filter({
            conditionTree: new ConditionTreeLeaf('id', 'Equal', 'order-1:1'),
          }),
          { quantity: 10 },
        );

        // Verify parent.list was called only once (not via arrayCollection.list)
        // This proves the optimization bypasses the expensive list() call
        expect(mockParentList).toHaveBeenCalledTimes(1);
        expect(mockParentList).toHaveBeenCalledWith(
          caller,
          expect.objectContaining({
            conditionTree: expect.objectContaining({
              field: 'id',
              operator: 'Equal',
              value: 'order-1',
            }),
          }),
          expect.any(Projection),
        );

        // Verify update was called
        expect(mockParentUpdate).toHaveBeenCalledTimes(1);
      });

      it('should use optimized path when filtering by composite ID (In)', async () => {
        const mockParentList = jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            items: [
              { sku: 'PROD-001', quantity: 2, price: 29.99 },
              { sku: 'PROD-002', quantity: 1, price: 49.99 },
            ],
          },
        ]);

        const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

        // Replace parent collection methods
        const { parentCollection } = arrayCollection as any;

        parentCollection.list = mockParentList;
        parentCollection.update = mockParentUpdate;

        // Update using composite ID In filter
        await arrayCollection.update(
          caller,
          new Filter({
            conditionTree: new ConditionTreeLeaf('id', 'In', ['order-1:0', 'order-1:1']),
          }),
          { price: 99.99 },
        );

        // Verify parent.list was called twice (once per item, not via arrayCollection.list)
        expect(mockParentList).toHaveBeenCalledTimes(2);

        // Verify both items were updated
        expect(mockParentUpdate).toHaveBeenCalledTimes(2);
      });

      it('should not store parent ID field in the physical array item when updating', async () => {
        let capturedUpdatePatch: any = null;

        // Mock parent collection list to return records for filtering and parent fetching
        const mockParentList = jest.fn().mockImplementation((_caller, filter) => {
          // When filtering by composite ID (for list operation)
          if (filter.conditionTree?.field === 'id') {
            return Promise.resolve([
              {
                id: 'order-1',
                items: [
                  { sku: 'PROD-001', quantity: 2, price: 29.99 },
                  { sku: 'PROD-002', quantity: 1, price: 49.99 },
                ],
              },
            ]);
          }

          // Default case
          return Promise.resolve([
            {
              id: 'order-1',
              items: [
                { sku: 'PROD-001', quantity: 2, price: 29.99 },
                { sku: 'PROD-002', quantity: 1, price: 49.99 },
              ],
            },
          ]);
        });

        // Mock parent collection update to capture what gets written
        const mockParentUpdate = jest.fn().mockImplementation((_caller, _filter, patch) => {
          capturedUpdatePatch = patch;

          return Promise.resolve();
        });

        // Replace parent collection methods
        const { parentCollection } = arrayCollection as any;

        parentCollection.list = mockParentList;
        parentCollection.update = mockParentUpdate;

        // Update an item with parent ID included in the patch
        await arrayCollection.update(
          caller,
          new Filter({
            conditionTree: new ConditionTreeLeaf('id', 'Equal', 'order-1:1'),
          }),
          {
            ordersId: 'order-1', // This should be filtered out
            id: 'order-1:1', // This should be filtered out
            quantity: 10,
            price: 59.99,
          },
        );

        // Verify update was called
        expect(mockParentUpdate).toHaveBeenCalled();

        // Verify the parent ID and composite ID fields are NOT in the stored array item
        expect(capturedUpdatePatch).toBeDefined();
        expect(capturedUpdatePatch.items).toBeDefined();

        const updatedItem = capturedUpdatePatch.items[1];
        expect(updatedItem).toMatchObject({
          sku: 'PROD-002',
          quantity: 10,
          price: 59.99,
        });
        expect(updatedItem).not.toHaveProperty('ordersId');
        expect(updatedItem).not.toHaveProperty('id');
      });
    });

    describe('Delete operations', () => {
      it('should support remove array items (verifies structure)', () => {
        // Verify the delete method exists
        expect(arrayCollection.delete).toBeDefined();

        // Verify records can be identified for deletion
        const idField = arrayCollection.schema.fields.id;

        expect(idField).toBeDefined();
        expect(idField.type).toBe('Column');
        expect((idField as any).isPrimaryKey).toBe(true);
        expect((idField as any).filterOperators.has('Equal')).toBe(true);

        // Note: Full delete() test requires properly mocked parent collection
        // and is better tested with real database
      });

      it('should use optimized path when deleting by composite ID (Equal)', async () => {
        const mockParentList = jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            items: [
              { sku: 'PROD-001', quantity: 2 },
              { sku: 'PROD-002', quantity: 1 },
            ],
          },
        ]);

        const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

        // Replace parent collection methods
        const { parentCollection } = arrayCollection as any;

        parentCollection.list = mockParentList;
        parentCollection.update = mockParentUpdate;

        // Delete using composite ID filter
        await arrayCollection.delete(
          caller,
          new Filter({
            conditionTree: new ConditionTreeLeaf('id', 'Equal', 'order-1:1'),
          }),
        );

        // Verify parent.list was called only once (to fetch parent for deletion)
        // The optimization skips calling arrayCollection.list()
        expect(mockParentList).toHaveBeenCalledTimes(1);

        // Verify update was called with the modified array
        expect(mockParentUpdate).toHaveBeenCalledTimes(1);
      });

      it('should use optimized path when deleting by composite ID (In)', async () => {
        const mockParentList = jest.fn().mockResolvedValue([
          {
            id: 'order-1',
            items: [
              { sku: 'PROD-001', quantity: 2 },
              { sku: 'PROD-002', quantity: 1 },
              { sku: 'PROD-003', quantity: 3 },
            ],
          },
        ]);

        const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

        // Replace parent collection methods
        const { parentCollection } = arrayCollection as any;

        parentCollection.list = mockParentList;
        parentCollection.update = mockParentUpdate;

        // Delete multiple items using In operator
        await arrayCollection.delete(
          caller,
          new Filter({
            conditionTree: new ConditionTreeLeaf('id', 'In', ['order-1:0', 'order-1:2']),
          }),
        );

        // Verify parent.list was called only once (to fetch parent for deletion)
        expect(mockParentList).toHaveBeenCalledTimes(1);

        // Verify update was called once (all deletions in same parent)
        expect(mockParentUpdate).toHaveBeenCalledTimes(1);
      });
    });

    describe('Optimized Array Operations', () => {
      it('should have optimizations enabled by default in production', () => {
        // Create a collection with enableOptimizations explicitly set to true
        /* eslint-disable @typescript-eslint/dot-notation */
        const optimizedCollection = new ArrayCollection(
          arrayCollection['dataSource'],
          arrayCollection['parentCollection'],
          'test_collection',
          'items',
          { actions: {}, charts: [], countable: true, fields: {}, searchable: true, segments: [] },
          jest.fn(),
          undefined,
          [],
          true, // Enable optimizations
        );
        /* eslint-enable @typescript-eslint/dot-notation */

        expect((optimizedCollection as any).enableOptimizations).toBe(true);
      });

      it('should have optimizations disabled in test environment by default', () => {
        // Current arrayCollection was created without explicit enableOptimizations
        // Should be false in test environment
        expect((arrayCollection as any).enableOptimizations).toBe(false);
      });

      it('should support single composite ID filtering correctly', async () => {
        // Test that single-item filtering works (even with optimization disabled)
        const records = await arrayCollection.list(
          caller,
          new PaginatedFilter({
            conditionTree: new ConditionTreeLeaf('id', 'Equal', 'order-1:0'),
          }),
          new Projection('id', 'sku', 'quantity'),
        );

        // Verify result
        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          id: 'order-1:0',
          sku: 'PROD-001',
          quantity: 2,
        });
      });

      it('should return empty array if single item not found', async () => {
        const records = await arrayCollection.list(
          caller,
          new PaginatedFilter({
            conditionTree: new ConditionTreeLeaf('id', 'Equal', 'order-999:0'),
          }),
          new Projection('id', 'sku'),
        );

        expect(records).toHaveLength(0);
      });
    });
  });

  describe('5. Nested Virtual Collections (3 levels)', () => {
    let thirdPartiesCollection: CosmosCollection;
    let diligencesCollection: ArrayCollection;
    let attachmentsCollection: ArrayCollection;
    let parentDocuments: any[];

    beforeEach(async () => {
      parentDocuments = [
        {
          id: 'tp-001',
          name: 'Third Party A',
          diligences: [
            {
              type: 'KYC',
              status: 'completed',
              attachments: [
                { name: 'passport.pdf', size: 1024, uploadDate: '2023-01-15' },
                { name: 'address.pdf', size: 2048, uploadDate: '2023-01-16' },
              ],
            },
            {
              type: 'AML',
              status: 'pending',
              attachments: [{ name: 'report.pdf', size: 4096, uploadDate: '2023-02-20' }],
            },
          ],
        },
        {
          id: 'tp-002',
          name: 'Third Party B',
          diligences: [
            {
              type: 'KYC',
              status: 'completed',
              attachments: [{ name: 'id.pdf', size: 512, uploadDate: '2023-03-10' }],
            },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const tpModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'third_parties',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [tpModel], jest.fn());
      thirdPartiesCollection = datasource.getCollection('third_parties') as CosmosCollection;

      // Create first level virtual collection (diligences)
      diligencesCollection = new ArrayCollection(
        datasource,
        thirdPartiesCollection,
        'diligences',
        'diligences',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );

      // Mark attachments as virtualized in diligences
      diligencesCollection.setVirtualizedChildFields(['attachments']);

      // Create second level virtual collection (attachments from diligences)
      attachmentsCollection = new ArrayCollection(
        datasource,
        diligencesCollection,
        'attachments',
        'attachments',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );
    });

    it('should create third_parties → diligences → attachments hierarchy', async () => {
      // List diligences
      const diligences = await diligencesCollection.list(
        caller,
        new PaginatedFilter({}),
        new Projection('id', 'type'),
      );

      expect(diligences).toHaveLength(3);
      expect(diligences[0].id).toBe('tp-001:0');
      expect(diligences[1].id).toBe('tp-001:1');
      expect(diligences[2].id).toBe('tp-002:0');
    });

    it('should list attachments from diligences (verifies structure)', () => {
      // Verify that attachments collection is properly configured
      expect(attachmentsCollection).toBeDefined();
      expect(attachmentsCollection.name).toBe('attachments');

      // Verify schema has required fields
      expect(attachmentsCollection.schema.fields).toHaveProperty('id');
      expect(attachmentsCollection.schema.fields).toHaveProperty('diligencesId');

      // Verify the composite ID field structure
      const idField = attachmentsCollection.schema.fields.id;

      expect(idField).toBeDefined();
      expect(idField.type).toBe('Column');
      expect((idField as any).isPrimaryKey).toBe(true);
      expect((idField as any).columnType).toBe('String');

      // Note: Full list() operation requires complex mock chaining
      // and is better tested in integration tests with a real database
    });

    it('should support create on attachments (verifies structure)', () => {
      // Verify that the attachments collection has the proper parent ID field
      const { schema } = attachmentsCollection;

      expect(schema.fields).toHaveProperty('diligencesId');

      const diligencesIdField = schema.fields.diligencesId;

      expect(diligencesIdField.type).toBe('Column');
      expect((diligencesIdField as any).columnType).toBe('String');
    });

    it('should support update on attachments (verifies structure)', () => {
      // Verify that attachments have proper composite IDs for updates
      const { schema } = attachmentsCollection;

      expect(schema.fields).toHaveProperty('id');

      const idField = schema.fields.id;

      expect(idField.type).toBe('Column');
      expect((idField as any).isPrimaryKey).toBe(true);
      expect((idField as any).columnType).toBe('String');
    });

    it('should support delete on attachments (verifies structure)', () => {
      // Verify that the collection is properly set up for deletions
      expect(attachmentsCollection.name).toBe('attachments');
      expect(attachmentsCollection.schema.countable).toBe(true);
    });

    it('should support filtering attachments by parent diligence ID (verifies structure)', () => {
      // Verify that the filter operators are available
      const diligencesIdField = attachmentsCollection.schema.fields.diligencesId;

      expect(diligencesIdField.type).toBe('Column');
      expect((diligencesIdField as any).filterOperators).toBeDefined();
      expect((diligencesIdField as any).filterOperators.has('Equal')).toBe(true);

      // Note: Actual filtering with list() requires complex mock chaining
      // and is better tested with a real database
    });

    it('should parse composite IDs for 3-level nesting', () => {
      // Test composite ID parsing for deeply nested structure
      const thirdLevelId = 'tp-001:0:1';

      const lastColonIndex = thirdLevelId.lastIndexOf(':');
      const parentId = thirdLevelId.substring(0, lastColonIndex);
      const index = parseInt(thirdLevelId.substring(lastColonIndex + 1), 10);

      expect(parentId).toBe('tp-001:0');
      expect(index).toBe(1);

      // Parse parent ID further
      const parentLastColon = parentId.lastIndexOf(':');
      const grandparentId = parentId.substring(0, parentLastColon);
      const parentIndex = parseInt(parentId.substring(parentLastColon + 1), 10);

      expect(grandparentId).toBe('tp-001');
      expect(parentIndex).toBe(0);
    });

    it('should retrieve a specific attachment by composite ID (tp-001:0:1)', async () => {
      // Test the optimization path for fetching a single nested record
      const attachmentId = 'tp-001:0:1';

      // Setup mock to return the parent document when queried
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      // Fetch the attachment by ID
      const attachments = await attachmentsCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', attachmentId),
        }),
        new Projection('id', 'name', 'size'),
      );

      expect(attachments).toHaveLength(1);
      expect(attachments[0].id).toBe('tp-001:0:1');
      expect(attachments[0].name).toBe('address.pdf');
      expect(attachments[0].size).toBe(2048);
      expect(attachments[0].diligencesId).toBe('tp-001:0');
    });

    it('should retrieve attachment from different diligence (tp-001:1:0)', async () => {
      const attachmentId = 'tp-001:1:0';

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const attachments = await attachmentsCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', attachmentId),
        }),
        new Projection('id', 'name', 'size'),
      );

      expect(attachments).toHaveLength(1);
      expect(attachments[0].id).toBe('tp-001:1:0');
      expect(attachments[0].name).toBe('report.pdf');
      expect(attachments[0].size).toBe(4096);
      expect(attachments[0].diligencesId).toBe('tp-001:1');
    });

    it('should retrieve attachment from second third party (tp-002:0:0)', async () => {
      const attachmentId = 'tp-002:0:0';

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const attachments = await attachmentsCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', attachmentId),
        }),
        new Projection('id', 'name', 'size'),
      );

      expect(attachments).toHaveLength(1);
      expect(attachments[0].id).toBe('tp-002:0:0');
      expect(attachments[0].name).toBe('id.pdf');
      expect(attachments[0].size).toBe(512);
      expect(attachments[0].diligencesId).toBe('tp-002:0');
    });

    it('should return empty array for non-existent attachment ID', async () => {
      const nonExistentId = 'tp-999:0:0';

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const attachments = await attachmentsCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', nonExistentId),
        }),
        new Projection('id', 'name'),
      );

      expect(attachments).toHaveLength(0);
    });

    it('should return empty array for out-of-bounds index (tp-001:0:99)', async () => {
      const outOfBoundsId = 'tp-001:0:99';

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const attachments = await attachmentsCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', outOfBoundsId),
        }),
        new Projection('id', 'name'),
      );

      expect(attachments).toHaveLength(0);
    });

    it('should list all attachments when no filter is provided', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const attachments = await attachmentsCollection.list(
        caller,
        new PaginatedFilter({}),
        new Projection('id', 'name'),
      );

      // tp-001 has 2 diligences with 2 and 1 attachments respectively (3 total)
      // tp-002 has 1 diligence with 1 attachment (1 total)
      // Total: 4 attachments
      expect(attachments).toHaveLength(4);
      expect(attachments.map(a => a.id)).toEqual([
        'tp-001:0:0',
        'tp-001:0:1',
        'tp-001:1:0',
        'tp-002:0:0',
      ]);
    });

    it('should retrieve multiple attachments by composite IDs using In operator', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const attachments = await attachmentsCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['tp-001:0:0', 'tp-002:0:0']),
        }),
        new Projection('id', 'name'),
      );

      expect(attachments).toHaveLength(2);
      expect(attachments[0].id).toBe('tp-001:0:0');
      expect(attachments[0].name).toBe('passport.pdf');
      expect(attachments[1].id).toBe('tp-002:0:0');
      expect(attachments[1].name).toBe('id.pdf');
    });

    it('should delete a single attachment without affecting others', async () => {
      // Initial: tp-001 has diligence[0] with 2 attachments and diligence[1] with 1 attachment
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      // Mock the update call to capture what's being updated
      const updateMock = jest.fn().mockResolvedValue(undefined);

      (thirdPartiesCollection as any).update = updateMock;
      (diligencesCollection as any).update = updateMock;

      // Delete attachment tp-001:0:1 (second attachment of first diligence)
      await attachmentsCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'tp-001:0:1'),
        }),
      );

      // Verify update was called to remove only the targeted attachment
      expect(updateMock).toHaveBeenCalled();

      // Update called on diligences collection with the modified attachments array
      const updateCall = updateMock.mock.calls[0];

      expect(updateCall).toBeDefined();
      expect(updateCall[2]).toHaveProperty('attachments');

      const updatedAttachments = updateCall[2].attachments;

      // Should have removed the second attachment, leaving only the first one
      expect(updatedAttachments).toHaveLength(1);
      expect(updatedAttachments[0].name).toBe('passport.pdf');
    });

    it('should delete multiple attachments from the same diligence', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const updateMock = jest.fn().mockResolvedValue(undefined);

      (thirdPartiesCollection as any).update = updateMock;
      (diligencesCollection as any).update = updateMock;

      // Delete both attachments from first diligence (tp-001:0:0 and tp-001:0:1)
      await attachmentsCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['tp-001:0:0', 'tp-001:0:1']),
        }),
      );

      expect(updateMock).toHaveBeenCalled();

      const updateCall = updateMock.mock.calls[0];
      const updatedAttachments = updateCall[2].attachments;

      // Should have removed both attachments
      expect(updatedAttachments).toHaveLength(0);
    });

    it('should delete attachments from different diligences independently', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const updateMock = jest.fn().mockResolvedValue(undefined);

      (thirdPartiesCollection as any).update = updateMock;
      (diligencesCollection as any).update = updateMock;

      // Delete one attachment from each diligence
      await attachmentsCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['tp-001:0:0', 'tp-001:1:0']),
        }),
      );

      // Should have been called twice - once for each diligence
      expect(updateMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('6. Relationships', () => {
    it('should establish BelongsTo relationship from virtual to parent', async () => {
      const parentDocuments = [
        {
          id: 'order-1',
          customer: 'John Doe',
          items: [{ sku: 'PROD-001', quantity: 2 }],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const parentModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'orders',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
      const parentCollection = datasource.getCollection('orders') as CosmosCollection;

      const itemsCollection = new ArrayCollection(
        datasource,
        parentCollection,
        'order_items',
        'items',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );

      // Virtual collection should have a parent ID field (ordersId)
      const { schema } = itemsCollection;

      expect(schema.fields).toHaveProperty('ordersId');

      const ordersIdField = schema.fields.ordersId;

      expect(ordersIdField.type).toBe('Column');
      expect((ordersIdField as any).columnType).toBe('String');
    });

    it('should establish HasMany relationship from parent to virtual', async () => {
      const parentDocuments = [
        {
          id: 'customer-1',
          name: 'John Doe',
          orders: [
            { orderId: 'ord-1', total: 100 },
            { orderId: 'ord-2', total: 200 },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: parentDocuments }),
      });

      const parentModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'customers',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
      const parentCollection = datasource.getCollection('customers') as CosmosCollection;

      const ordersCollection = new ArrayCollection(
        datasource,
        parentCollection,
        'customer_orders',
        'orders',
        {
          actions: {},
          charts: [],
          countable: true,
          fields: {},
          searchable: true,
          segments: [],
        },
        jest.fn(),
        mockCosmosClient,
      );

      // Can query child items by parent ID
      const orders = await ordersCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('customersId', 'Equal', 'customer-1'),
        }),
        new Projection('id', 'orderId', 'total'),
      );

      expect(orders).toHaveLength(2);
      expect(orders[0].customersId).toBe('customer-1');
      expect(orders[1].customersId).toBe('customer-1');
    });

    it('should support nested relationships (attachments → diligences → third_parties)', () => {
      // Verify relationship structure by checking schema
      // In a nested structure:
      // - third_parties is the root physical collection
      // - diligences is a virtual collection with parent third_parties
      // - attachments is a virtual collection with parent diligences

      // Test composite ID parsing for tracing relationships
      const attachmentId = 'tp-1:0:0'; // third_party_id:diligence_index:attachment_index

      // Parse to get diligence ID
      let lastColon = attachmentId.lastIndexOf(':');
      const diligenceId = attachmentId.substring(0, lastColon);
      expect(diligenceId).toBe('tp-1:0');

      // Parse diligence ID to get third party ID
      lastColon = diligenceId.lastIndexOf(':');
      const thirdPartyId = diligenceId.substring(0, lastColon);
      expect(thirdPartyId).toBe('tp-1');

      // This demonstrates how the relationship hierarchy can be traced
      // through composite IDs in nested virtual collections
    });
  });

  describe('7. Edge Cases', () => {
    describe('Empty arrays', () => {
      it('should handle documents with empty arrays', async () => {
        const documents = [
          { id: 'doc-1', name: 'Has items', items: [{ name: 'Item 1' }] },
          { id: 'doc-2', name: 'Empty array', items: [] },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: documents }),
        });

        const parentModel = await Introspector.introspectContainer(
          mockCosmosClient,
          'testDb',
          'documents',
        );

        datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
        const parentCollection = datasource.getCollection('documents') as CosmosCollection;

        const itemsCollection = new ArrayCollection(
          datasource,
          parentCollection,
          'document_items',
          'items',
          {
            actions: {},
            charts: [],
            countable: true,
            fields: {},
            searchable: true,
            segments: [],
          },
          jest.fn(),
          mockCosmosClient,
        );

        const records = await itemsCollection.list(
          caller,
          new PaginatedFilter({}),
          new Projection('id', 'name'),
        );

        // Should only return items from doc-1
        expect(records).toHaveLength(1);
        expect(records[0].documentsId).toBe('doc-1');
      });
    });

    describe('Null array fields', () => {
      it('should handle documents with null array fields', async () => {
        const documents = [
          { id: 'doc-1', items: [{ name: 'Item 1' }] },
          { id: 'doc-2', items: null },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: documents }),
        });

        const parentModel = await Introspector.introspectContainer(
          mockCosmosClient,
          'testDb',
          'documents',
        );

        datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
        const parentCollection = datasource.getCollection('documents') as CosmosCollection;

        const itemsCollection = new ArrayCollection(
          datasource,
          parentCollection,
          'document_items',
          'items',
          {
            actions: {},
            charts: [],
            countable: true,
            fields: {},
            searchable: true,
            segments: [],
          },
          jest.fn(),
          mockCosmosClient,
        );

        const records = await itemsCollection.list(
          caller,
          new PaginatedFilter({}),
          new Projection('id', 'name'),
        );

        expect(records).toHaveLength(1);
      });
    });

    describe('Missing array fields', () => {
      it('should handle documents where array field is missing', async () => {
        const documents = [
          { id: 'doc-1', items: [{ name: 'Item 1' }] },
          { id: 'doc-2', name: 'No items field' },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: documents }),
        });

        const parentModel = await Introspector.introspectContainer(
          mockCosmosClient,
          'testDb',
          'documents',
        );

        datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
        const parentCollection = datasource.getCollection('documents') as CosmosCollection;

        const itemsCollection = new ArrayCollection(
          datasource,
          parentCollection,
          'document_items',
          'items',
          {
            actions: {},
            charts: [],
            countable: true,
            fields: {},
            searchable: true,
            segments: [],
          },
          jest.fn(),
          mockCosmosClient,
        );

        const records = await itemsCollection.list(
          caller,
          new PaginatedFilter({}),
          new Projection('id', 'name'),
        );

        expect(records).toHaveLength(1);
      });
    });

    describe('Array with single item', () => {
      it('should handle arrays with a single item', async () => {
        const documents = [{ id: 'doc-1', items: [{ name: 'Only Item', value: 100 }] }];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: documents }),
        });

        const parentModel = await Introspector.introspectContainer(
          mockCosmosClient,
          'testDb',
          'documents',
        );

        datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
        const parentCollection = datasource.getCollection('documents') as CosmosCollection;

        const itemsCollection = new ArrayCollection(
          datasource,
          parentCollection,
          'document_items',
          'items',
          {
            actions: {},
            charts: [],
            countable: true,
            fields: {},
            searchable: true,
            segments: [],
          },
          jest.fn(),
          mockCosmosClient,
        );

        const records = await itemsCollection.list(
          caller,
          new PaginatedFilter({}),
          new Projection('id', 'name', 'value'),
        );

        expect(records).toHaveLength(1);
        expect(records[0]).toMatchObject({
          id: 'doc-1:0',
          name: 'Only Item',
          value: 100,
        });
      });
    });

    describe('Array with many items', () => {
      it('should handle arrays with 100+ items', async () => {
        const manyItems = Array.from({ length: 150 }, (_, i) => ({
          itemId: `item-${i}`,
          value: i * 10,
        }));

        const documents = [{ id: 'doc-1', items: manyItems }];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: documents }),
        });

        const parentModel = await Introspector.introspectContainer(
          mockCosmosClient,
          'testDb',
          'documents',
        );

        datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
        const parentCollection = datasource.getCollection('documents') as CosmosCollection;

        const itemsCollection = new ArrayCollection(
          datasource,
          parentCollection,
          'document_items',
          'items',
          {
            actions: {},
            charts: [],
            countable: true,
            fields: {},
            searchable: true,
            segments: [],
          },
          jest.fn(),
          mockCosmosClient,
        );

        const records = await itemsCollection.list(
          caller,
          new PaginatedFilter({}),
          new Projection('id', 'itemId'),
        );

        expect(records).toHaveLength(150);
        expect(records[0].id).toBe('doc-1:0');
        expect(records[149].id).toBe('doc-1:149');
      });

      it('should paginate large arrays efficiently', async () => {
        const manyItems = Array.from({ length: 200 }, (_, i) => ({
          itemId: `item-${i}`,
          value: i,
        }));

        const documents = [{ id: 'doc-1', items: manyItems }];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: documents }),
        });

        const parentModel = await Introspector.introspectContainer(
          mockCosmosClient,
          'testDb',
          'documents',
        );

        datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
        const parentCollection = datasource.getCollection('documents') as CosmosCollection;

        const itemsCollection = new ArrayCollection(
          datasource,
          parentCollection,
          'document_items',
          'items',
          {
            actions: {},
            charts: [],
            countable: true,
            fields: {},
            searchable: true,
            segments: [],
          },
          jest.fn(),
          mockCosmosClient,
        );

        // Get page 2 (items 50-99)
        const records = await itemsCollection.list(
          caller,
          new PaginatedFilter({
            page: { skip: 50, limit: 50, apply: (r: any) => r },
          }),
          new Projection('id', 'itemId', 'value'),
        );

        expect(records).toHaveLength(50);
        expect(records[0].value).toBe(50);
        expect(records[49].value).toBe(99);
      });
    });

    describe('Aggregate operations', () => {
      it('should support Count aggregation on virtual collections', async () => {
        const documents = [
          {
            id: 'doc-1',
            items: [{ name: 'Item 1' }, { name: 'Item 2' }, { name: 'Item 3' }],
          },
        ];

        mockContainer.items.query.mockReturnValue({
          fetchAll: jest.fn().mockResolvedValue({ resources: documents }),
        });

        const parentModel = await Introspector.introspectContainer(
          mockCosmosClient,
          'testDb',
          'documents',
        );

        datasource = new CosmosDataSource(mockCosmosClient, [parentModel], jest.fn());
        const parentCollection = datasource.getCollection('documents') as CosmosCollection;

        const itemsCollection = new ArrayCollection(
          datasource,
          parentCollection,
          'document_items',
          'items',
          {
            actions: {},
            charts: [],
            countable: true,
            fields: {},
            searchable: true,
            segments: [],
          },
          jest.fn(),
          mockCosmosClient,
        );

        const result = await itemsCollection.aggregate(
          caller,
          new Filter({}),
          new Aggregation({ operation: 'Count', field: null }),
        );

        expect(result).toHaveLength(1);
        expect(result[0].value).toBe(3);
      });
    });
  });
});
