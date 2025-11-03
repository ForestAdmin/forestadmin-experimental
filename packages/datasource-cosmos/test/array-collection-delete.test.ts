/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Comprehensive Delete Tests for ArrayCollection
 *
 * These tests ensure the delete method works correctly in all scenarios:
 * 1. Simple deletes by composite ID (Equal/In operators)
 * 2. Forest Admin's AND condition pattern
 * 3. Complex filter fallback scenarios
 * 4. Nested virtual collection deletes
 * 5. Safety checks (no filter protection)
 * 6. Edge cases (multiple parents, empty arrays, etc.)
 */
import { CosmosClient } from '@azure/cosmos';
import {
  Caller,
  ConditionTreeBranch,
  ConditionTreeLeaf,
  Filter,
  Projection,
} from '@forestadmin/datasource-toolkit';

import ArrayCollection from '../src/array-collection';
import CosmosCollection from '../src/collection';
import CosmosDataSource from '../src/datasource';
import Introspector from '../src/introspection/introspector';

describe('ArrayCollection - Delete Method Comprehensive Tests', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockContainer: any;
  let mockDatabase: any;
  let datasource: CosmosDataSource;
  let caller: Caller;
  let arrayCollection: ArrayCollection;
  let parentCollection: CosmosCollection;
  let parentDocuments: any[];

  beforeEach(async () => {
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

    caller = {} as Caller;

    // Setup parent documents with array fields
    parentDocuments = [
      {
        id: 'parent-1',
        name: 'Parent One',
        items: [
          { sku: 'PROD-001', quantity: 2, price: 29.99 },
          { sku: 'PROD-002', quantity: 1, price: 49.99 },
          { sku: 'PROD-003', quantity: 3, price: 19.99 },
        ],
      },
      {
        id: 'parent-2',
        name: 'Parent Two',
        items: [
          { sku: 'PROD-004', quantity: 5, price: 39.99 },
          { sku: 'PROD-005', quantity: 2, price: 24.99 },
        ],
      },
      {
        id: 'parent-3',
        name: 'Parent Three',
        items: [{ sku: 'PROD-006', quantity: 1, price: 99.99 }],
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

  describe('1. Simple Delete by Composite ID - Equal Operator', () => {
    it('should delete a single item by composite ID', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2, price: 29.99 },
            { sku: 'PROD-002', quantity: 1, price: 49.99 },
            { sku: 'PROD-003', quantity: 3, price: 19.99 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Delete the item at index 1 (PROD-002)
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:1'),
        }),
      );

      // Verify parent.list was called to fetch the parent document
      expect(mockParentList).toHaveBeenCalledTimes(1);
      expect(mockParentList).toHaveBeenCalledWith(
        caller,
        expect.objectContaining({
          conditionTree: expect.objectContaining({
            field: 'id',
            operator: 'Equal',
            value: 'parent-1',
          }),
        }),
        expect.any(Projection),
      );

      // Verify parent.update was called with the modified array
      expect(mockParentUpdate).toHaveBeenCalledTimes(1);

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      // Should have removed the item at index 1
      expect(updatedItems).toHaveLength(2);
      expect(updatedItems[0].sku).toBe('PROD-001');
      expect(updatedItems[1].sku).toBe('PROD-003'); // PROD-002 was removed
    });

    it('should delete the first item in an array', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:0'),
        }),
      );

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].sku).toBe('PROD-002');
    });

    it('should delete the last item in an array', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:1'),
        }),
      );

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].sku).toBe('PROD-001');
    });

    it('should delete the only item in an array (making it empty)', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-3',
          items: [{ sku: 'PROD-006', quantity: 1 }],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-3:0'),
        }),
      );

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      expect(updatedItems).toHaveLength(0);
    });
  });

  describe('2. Simple Delete by Composite ID - In Operator', () => {
    it('should delete multiple items from the same parent', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
            { sku: 'PROD-003', quantity: 3 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Delete items at indices 0 and 2
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['parent-1:0', 'parent-1:2']),
        }),
      );

      // Should only call update once since both items are from the same parent
      expect(mockParentUpdate).toHaveBeenCalledTimes(1);

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      // Should have only PROD-002 remaining
      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].sku).toBe('PROD-002');
    });

    it('should delete items from different parents (CRITICAL: not all parents)', async () => {
      // This is the critical bug scenario - ensure delete ONLY affects specified parents
      const mockParentList = jest.fn().mockImplementation((_caller, filter) => {
        const parentId = filter.conditionTree?.value;

        if (parentId === 'parent-1') {
          return Promise.resolve([
            {
              id: 'parent-1',
              items: [
                { sku: 'PROD-001', quantity: 2 },
                { sku: 'PROD-002', quantity: 1 },
              ],
            },
          ]);
        }

        if (parentId === 'parent-2') {
          return Promise.resolve([
            {
              id: 'parent-2',
              items: [
                { sku: 'PROD-004', quantity: 5 },
                { sku: 'PROD-005', quantity: 2 },
              ],
            },
          ]);
        }

        return Promise.resolve([]);
      });

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Delete one item from parent-1 and one from parent-2
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['parent-1:0', 'parent-2:1']),
        }),
      );

      // Should call update twice - once for each parent
      expect(mockParentUpdate).toHaveBeenCalledTimes(2);

      // Verify first update (parent-1)
      const firstUpdate = mockParentUpdate.mock.calls[0];

      expect(firstUpdate[1].conditionTree.value).toBe('parent-1');

      const firstUpdatedItems = firstUpdate[2].items;

      expect(firstUpdatedItems).toHaveLength(1);
      expect(firstUpdatedItems[0].sku).toBe('PROD-002');

      // Verify second update (parent-2)
      const secondUpdate = mockParentUpdate.mock.calls[1];

      expect(secondUpdate[1].conditionTree.value).toBe('parent-2');

      const secondUpdatedItems = secondUpdate[2].items;

      expect(secondUpdatedItems).toHaveLength(1);
      expect(secondUpdatedItems[0].sku).toBe('PROD-004');
    });

    it('should handle deleting all items from multiple parents', async () => {
      const mockParentList = jest.fn().mockImplementation((_caller, filter) => {
        const parentId = filter.conditionTree?.value;

        if (parentId === 'parent-1') {
          return Promise.resolve([
            {
              id: 'parent-1',
              items: [{ sku: 'PROD-001', quantity: 2 }],
            },
          ]);
        }

        if (parentId === 'parent-2') {
          return Promise.resolve([
            {
              id: 'parent-2',
              items: [{ sku: 'PROD-004', quantity: 5 }],
            },
          ]);
        }

        return Promise.resolve([]);
      });

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['parent-1:0', 'parent-2:0']),
        }),
      );

      expect(mockParentUpdate).toHaveBeenCalledTimes(2);

      // Both parents should have empty arrays
      const firstUpdatedItems = mockParentUpdate.mock.calls[0][2].items;
      const secondUpdatedItems = mockParentUpdate.mock.calls[1][2].items;

      expect(firstUpdatedItems).toHaveLength(0);
      expect(secondUpdatedItems).toHaveLength(0);
    });
  });

  describe('3. Forest Admin AND Condition Pattern (Critical Bug Fix)', () => {
    it('should handle Forest Admin delete pattern with AND condition', async () => {
      // This is the exact pattern Forest Admin sends when deleting from UI
      // Example: { And: [{ id: Equal: "parent-1:0" }, { parentsId: Equal: "parent-1" }] }
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
            { sku: 'PROD-003', quantity: 3 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Create the AND condition that Forest Admin sends
      const andCondition = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('id', 'Equal', 'parent-1:1'),
        new ConditionTreeLeaf('parentsId', 'Equal', 'parent-1'),
      ]);

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: andCondition,
        }),
      );

      // Should have parsed the composite ID from the AND condition
      expect(mockParentUpdate).toHaveBeenCalledTimes(1);

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      // Should have deleted only item at index 1 (PROD-002)
      expect(updatedItems).toHaveLength(2);
      expect(updatedItems[0].sku).toBe('PROD-001');
      expect(updatedItems[1].sku).toBe('PROD-003');
    });

    it('should handle AND condition with In operator for multiple deletes', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
            { sku: 'PROD-003', quantity: 3 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      const andCondition = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('id', 'In', ['parent-1:0', 'parent-1:2']),
        new ConditionTreeLeaf('parentsId', 'Equal', 'parent-1'),
      ]);

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: andCondition,
        }),
      );

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      // Should have deleted items at indices 0 and 2
      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].sku).toBe('PROD-002');
    });

    it('should NOT delete from all parents when using AND condition with specific ID', async () => {
      // CRITICAL TEST: This ensures the bug is fixed
      // Previously, delete would affect ALL parents, not just the specified one
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      const andCondition = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('id', 'Equal', 'parent-1:0'),
        new ConditionTreeLeaf('parentsId', 'Equal', 'parent-1'),
      ]);

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: andCondition,
        }),
      );

      // Verify that update was called with the SPECIFIC parent ID
      expect(mockParentUpdate).toHaveBeenCalledTimes(1);

      const updateCall = mockParentUpdate.mock.calls[0];
      const filterUsed = updateCall[1];

      // The filter should target parent-1 specifically
      expect(filterUsed.conditionTree.field).toBe('id');
      expect(filterUsed.conditionTree.value).toBe('parent-1');

      // Verify only the correct item was deleted
      const updatedItems = updateCall[2].items;

      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].sku).toBe('PROD-002');
    });
  });

  describe('4. Complex Filter Fallback', () => {
    it('should use list() fallback for field-based filters', async () => {
      // When filtering by a field value (not ID), should use list() to resolve records
      const mockArrayCollectionList = jest
        .fn()
        .mockResolvedValue([{ id: 'parent-1:1', sku: 'PROD-002', parentsId: 'parent-1' }]);

      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
            { sku: 'PROD-003', quantity: 3 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      // Mock arrayCollection.list to return the filtered results
      arrayCollection.list = mockArrayCollectionList;
      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Delete by field value (requires fallback to list())
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('sku', 'Equal', 'PROD-002'),
        }),
      );

      // Should have called arrayCollection.list to resolve the composite IDs
      expect(mockArrayCollectionList).toHaveBeenCalled();

      // Then should delete the resolved item
      expect(mockParentUpdate).toHaveBeenCalledTimes(1);

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      expect(updatedItems).toHaveLength(2);
      expect(updatedItems.find((i: any) => i.sku === 'PROD-002')).toBeUndefined();
    });

    it('should handle complex OR conditions via fallback', async () => {
      const mockArrayCollectionList = jest.fn().mockResolvedValue([
        { id: 'parent-1:0', sku: 'PROD-001' },
        { id: 'parent-1:2', sku: 'PROD-003' },
      ]);

      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
            { sku: 'PROD-003', quantity: 3 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      arrayCollection.list = mockArrayCollectionList;
      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Complex OR condition
      const orCondition = new ConditionTreeBranch('Or', [
        new ConditionTreeLeaf('sku', 'Equal', 'PROD-001'),
        new ConditionTreeLeaf('sku', 'Equal', 'PROD-003'),
      ]);

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: orCondition,
        }),
      );

      expect(mockArrayCollectionList).toHaveBeenCalled();
      expect(mockParentUpdate).toHaveBeenCalledTimes(1);

      const updatedItems = mockParentUpdate.mock.calls[0][2].items;

      expect(updatedItems).toHaveLength(1);
      expect(updatedItems[0].sku).toBe('PROD-002');
    });
  });

  describe('5. Nested Virtual Collection Deletes', () => {
    let diligencesCollection: ArrayCollection;
    let attachmentsCollection: ArrayCollection;
    let thirdPartiesCollection: CosmosCollection;
    let nestedParentDocuments: any[];

    beforeEach(async () => {
      nestedParentDocuments = [
        {
          id: 'tp-001',
          name: 'Third Party A',
          diligences: [
            {
              type: 'KYC',
              status: 'completed',
              attachments: [
                { name: 'passport.pdf', size: 1024 },
                { name: 'address.pdf', size: 2048 },
              ],
            },
            {
              type: 'AML',
              status: 'pending',
              attachments: [{ name: 'report.pdf', size: 4096 }],
            },
          ],
        },
      ];

      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: nestedParentDocuments }),
      });

      const tpModel = await Introspector.introspectContainer(
        mockCosmosClient,
        'testDb',
        'third_parties',
      );

      datasource = new CosmosDataSource(mockCosmosClient, [tpModel], jest.fn());
      thirdPartiesCollection = datasource.getCollection('third_parties') as CosmosCollection;

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

      diligencesCollection.setVirtualizedChildFields(['attachments']);

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

    it('should delete from nested virtual collection without affecting siblings', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: nestedParentDocuments }),
      });

      const mockThirdPartiesUpdate = jest.fn().mockResolvedValue(undefined);
      const mockDiligencesUpdate = jest.fn().mockResolvedValue(undefined);

      (thirdPartiesCollection as any).update = mockThirdPartiesUpdate;
      (diligencesCollection as any).update = mockDiligencesUpdate;

      // Delete attachment tp-001:0:1 (second attachment of first diligence)
      await attachmentsCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'tp-001:0:1'),
        }),
      );

      // Should have updated the diligences collection
      expect(mockDiligencesUpdate).toHaveBeenCalled();

      const updateCall = mockDiligencesUpdate.mock.calls[0];
      const updatedAttachments = updateCall[2].attachments;

      // Should have removed only the second attachment
      expect(updatedAttachments).toHaveLength(1);
      expect(updatedAttachments[0].name).toBe('passport.pdf');
    });

    it('should delete from different nested parents independently', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: nestedParentDocuments }),
      });

      const mockDiligencesUpdate = jest.fn().mockResolvedValue(undefined);

      (diligencesCollection as any).update = mockDiligencesUpdate;

      // Delete one attachment from first diligence and one from second diligence
      await attachmentsCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', ['tp-001:0:0', 'tp-001:1:0']),
        }),
      );

      // Should have called update twice - once for each diligence
      expect(mockDiligencesUpdate).toHaveBeenCalledTimes(2);
    });

    it('should handle AND condition pattern for nested collections', async () => {
      mockContainer.items.query.mockReturnValue({
        fetchAll: jest.fn().mockResolvedValue({ resources: nestedParentDocuments }),
      });

      const mockDiligencesUpdate = jest.fn().mockResolvedValue(undefined);

      (diligencesCollection as any).update = mockDiligencesUpdate;

      const andCondition = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('id', 'Equal', 'tp-001:0:1'),
        new ConditionTreeLeaf('diligencesId', 'Equal', 'tp-001:0'),
      ]);

      await attachmentsCollection.delete(
        caller,
        new Filter({
          conditionTree: andCondition,
        }),
      );

      expect(mockDiligencesUpdate).toHaveBeenCalledTimes(1);

      const updateCall = mockDiligencesUpdate.mock.calls[0];
      const updatedAttachments = updateCall[2].attachments;

      expect(updatedAttachments).toHaveLength(1);
      expect(updatedAttachments[0].name).toBe('passport.pdf');
    });
  });

  describe('6. Safety Checks and Error Handling', () => {
    it('should throw error when trying to delete without a filter', async () => {
      // This is critical - should NEVER allow delete without filter
      await expect(
        arrayCollection.delete(
          caller,
          new Filter({
            conditionTree: undefined,
          }),
        ),
      ).rejects.toThrow(/Cannot delete from virtual collection.*without a filter/);
    });

    it('should throw error with helpful message about affecting all parents', async () => {
      await expect(
        arrayCollection.delete(
          caller,
          new Filter({
            conditionTree: undefined,
          }),
        ),
      ).rejects.toThrow(/This would affect all parent records/);
    });

    it('should handle gracefully when parent document not found', async () => {
      const mockParentList = jest.fn().mockResolvedValue([]);

      (parentCollection as any).list = mockParentList;

      // Try to delete an item from a non-existent parent
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'nonexistent-parent:0'),
        }),
      );

      // Should not throw error, just silently handle the case
      expect(mockParentList).toHaveBeenCalled();
    });

    it('should handle gracefully when index is out of bounds', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [{ sku: 'PROD-001', quantity: 2 }],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Try to delete item at index 99 (doesn't exist)
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:99'),
        }),
      );

      // Should have called list but NOT update (nothing to delete)
      expect(mockParentList).toHaveBeenCalled();

      // Update should still be called, but the array should be unchanged
      // because the index was out of bounds
      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      expect(updatedItems).toHaveLength(1); // No change
    });
  });

  describe('7. Edge Cases', () => {
    it('should handle deleting multiple items in reverse index order', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001' },
            { sku: 'PROD-002' },
            { sku: 'PROD-003' },
            { sku: 'PROD-004' },
            { sku: 'PROD-005' },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Delete indices 1, 2, 4 (should be removed in reverse order to avoid shifting issues)
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', [
            'parent-1:1',
            'parent-1:2',
            'parent-1:4',
          ]),
        }),
      );

      const updateCall = mockParentUpdate.mock.calls[0];
      const updatedItems = updateCall[2].items;

      // Should have PROD-001 and PROD-004 remaining
      expect(updatedItems).toHaveLength(2);
      expect(updatedItems[0].sku).toBe('PROD-001');
      expect(updatedItems[1].sku).toBe('PROD-004');
    });

    it('should handle empty parent arrays gracefully', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:0'),
        }),
      );

      // Should handle gracefully without errors
      expect(mockParentList).toHaveBeenCalled();
    });

    it('should handle parent with null array field', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: null,
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:0'),
        }),
      );

      // Should not throw error and should have called list
      expect(mockParentList).toHaveBeenCalled();
      // Update might be called with null/empty array - that's okay
    });

    it('should correctly handle deletions across 10+ parents', async () => {
      // Test scalability - deleting from many parents at once
      const compositeIds = Array.from({ length: 15 }, (_, i) => `parent-${i}:0`);

      const mockParentList = jest.fn().mockImplementation((_caller, filter) => {
        const parentId = filter.conditionTree?.value;

        return Promise.resolve([
          {
            id: parentId,
            items: [{ sku: 'PROD-001', quantity: 1 }],
          },
        ]);
      });

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'In', compositeIds),
        }),
      );

      // Should have called update once for each parent
      expect(mockParentUpdate).toHaveBeenCalledTimes(15);
    });

    it('should preserve item order after deletion', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'A', order: 1 },
            { sku: 'B', order: 2 },
            { sku: 'C', order: 3 },
            { sku: 'D', order: 4 },
            { sku: 'E', order: 5 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      // Delete item at index 2 (C)
      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:2'),
        }),
      );

      const updatedItems = mockParentUpdate.mock.calls[0][2].items;

      // Verify order is preserved
      expect(updatedItems.map((i: any) => i.sku)).toEqual(['A', 'B', 'D', 'E']);
      expect(updatedItems.map((i: any) => i.order)).toEqual([1, 2, 4, 5]);
    });
  });

  describe('8. Integration with Parent Collection Updates', () => {
    it('should pass correct filter to parent.list when fetching parent document', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [{ sku: 'PROD-001' }],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:0'),
        }),
      );

      // Verify the filter passed to parent.list
      const listCall = mockParentList.mock.calls[0];

      expect(listCall[1].conditionTree.field).toBe('id');
      expect(listCall[1].conditionTree.operator).toBe('Equal');
      expect(listCall[1].conditionTree.value).toBe('parent-1');
    });

    it('should pass correct filter to parent.update when updating parent document', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [{ sku: 'PROD-001' }, { sku: 'PROD-002' }],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:0'),
        }),
      );

      // Verify the filter passed to parent.update
      const updateCall = mockParentUpdate.mock.calls[0];

      expect(updateCall[1].conditionTree.field).toBe('id');
      expect(updateCall[1].conditionTree.operator).toBe('Equal');
      expect(updateCall[1].conditionTree.value).toBe('parent-1');
    });

    it('should pass modified array as patch to parent.update', async () => {
      const mockParentList = jest.fn().mockResolvedValue([
        {
          id: 'parent-1',
          items: [
            { sku: 'PROD-001', quantity: 2 },
            { sku: 'PROD-002', quantity: 1 },
          ],
        },
      ]);

      const mockParentUpdate = jest.fn().mockResolvedValue(undefined);

      (parentCollection as any).list = mockParentList;
      (parentCollection as any).update = mockParentUpdate;

      await arrayCollection.delete(
        caller,
        new Filter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', 'parent-1:0'),
        }),
      );

      const updateCall = mockParentUpdate.mock.calls[0];
      const patch = updateCall[2];

      // Verify patch structure
      expect(patch).toHaveProperty('items');
      expect(patch.items).toBeInstanceOf(Array);
      expect(patch.items).toHaveLength(1);
      expect(patch.items[0].sku).toBe('PROD-002');
    });
  });
});
