import { Container, CosmosClient, ItemDefinition, SqlQuerySpec } from '@azure/cosmos';
import { RecordData } from '@forestadmin/datasource-toolkit';
import { randomUUID } from 'crypto';

import { OverrideTypeConverter } from '../introspection/builder';
import Serializer from '../utils/serializer';

export interface CosmosSchema {
  [key: string]: {
    type: string;
    nullable?: boolean;
    indexed?: boolean;
  };
}

export default class ModelCosmos {
  public name: string;

  /**
   * The Cosmos DB database name
   */
  private databaseName: string;

  /**
   * The Cosmos DB container name
   */
  private containerName: string;

  /**
   * The partition key path for this container
   */
  private partitionKeyPath: string;

  /**
   * Schema definition inferred from sample documents
   */
  private schema: CosmosSchema;

  /**
   * Cosmos DB client instance
   */
  private cosmosClient: CosmosClient;

  /**
   * Container reference for direct operations
   */
  private container: Container;

  public overrideTypeConverter?: OverrideTypeConverter;

  public enableCount?: boolean;

  constructor(
    cosmosClient: CosmosClient,
    name: string,
    databaseName: string,
    containerName: string,
    partitionKeyPath: string,
    schema: CosmosSchema,
    overrideTypeConverter?: OverrideTypeConverter,
    enableCount?: boolean,
  ) {
    this.name = name;
    this.databaseName = databaseName;
    this.containerName = containerName;
    this.partitionKeyPath = partitionKeyPath;
    this.schema = schema;
    this.overrideTypeConverter = overrideTypeConverter;
    this.enableCount = enableCount;

    this.cosmosClient = cosmosClient;
    this.container = this.cosmosClient.database(databaseName).container(containerName);
  }

  public getCosmosClient(): CosmosClient {
    return this.cosmosClient;
  }

  public async create(data: RecordData[]): Promise<RecordData[]> {
    const createdRecords: RecordData[] = [];

    // Add timestamps if schema includes them
    if (this.schema.createdAt) {
      data.forEach(newRecord => {
        newRecord.createdAt = new Date().toISOString();
      });
    }

    // Sequential execution required: Cosmos DB doesn't have a native bulk create API.
    // While we could parallelize with Promise.all, we keep this sequential to maintain
    // insertion order and ensure consistent error handling. This allows us to return
    // partial results and provide better error context for each record.
    for (const record of data) {
      // Unflatten the record to restore nested structure for Cosmos DB
      const unflattenedRecord = Serializer.unflatten(record);

      // Ensure the record has an id field (required by Cosmos DB)
      const itemToCreate: ItemDefinition = {
        id: unflattenedRecord.id || this.generateId(),
        ...unflattenedRecord,
      };

      // eslint-disable-next-line no-await-in-loop -- Sequential execution maintains order
      const { resource } = await this.container.items.create(itemToCreate);
      // Flatten and serialize the response
      createdRecords.push(Serializer.serialize(resource));
    }

    return createdRecords;
  }

  public async update(ids: string[], patch: RecordData): Promise<void> {
    // Cosmos DB requires both id and partition key for updates
    // We need to fetch the items first to get their partition keys
    const itemsToUpdate = await this.getItemsByIds(ids);

    // Unflatten the patch to restore nested structure for Cosmos DB
    const unflattenedPatch = Serializer.unflatten(patch);

    // Sequential execution required: Cosmos DB updates must be performed one at a time
    // to ensure consistency and prevent conflicts with optimistic concurrency control
    for (const item of itemsToUpdate) {
      const partitionKeyValue = this.getPartitionKeyValue(item);

      // Deep merge the unflattened patch with the existing item
      const updatedItem = Serializer.deepMerge(item, unflattenedPatch);

      // eslint-disable-next-line no-await-in-loop -- Sequential maintains consistency
      await this.container.item(item.id, partitionKeyValue).replace(updatedItem);
    }
  }

  public async delete(ids: string[]): Promise<void> {
    // Similar to update, we need partition keys for deletion
    const itemsToDelete = await this.getItemsByIds(ids);

    // Sequential execution required: Cosmos DB deletes must be performed one at a time
    // to ensure consistency and prevent conflicts
    for (const item of itemsToDelete) {
      const partitionKeyValue = this.getPartitionKeyValue(item);

      // eslint-disable-next-line no-await-in-loop -- Sequential maintains consistency
      await this.container.item(item.id, partitionKeyValue).delete();
    }
  }

  public async query(
    querySpec: SqlQuerySpec,
    offset?: number,
    limit?: number,
    partitionKey?: string | number,
  ): Promise<RecordData[]> {
    // Build query options
    const queryOptions: { maxItemCount?: number; partitionKey?: string | number } = {};

    // Add partition key if provided (enables single-partition query optimization)
    if (partitionKey !== undefined) {
      queryOptions.partitionKey = partitionKey;
    }

    // If no pagination parameters, fetch all (backward compatibility)
    if (offset === undefined && limit === undefined) {
      const { resources } = await this.container.items.query(querySpec, queryOptions).fetchAll();

      return resources.map(item => Serializer.serialize(item));
    }

    // Use efficient pagination when limit is specified
    // Note: Cosmos DB doesn't support native OFFSET, so we need to skip items client-side
    // but we can still benefit from maxItemCount to limit network transfers
    queryOptions.maxItemCount = limit ? (offset || 0) + limit : undefined;

    const query = this.container.items.query(querySpec, queryOptions);

    const results: ItemDefinition[] = [];
    let itemsFetched = 0;
    const targetCount = (offset || 0) + (limit || 0);

    // Iterate through pages until we have enough items
    // eslint-disable-next-line no-restricted-syntax
    for await (const { resources: page } of query.getAsyncIterator()) {
      results.push(...page);
      itemsFetched += page.length;

      // Stop fetching if we have enough items
      if (limit && itemsFetched >= targetCount) {
        break;
      }
    }

    // Apply offset and limit
    let finalResults = results;

    if (offset) {
      finalResults = finalResults.slice(offset);
    }

    if (limit) {
      finalResults = finalResults.slice(0, limit);
    }

    return finalResults.map(item => Serializer.serialize(item));
  }

  public async aggregateQuery(querySpec: SqlQuerySpec): Promise<RecordData[]> {
    const { resources } = await this.container.items.query(querySpec).fetchAll();

    return resources.map(item => Serializer.serialize(item));
  }

  public async count(querySpec?: SqlQuerySpec): Promise<number> {
    if (!querySpec) {
      // Simple count without filters
      const countQuery: SqlQuerySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c',
      };
      const { resources } = await this.container.items.query<number>(countQuery).fetchAll();

      return resources[0] || 0;
    }

    // Count with filters - we need to modify the query to use COUNT
    const { resources } = await this.container.items.query(querySpec).fetchAll();

    return resources.length;
  }

  // INTERNAL HELPER METHODS

  /**
   * Get items by their IDs (requires scanning as we don't have partition keys)
   */
  private async getItemsByIds(ids: string[]): Promise<ItemDefinition[]> {
    const querySpec: SqlQuerySpec = {
      query: 'SELECT * FROM c WHERE ARRAY_CONTAINS(@ids, c.id)',
      parameters: [
        {
          name: '@ids',
          value: ids,
        },
      ],
    };

    const { resources } = await this.container.items.query(querySpec).fetchAll();

    return resources;
  }

  /**
   * Extract the partition key value from an item
   */
  private getPartitionKeyValue(item: ItemDefinition): string | number {
    // Remove leading slash from partition key path
    const keyPath = this.partitionKeyPath.replace(/^\//, '');

    // Handle nested paths (e.g., "/address/city")
    const keys = keyPath.split('/');
    let value: unknown = item;

    for (const key of keys) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        value = (value as Record<string, unknown>)[key];
      } else {
        break;
      }
    }

    // Validate that we found a valid partition key value
    if (value === undefined || value === null) {
      throw new Error(
        `Partition key '${this.partitionKeyPath}' is undefined or null in item. ` +
          `Item ID: ${item.id || 'unknown'}`,
      );
    }

    if (typeof value !== 'string' && typeof value !== 'number') {
      throw new Error(
        `Partition key '${this.partitionKeyPath}' must be string or number, ` +
          `but got ${typeof value}. Item ID: ${item.id || 'unknown'}`,
      );
    }

    return value;
  }

  /**
   * Generate a unique ID for new items
   */
  private generateId(): string {
    return randomUUID();
  }

  /**
   * Return all fields from schema
   */
  public getAttributes(): CosmosSchema {
    return this.schema;
  }

  /**
   * Get container reference for advanced operations
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Get partition key path
   */
  public getPartitionKeyPath(): string {
    return this.partitionKeyPath;
  }

  /**
   * Get database name
   */
  public getDatabaseName(): string {
    return this.databaseName;
  }

  /**
   * Get container name
   */
  public getContainerName(): string {
    return this.containerName;
  }
}
