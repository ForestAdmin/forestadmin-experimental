import { CosmosClient } from '@azure/cosmos';
import {
  Aggregation,
  Caller,
  CollectionSchema,
  ColumnSchema,
  ConditionTree,
  ConditionTreeLeaf,
  DataSource,
  Filter,
  Logger,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';

import CosmosCollection from './collection';
import ModelCosmos from './model-builder/model';

/**
 * ArrayCollection - A virtual collection that exposes array fields from a parent collection
 * as a separate collection with full CRUD support.
 *
 * This allows treating nested arrays (like kycDetails.diligences) as first-class collections
 * while keeping data stored in the parent document.
 */
export default class ArrayCollection extends CosmosCollection {
  private parentCollection: CosmosCollection;
  private arrayFieldPath: string;
  private parentIdField: string;
  private virtualizedChildFields: Set<string>;

  constructor(
    dataSource: DataSource,
    parentCollection: CosmosCollection,
    collectionName: string,
    arrayFieldPath: string,
    arrayItemSchema: CollectionSchema,
    logger?: Logger,
    cosmosClient?: CosmosClient,
    virtualizedChildFields?: string[],
  ) {
    // Get the parent model to extract Cosmos client info
    const parentModel = (parentCollection as unknown as { internalModel: ModelCosmos })
      .internalModel;

    logger?.(
      'Debug',
      `ArrayCollection constructor: parentCollection=${
        parentCollection?.name
      }, hasInternalModel=${!!parentModel}`,
    );

    if (!parentModel) {
      throw new Error(
        `Parent collection model is required. ParentCollection name: ${parentCollection?.name}`,
      );
    }

    // Use provided cosmosClient or get it from parent model
    const clientToUse = cosmosClient || parentModel.getCosmosClient();

    logger?.('Debug', `ArrayCollection: clientToUse=${!!clientToUse}`);

    if (!clientToUse) {
      throw new Error('CosmosClient is required to create ArrayCollection');
    }

    const dbName = parentModel.getDatabaseName();
    const containerName = parentModel.getContainerName();
    const partitionKeyPath = parentModel.getPartitionKeyPath();

    logger?.(
      'Debug',
      `ArrayCollection: dbName=${dbName}, containerName=${containerName}, ` +
        `partitionKeyPath=${partitionKeyPath}`,
    );

    // Create a minimal model for the array collection
    // This model won't be used for queries since we override all methods
    const dummyModel = new ModelCosmos(
      clientToUse,
      collectionName,
      dbName,
      containerName, // Use same container as parent
      partitionKeyPath,
      {}, // Empty schema, we'll override it
    );

    logger?.(
      'Debug',
      `ArrayCollection: dummyModel created, name=${dummyModel?.name}, isDefined=${!!dummyModel}`,
    );

    super(dataSource, dummyModel, logger, clientToUse);

    this.parentCollection = parentCollection;
    this.arrayFieldPath = arrayFieldPath;
    this.parentIdField = `${parentCollection.name}Id`;
    this.virtualizedChildFields = new Set(virtualizedChildFields || []);

    // Override the collection name
    Object.defineProperty(this, 'name', {
      value: collectionName,
      writable: false,
    });

    // Build schema with composite ID and parent reference
    const newSchema = {
      ...arrayItemSchema,
      fields: {
        id: {
          columnType: 'String',
          filterOperators: new Set(['Equal', 'NotEqual', 'In', 'NotIn', 'Present', 'Missing']),
          isPrimaryKey: true,
          isReadOnly: true,
          isSortable: false,
          type: 'Column',
        } as ColumnSchema,
        [this.parentIdField]: {
          columnType: 'String',
          filterOperators: new Set([
            'Equal',
            'NotEqual',
            'In',
            'NotIn',
            'Present',
            'Missing',
            'Like',
            'ILike',
            'Contains',
            'NotContains',
          ]),
          isReadOnly: false,
          isSortable: true,
          type: 'Column',
        } as ColumnSchema,
        ...arrayItemSchema.fields,
      },
    };

    // Override the read-only schema property
    Object.defineProperty(this, 'schema', {
      value: newSchema,
      writable: false,
      configurable: true,
    });
  }

  /**
   * Set virtualized child fields (fields that have been converted to virtual collections)
   */
  public setVirtualizedChildFields(fields: string[]): void {
    this.virtualizedChildFields = new Set(fields);
  }

  /**
   * Parse composite ID to get parent ID and array index
   * For nested virtual collections, splits on the LAST ':' to handle multi-level IDs
   * e.g., "uuid:1:2" becomes parentId="uuid:1", index=2
   */
  private parseCompositeId(compositeId: string): { parentId: string; index: number } {
    const lastColonIndex = compositeId.lastIndexOf(':');

    if (lastColonIndex === -1) {
      throw new Error(`Invalid composite ID format: ${compositeId}`);
    }

    const parentId = compositeId.substring(0, lastColonIndex);
    const indexStr = compositeId.substring(lastColonIndex + 1);

    return { parentId, index: parseInt(indexStr, 10) };
  }

  /**
   * Create composite ID from parent ID and index
   */
  private createCompositeId(parentId: string, index: number): string {
    return `${parentId}:${index}`;
  }

  /**
   * Get the array field value from a parent record
   */
  private getArrayFromParent(parentRecord: RecordData): unknown[] {
    // First try the flattened field name (e.g., "kycDetails->diligences")
    // This is how the datasource returns projected fields
    if (parentRecord[this.arrayFieldPath] !== undefined) {
      const value = parentRecord[this.arrayFieldPath];

      return Array.isArray(value) ? value : [];
    }

    // Fall back to nested navigation for cases where data is nested
    const parts = this.arrayFieldPath.split('->');
    let value: unknown = parentRecord;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return [];
      }
    }

    return Array.isArray(value) ? value : [];
  }

  /**
   * Set the array field value in a parent record
   */
  private setArrayInParent(parentRecord: RecordData, newArray: unknown[]): RecordData {
    const parts = this.arrayFieldPath.split('->');
    const result = { ...parentRecord };
    let current: RecordData = result;

    // Navigate to the parent object containing the array
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];

      if (!current[part]) {
        current[part] = {};
      }

      current[part] = { ...current[part] };
      current = current[part];
    }

    // Set the array
    current[parts[parts.length - 1]] = newArray;

    return result;
  }

  /**
   * List array items from parent collection
   */
  override async list(
    caller: Caller,
    filter: PaginatedFilter,
    projection: Projection,
  ): Promise<RecordData[]> {
    // Extract filters
    const conditionTree = filter?.conditionTree;
    let parentFilter: PaginatedFilter | undefined;
    let filterByCompositeId: string[] | undefined;

    // Check if conditionTree is a leaf node (has 'field' property)
    const isLeaf = conditionTree && 'field' in conditionTree && 'operator' in conditionTree;

    if (isLeaf) {
      const leaf = conditionTree as ConditionTreeLeaf;

      if (leaf.field === this.parentIdField) {
        // Filter by parent ID
        parentFilter = new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', leaf.operator, leaf.value),
        });
      } else if (leaf.field === 'id') {
        // Filter by composite ID (e.g., "parent-id:0")
        if (leaf.operator === 'Equal') {
          filterByCompositeId = [leaf.value as string];
        } else if (leaf.operator === 'In') {
          filterByCompositeId = leaf.value as string[];
        }

        // Optimize by only fetching the parent IDs we need
        if (filterByCompositeId) {
          const parentIds = filterByCompositeId.map(cid => this.parseCompositeId(cid).parentId);
          const uniqueParentIds = Array.from(new Set(parentIds));

          if (uniqueParentIds.length === 1) {
            parentFilter = new PaginatedFilter({
              conditionTree: new ConditionTreeLeaf('id', 'Equal', uniqueParentIds[0]),
            });
          } else if (uniqueParentIds.length > 1) {
            parentFilter = new PaginatedFilter({
              conditionTree: new ConditionTreeLeaf('id', 'In', uniqueParentIds),
            });
          }
        }
      }
    }

    // Fetch parent records with the array field
    const parentRecords = await this.parentCollection.list(
      caller,
      parentFilter || new PaginatedFilter({}),
      new Projection('id', this.arrayFieldPath),
    );

    // Flatten array items from all parents
    const arrayItems: RecordData[] = [];

    for (const parentRecord of parentRecords) {
      const parentId = parentRecord.id as string;
      const arrayValues = this.getArrayFromParent(parentRecord);

      arrayValues.forEach((item, index) => {
        // Filter out virtualized child fields (if any are configured)
        // UNLESS they are explicitly requested in the projection
        const filteredItem = { ...(item as Record<string, unknown>) };

        if (this.virtualizedChildFields && this.virtualizedChildFields.size > 0) {
          // Get list of requested fields from projection
          // Projection is array-like, convert to array for checking
          const projectionFields = projection ? Array.from(projection as unknown as string[]) : [];
          const hasProjection = projectionFields.length > 0;

          for (const field of this.virtualizedChildFields) {
            // Only filter out if:
            // 1. There IS a projection (not requesting all fields), AND
            // 2. The virtualized field is NOT in the projection
            const shouldFilter = hasProjection && !projectionFields.includes(field);

            if (shouldFilter) {
              delete filteredItem[field];
            }
          }
        }

        arrayItems.push({
          id: this.createCompositeId(parentId, index),
          [this.parentIdField]: parentId,
          ...filteredItem,
        });
      });
    }

    // Apply composite ID filter if present
    let filteredItems = arrayItems;

    if (filterByCompositeId) {
      const idSet = new Set(filterByCompositeId);
      filteredItems = arrayItems.filter(item => idSet.has(item.id as string));
    } else if (conditionTree) {
      // Apply general field filtering (for non-ID fields)
      filteredItems = this.applyConditionTree(arrayItems, conditionTree);
    }

    // Apply sorting
    if (filter?.sort && filter.sort.length > 0) {
      filteredItems = this.applySorting(filteredItems, filter.sort);
    }

    // Apply pagination
    const { limit, skip } = filter?.page || { limit: undefined, skip: undefined };
    const start = skip || 0;
    const end = limit ? start + limit : undefined;

    return filteredItems.slice(start, end);
  }

  /**
   * Apply condition tree filtering to items
   */
  private applyConditionTree(items: RecordData[], conditionTree: ConditionTree): RecordData[] {
    if (!conditionTree) return items;

    // Use duck typing to check if it's a leaf
    const isLeaf = 'field' in conditionTree && 'operator' in conditionTree;

    // Handle ConditionTreeLeaf (single condition)
    if (isLeaf) {
      const leaf = conditionTree as ConditionTreeLeaf;
      const { field, operator, value } = leaf;

      // Skip ID and parentId filters as they're handled separately
      if (field === 'id' || field === this.parentIdField) {
        return items;
      }

      return items.filter(item => this.matchesCondition(item, field, operator, value));
    }

    // Handle ConditionTreeBranch (AND/OR logic)
    if ('aggregator' in conditionTree && conditionTree.aggregator) {
      const branch = conditionTree as unknown as {
        aggregator: string;
        conditions: ConditionTree[];
      };
      const { aggregator, conditions } = branch;

      if (aggregator === 'And') {
        return items.filter(item =>
          conditions.every(cond => this.applyConditionTree([item], cond).length > 0),
        );
      }

      if (aggregator === 'Or') {
        return items.filter(item =>
          conditions.some(cond => this.applyConditionTree([item], cond).length > 0),
        );
      }
    }

    return items;
  }

  /**
   * Check if a record matches a condition
   */
  private matchesCondition(
    record: RecordData,
    field: string,
    operator: string,
    value: unknown,
  ): boolean {
    const fieldValue = record[field];

    switch (operator) {
      case 'Equal':
        return fieldValue === value;
      case 'NotEqual':
        return fieldValue !== value;
      case 'In':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'NotIn':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'Present':
        return fieldValue !== null && fieldValue !== undefined;
      case 'Missing':
        return fieldValue === null || fieldValue === undefined;
      case 'LessThan':
        return fieldValue < value;
      case 'LessThanOrEqual':
        return fieldValue <= value;
      case 'GreaterThan':
        return fieldValue > value;
      case 'GreaterThanOrEqual':
        return fieldValue >= value;
      case 'Contains':
        return (
          typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value)
        );
      case 'NotContains':
        return (
          typeof fieldValue === 'string' && typeof value === 'string' && !fieldValue.includes(value)
        );
      case 'StartsWith':
        return (
          typeof fieldValue === 'string' &&
          typeof value === 'string' &&
          fieldValue.startsWith(value)
        );
      case 'EndsWith':
        return (
          typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.endsWith(value)
        );
      case 'IContains':
        return (
          typeof fieldValue === 'string' &&
          typeof value === 'string' &&
          fieldValue.toLowerCase().includes(value.toLowerCase())
        );
      case 'Like':
      case 'ILike':
        // Simple wildcard matching (% for any characters, _ for single character)
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
          const regex = new RegExp(`^${pattern}$`, operator === 'ILike' ? 'i' : '');

          return regex.test(fieldValue);
        }

        return false;
      default:
        console.warn(`[ArrayCollection] Unsupported operator: ${operator}`);

        return true; // Don't filter out if we don't know the operator
    }
  }

  /**
   * Apply sorting to items
   */
  private applySorting(
    items: RecordData[],
    sort: Array<{ field: string; ascending: boolean }>,
  ): RecordData[] {
    return [...items].sort((a, b) => {
      for (const { field, ascending } of sort) {
        const aValue = a[field];
        const bValue = b[field];

        // Handle null/undefined - skip to next sort criteria if both are null
        if (aValue == null && bValue == null) {
          // Both null, continue to next sort field
        } else if (aValue == null) {
          return ascending ? 1 : -1;
        } else if (bValue == null) {
          return ascending ? -1 : 1;
        } else {
          // Compare values
          let comparison = 0;

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
          } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
          } else if (aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime();
          } else {
            // Fallback: convert to string and compare
            comparison = String(aValue).localeCompare(String(bValue));
          }

          if (comparison !== 0) {
            return ascending ? comparison : -comparison;
          }
        }
      }

      return 0;
    });
  }

  /**
   * Create a new array item
   */
  override async create(caller: Caller, data: RecordData[]): Promise<RecordData[]> {
    const results: RecordData[] = [];

    // Sequential execution required: each array item must be added one at a time to maintain
    // consistent ordering and prevent race conditions when multiple items target the same parent
    for (const item of data) {
      const parentId = item[this.parentIdField] as string;

      if (!parentId) {
        throw new Error(`${this.parentIdField} is required to create array items`);
      }

      // Remove parent ID and composite ID from the item data using destructuring
      const { id: unusedItemId, [this.parentIdField]: unusedParentIdValue, ...itemData } = item;
      void unusedItemId;
      void unusedParentIdValue;

      // Fetch the parent record
      // eslint-disable-next-line no-await-in-loop -- Sequential maintains consistent ordering
      const parentRecords = await this.parentCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', parentId),
        }),
        new Projection('id', this.arrayFieldPath),
      );

      if (parentRecords.length === 0) {
        throw new Error(`Parent record with id ${parentId} not found`);
      }

      const parentRecord = parentRecords[0];
      const currentArray = this.getArrayFromParent(parentRecord);

      // Add the new item to the array
      const newArray = [...currentArray, itemData];
      const newIndex = currentArray.length;

      // Update the parent record - sequential to prevent conflicts
      // eslint-disable-next-line no-await-in-loop -- Sequential prevents data conflicts
      await this.parentCollection.update(
        caller,
        new Filter({ conditionTree: new ConditionTreeLeaf('id', 'Equal', parentId) }),
        { [this.arrayFieldPath]: newArray },
      );

      results.push({
        id: this.createCompositeId(parentId, newIndex),
        [this.parentIdField]: parentId,
        ...itemData,
      });
    }

    return results;
  }

  /**
   * Update array items
   */
  override async update(caller: Caller, filter: Filter, patch: RecordData): Promise<void> {
    // List all records matching the filter
    const records = await this.list(caller, new PaginatedFilter(filter), new Projection('id'));

    // Sequential execution required: updating array items must be done one at a time
    // to prevent conflicts when multiple updates target the same parent document
    for (const record of records) {
      const { parentId, index } = this.parseCompositeId(record.id as string);

      // Fetch the parent record
      // eslint-disable-next-line no-await-in-loop -- Sequential prevents data conflicts
      const parentRecords = await this.parentCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', parentId),
        }),
        new Projection('id', this.arrayFieldPath),
      );

      // Skip if parent not found or item doesn't exist
      if (parentRecords.length > 0) {
        const parentRecord = parentRecords[0];
        const array = this.getArrayFromParent(parentRecord);

        if (array[index]) {
          // Remove parent ID and composite ID from the patch data using destructuring
          const {
            id: unusedItemId,
            [this.parentIdField]: unusedParentIdValue,
            ...patchData
          } = patch;
          void unusedItemId;
          void unusedParentIdValue;

          // Update the item at the specified index
          const currentItem =
            typeof array[index] === 'object' && array[index] !== null
              ? (array[index] as Record<string, unknown>)
              : {};
          array[index] = { ...currentItem, ...patchData };

          // Update the parent record - sequential to prevent conflicts
          // eslint-disable-next-line no-await-in-loop -- Sequential prevents data conflicts
          await this.parentCollection.update(
            caller,
            new Filter({ conditionTree: new ConditionTreeLeaf('id', 'Equal', parentId) }),
            { [this.arrayFieldPath]: array },
          );
        }
      }
    }
  }

  /**
   * Delete array items
   */
  override async delete(caller: Caller, filter: Filter): Promise<void> {
    // List all records matching the filter
    const records = await this.list(caller, new PaginatedFilter(filter), new Projection('id'));

    // Group by parent ID to minimize updates
    const recordsByParent = new Map<string, number[]>();

    for (const record of records) {
      const { parentId, index } = this.parseCompositeId(record.id as string);

      if (!recordsByParent.has(parentId)) {
        recordsByParent.set(parentId, []);
      }

      recordsByParent.get(parentId)?.push(index);
    }

    // Sequential execution required: deleting array items must be done one parent at a time
    // to prevent conflicts and ensure data consistency
    for (const [parentId, indices] of recordsByParent) {
      // Fetch the parent record
      // eslint-disable-next-line no-await-in-loop -- Sequential prevents data conflicts
      const parentRecords = await this.parentCollection.list(
        caller,
        new PaginatedFilter({
          conditionTree: new ConditionTreeLeaf('id', 'Equal', parentId),
        }),
        new Projection('id', this.arrayFieldPath),
      );

      // Skip if parent not found
      if (parentRecords.length > 0) {
        const parentRecord = parentRecords[0];
        const array = this.getArrayFromParent(parentRecord);

        // Remove items at the specified indices (sort in reverse to avoid index shifting)
        const sortedIndices = indices.sort((a, b) => b - a);

        for (const index of sortedIndices) {
          array.splice(index, 1);
        }

        // Update the parent record - sequential to prevent conflicts
        // eslint-disable-next-line no-await-in-loop -- Sequential prevents data conflicts
        await this.parentCollection.update(
          caller,
          new Filter({ conditionTree: new ConditionTreeLeaf('id', 'Equal', parentId) }),
          { [this.arrayFieldPath]: array },
        );
      }
    }
  }

  /**
   * Aggregate - Support Count operations for array collections
   */
  override async aggregate(
    caller: Caller,
    filter: Filter,
    aggregation: Aggregation,
    limit?: number,
  ): Promise<Array<{ value: number; group: Record<string, unknown> }>> {
    void limit; // Unused parameter required by interface

    // Only support Count operation
    if (aggregation.operation !== 'Count') {
      throw new Error(
        `Aggregation operation '${aggregation.operation}' is not supported for ` +
          `array collections. Only Count is supported.`,
      );
    }

    // Get all records that match the filter
    const records = await this.list(caller, new PaginatedFilter(filter), new Projection('id'));

    // Return count aggregation result
    return [
      {
        value: records.length,
        group: {},
      },
    ];
  }
}
