import { Container, CosmosClient, ItemDefinition, SqlQuerySpec } from '@azure/cosmos';
import { RecordData } from '@forestadmin/datasource-toolkit';
import { randomUUID } from 'crypto';

import { OverrideTypeConverter } from '../introspection/builder';
import PaginationCache, { PaginationCacheOptions } from '../utils/pagination-cache';
import {
  RetryOptions,
  configureRetryOptions,
  getSharedRetryOptions,
  withRetry,
} from '../utils/retry-handler';
import Serializer from '../utils/serializer';

export { RetryOptions, configureRetryOptions, getSharedRetryOptions };

export interface CosmosSchema {
  [key: string]: {
    type: string;
    nullable?: boolean;
    indexed?: boolean;
  };
}

export interface ItemWithPartitionKey {
  id: string;
  partitionKey: string | number;
}

/**
 * Shared pagination cache instance for all models
 * This is shared to allow cache reuse across collections and reduce memory usage
 */
let sharedPaginationCache: PaginationCache | null = null;

/**
 * Get or create the shared pagination cache instance
 * @param options Optional configuration options (only used on first call)
 */
export function getSharedPaginationCache(options?: PaginationCacheOptions): PaginationCache {
  if (!sharedPaginationCache) {
    sharedPaginationCache = new PaginationCache(options);
  }

  return sharedPaginationCache;
}

/**
 * Configure the shared pagination cache with custom options
 * Must be called before any queries are made
 * @param options Pagination cache configuration
 */
export function configurePaginationCache(options: PaginationCacheOptions): void {
  sharedPaginationCache = new PaginationCache(options);
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

  /**
   * Pagination cache for efficient cursor-based pagination
   */
  private paginationCache: PaginationCache;

  /**
   * Retry options for handling rate limiting (429 errors)
   */
  private retryOptions: RetryOptions;

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
    this.paginationCache = getSharedPaginationCache();
    this.retryOptions = getSharedRetryOptions();
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
      const { resource } = await withRetry(
        () => this.container.items.create(itemToCreate),
        this.retryOptions,
      );
      // Flatten and serialize the response
      createdRecords.push(Serializer.serialize(resource));
    }

    return createdRecords;
  }

  public async update(items: ItemWithPartitionKey[], patch: RecordData): Promise<void> {
    // Unflatten the patch to restore nested structure for Cosmos DB
    const unflattenedPatch = Serializer.unflatten(patch);

    // Use point reads to fetch items (1 RU each) instead of cross-partition query
    // Then perform point updates (also optimized with partition key)
    for (const { id, partitionKey } of items) {
      // Point read: directly fetch item using id + partition key (1 RU)
      // eslint-disable-next-line no-await-in-loop -- Sequential maintains consistency
      const { resource: existingItem } = await withRetry(
        () => this.container.item(id, partitionKey).read(),
        this.retryOptions,
      );

      if (existingItem) {
        // Deep merge the unflattened patch with the existing item
        const updatedItem = Serializer.deepMerge(existingItem, unflattenedPatch);

        // Point update: directly update using id + partition key
        // eslint-disable-next-line no-await-in-loop -- Sequential maintains consistency
        await withRetry(
          () => this.container.item(id, partitionKey).replace(updatedItem),
          this.retryOptions,
        );
      }
    }
  }

  public async delete(items: ItemWithPartitionKey[]): Promise<void> {
    // Use point deletes with id + partition key (optimized, no cross-partition scan needed)
    for (const { id, partitionKey } of items) {
      // Point delete: directly delete using id + partition key
      // eslint-disable-next-line no-await-in-loop -- Sequential maintains consistency
      await withRetry(() => this.container.item(id, partitionKey).delete(), this.retryOptions);
    }
  }

  public async query(
    querySpec: SqlQuerySpec,
    offset?: number,
    limit?: number,
    partitionKey?: string | number,
  ): Promise<RecordData[]> {
    // Build query options
    const queryOptions: {
      maxItemCount?: number;
      partitionKey?: string | number;
      continuationToken?: string;
    } = {};

    // Add partition key if provided (enables single-partition query optimization)
    if (partitionKey !== undefined) {
      queryOptions.partitionKey = partitionKey;
    }

    // If no pagination parameters, fetch all (backward compatibility)
    if (offset === undefined && limit === undefined) {
      const { resources } = await withRetry(
        () => this.container.items.query(querySpec, queryOptions).fetchAll(),
        this.retryOptions,
      );

      return resources.map(item => Serializer.serialize(item));
    }

    const effectiveOffset = offset || 0;
    const effectiveLimit = limit || 100; // Default limit if not specified

    // Check if offset exceeds maximum allowed
    const maxOffset = this.paginationCache.getMaxOffset();

    if (effectiveOffset > maxOffset) {
      throw new Error(
        `Offset ${effectiveOffset} exceeds maximum allowed offset of ${maxOffset}. ` +
          `Consider using filters to narrow down your results instead of deep pagination.`,
      );
    }

    // Generate query hash for cache lookup
    const queryHash = this.paginationCache.generateQueryHash(
      querySpec.query,
      querySpec.parameters,
      partitionKey,
    );

    // Try to find a cached continuation token close to our target offset
    const cachedEntry = this.paginationCache.findBestToken(queryHash, effectiveOffset);

    let startOffset = 0;

    if (cachedEntry) {
      // Resume from cached position
      startOffset = cachedEntry.offset;
      queryOptions.continuationToken = cachedEntry.continuationToken;
    }

    // Calculate how many items we need to skip from the start position
    const itemsToSkip = effectiveOffset - startOffset;
    const totalItemsNeeded = itemsToSkip + effectiveLimit;

    // Set page size - use a reasonable batch size for efficiency
    // Larger batches = fewer round trips but more memory
    const pageSize = Math.min(Math.max(effectiveLimit, 100), 1000);
    queryOptions.maxItemCount = pageSize;

    const results: ItemDefinition[] = [];
    let itemsFetched = 0;
    let lastContinuationToken: string | undefined;
    let currentOffset = startOffset;

    // Create query iterator
    const queryIterator = this.container.items.query(querySpec, queryOptions);

    // Iterate through pages until we have enough items
    // eslint-disable-next-line no-restricted-syntax
    for await (const response of queryIterator.getAsyncIterator()) {
      const { resources: page, continuationToken } = response;

      // Store continuation token for future use at regular intervals
      const cacheInterval = this.paginationCache.getCacheInterval();

      if (continuationToken && currentOffset > 0 && currentOffset % cacheInterval < pageSize) {
        this.paginationCache.storeToken(queryHash, currentOffset, continuationToken);
      }

      results.push(...page);
      itemsFetched += page.length;
      currentOffset += page.length;
      lastContinuationToken = continuationToken;

      // Stop fetching if we have enough items
      if (itemsFetched >= totalItemsNeeded) {
        break;
      }

      // Safety check: if no more pages, break
      if (!continuationToken) {
        break;
      }
    }

    // Store the final continuation token if we have one
    if (lastContinuationToken && currentOffset > startOffset) {
      this.paginationCache.storeToken(queryHash, currentOffset, lastContinuationToken);
    }

    // Apply offset (skip items we don't need) and limit
    let finalResults = results;

    if (itemsToSkip > 0) {
      finalResults = finalResults.slice(itemsToSkip);
    }

    if (effectiveLimit) {
      finalResults = finalResults.slice(0, effectiveLimit);
    }

    return finalResults.map(item => Serializer.serialize(item));
  }

  public async aggregateQuery(
    querySpec: SqlQuerySpec,
    partitionKey?: string | number,
  ): Promise<RecordData[]> {
    // Build query options with partition key if provided
    const queryOptions: { partitionKey?: string | number } = {};

    if (partitionKey !== undefined) {
      queryOptions.partitionKey = partitionKey;
    }

    const { resources } = await withRetry(
      () => this.container.items.query(querySpec, queryOptions).fetchAll(),
      this.retryOptions,
    );

    return resources.map(item => Serializer.serialize(item));
  }

  public async count(querySpec?: SqlQuerySpec, partitionKey?: string | number): Promise<number> {
    // Build query options with partition key if provided
    const queryOptions: { partitionKey?: string | number } = {};

    if (partitionKey !== undefined) {
      queryOptions.partitionKey = partitionKey;
    }

    if (!querySpec) {
      // Simple count without filters
      const countQuery: SqlQuerySpec = {
        query: 'SELECT VALUE COUNT(1) FROM c',
      };
      const { resources } = await withRetry(
        () => this.container.items.query<number>(countQuery, queryOptions).fetchAll(),
        this.retryOptions,
      );

      return resources[0] || 0;
    }

    // Convert the query to a COUNT query to avoid fetching all records
    const countQuery = this.convertToCountQuery(querySpec);
    const { resources } = await withRetry(
      () => this.container.items.query<number>(countQuery, queryOptions).fetchAll(),
      this.retryOptions,
    );

    return resources[0] || 0;
  }

  /**
   * Convert a SELECT query to a COUNT query
   * Extracts the WHERE clause and creates a COUNT query with the same filters
   */
  private convertToCountQuery(querySpec: SqlQuerySpec): SqlQuerySpec {
    const { query, parameters } = querySpec;

    // Extract WHERE clause from original query
    // Query format: "SELECT ... FROM c WHERE ... ORDER BY ..."
    const whereMatch = query.match(/WHERE\s+(.+?)(?:\s+ORDER\s+BY|$)/i);
    const whereClause = whereMatch ? whereMatch[1].trim() : '';

    const countQueryString = whereClause
      ? `SELECT VALUE COUNT(1) FROM c WHERE ${whereClause}`
      : 'SELECT VALUE COUNT(1) FROM c';

    return {
      query: countQueryString,
      parameters,
    };
  }

  // INTERNAL HELPER METHODS

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
