/* eslint-disable no-underscore-dangle */
import { Container, CosmosClient, ItemDefinition, SqlQuerySpec } from '@azure/cosmos';
import { RecordData } from '@forestadmin/datasource-toolkit';

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

  public async create(data: RecordData[]): Promise<RecordData[]> {
    const createdRecords: RecordData[] = [];

    // Add timestamps if schema includes them
    if (this.schema.createdAt) {
      data.forEach(newRecord => {
        newRecord.createdAt = new Date().toISOString();
      });
    }

    // Cosmos DB doesn't have a native bulk create, so we'll create items individually
    // In production, you might want to use stored procedures or batch operations
    // eslint-disable-next-line no-restricted-syntax
    for (const record of data) {
      // Unflatten the record to restore nested structure for Cosmos DB
      const unflattenedRecord = Serializer.unflatten(record);

      // Ensure the record has an id field (required by Cosmos DB)
      const itemToCreate: ItemDefinition = {
        id: unflattenedRecord.id || this.generateId(),
        ...unflattenedRecord,
      };

      // eslint-disable-next-line no-await-in-loop
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

    // eslint-disable-next-line no-restricted-syntax
    for (const item of itemsToUpdate) {
      const partitionKeyValue = this.getPartitionKeyValue(item);

      // Merge the unflattened patch with the existing item
      const updatedItem = {
        ...item,
        ...unflattenedPatch,
      };

      // eslint-disable-next-line no-await-in-loop
      await this.container.item(item.id, partitionKeyValue).replace(updatedItem);
    }
  }

  public async delete(ids: string[]): Promise<void> {
    // Similar to update, we need partition keys for deletion
    const itemsToDelete = await this.getItemsByIds(ids);

    // eslint-disable-next-line no-restricted-syntax
    for (const item of itemsToDelete) {
      const partitionKeyValue = this.getPartitionKeyValue(item);

      // eslint-disable-next-line no-await-in-loop
      await this.container.item(item.id, partitionKeyValue).delete();
    }
  }

  public async query(
    querySpec: SqlQuerySpec,
    offset?: number,
    limit?: number,
  ): Promise<RecordData[]> {
    const options = {
      maxItemCount: limit,
    };

    const { resources } = await this.container.items.query(querySpec, options).fetchAll();

    // Apply offset and limit (Cosmos DB doesn't have native OFFSET)
    let results = resources;

    if (offset) {
      results = results.slice(offset);
    }

    if (limit && offset) {
      // If we already sliced with offset, limit the remaining results
      results = results.slice(0, limit);
    }

    return results.map(item => Serializer.serialize(item));
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = item;

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        break;
      }
    }

    return value;
  }

  /**
   * Generate a unique ID for new items
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
