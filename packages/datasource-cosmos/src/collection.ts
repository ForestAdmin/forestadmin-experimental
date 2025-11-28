import { CosmosClient } from '@azure/cosmos';
import {
  AggregateResult,
  Aggregation,
  BaseCollection,
  Caller,
  DataSource,
  Filter,
  Logger,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';

import ModelCosmos from './model-builder/model';
import AggregationConverter from './utils/aggregation-converter';
import ModelConverter from './utils/model-to-collection-schema-converter';
import { extractPartitionKeyFromFilter } from './utils/partition-key-extractor';
import QueryConverter from './utils/query-converter';

export default class CosmosCollection extends BaseCollection {
  /**
   * Maximum nesting depth for sortable fields
   * Cosmos DB has limitations on sorting deeply nested fields
   * Fields with nesting >= this depth will be excluded from sorting
   */
  private static readonly MAX_SORTABLE_NESTING_DEPTH = 2;

  protected internalModel: ModelCosmos;

  private queryConverter: QueryConverter;

  constructor(
    datasource: DataSource,
    model: ModelCosmos,
    logger: Logger,
    nativeDriver: CosmosClient,
  ) {
    if (!model) throw new Error('Invalid (null) model instance.');

    super(model.name, datasource, nativeDriver);

    this.internalModel = model;

    this.queryConverter = new QueryConverter();

    const modelSchema = ModelConverter.convert(this.internalModel, logger);

    if (this.internalModel.enableCount !== false) this.enableCount();
    this.addFields(modelSchema.fields);
    this.addSegments(modelSchema.segments);

    logger('Debug', `CosmosCollection - ${this.name} added`);
  }

  /**
   * Mark virtualized array fields as non-sortable
   * This should be called after virtual collections are created from array fields
   */
  public markVirtualizedFieldsAsNonSortable(virtualizedFieldPaths: string[]): void {
    for (const fieldPath of virtualizedFieldPaths) {
      const field = this.schema.fields[fieldPath];

      if (field && field.type === 'Column') {
        // Create a new field object with isSortable set to false
        const updatedField = {
          ...field,
          isSortable: false,
        };
        // Replace the field in the schema
        this.schema.fields[fieldPath] = updatedField;
      }
    }
  }

  async create(caller: Caller, data: RecordData[]): Promise<RecordData[]> {
    try {
      const recordsResponse = await this.internalModel.create(data);

      return recordsResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const wrappedError = new Error(`Failed to create records: ${errorMessage}`);

      // Preserve original error as cause for debugging
      if (error instanceof Error) {
        (wrappedError as Error & { cause?: Error }).cause = error;
      }

      throw wrappedError;
    }
  }

  async list(
    caller: Caller,
    filter: PaginatedFilter,
    projection: Projection,
  ): Promise<RecordData[]> {
    // Filter out 'id' field and deeply nested fields from sort as Cosmos DB doesn't support
    // sorting on them without proper indexing
    let filteredSort = filter.sort;

    if (filter.sort && filter.sort.length > 0) {
      filteredSort = filter.sort.replaceClauses(clause => {
        // Skip 'id' field
        if (clause.field === 'id') {
          return [];
        }

        // Skip deeply nested fields (e.g., receiver->authorizationBalance->value)
        const nestingLevel = (clause.field.match(/->/g) || []).length;

        if (nestingLevel >= CosmosCollection.MAX_SORTABLE_NESTING_DEPTH) {
          return [];
        }

        return clause;
      });

      // If all sort clauses were filtered out, set to undefined
      if (filteredSort.length === 0) {
        filteredSort = undefined;
      }
    }

    // Build query with projection to only fetch needed fields
    const querySpec = this.queryConverter.getSqlQuerySpec(
      filter.conditionTree,
      filteredSort,
      projection,
    );

    // Extract partition key from filter for single-partition query optimization
    const partitionKey = extractPartitionKeyFromFilter(
      filter.conditionTree,
      this.internalModel.getPartitionKeyPath(),
    );

    try {
      // Execute the query with pagination and partition key optimization
      const recordsResponse = await this.internalModel.query(
        querySpec,
        filter.page?.skip,
        filter.page?.limit,
        partitionKey,
      );

      return recordsResponse;
    } catch (error) {
      // Check if this is a Cosmos DB indexing issue with nested fields
      if (
        error.message.includes('One of the input values is invalid') &&
        querySpec.query.includes('.')
      ) {
        throw new Error(
          `Cosmos DB query failed. This may be due to querying/filtering on ` +
            `nested fields without proper indexing. Please configure your ` +
            `Cosmos DB container's indexing policy to include the nested paths ` +
            `being queried. Original error: ${error.message}`,
        );
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const wrappedError = new Error(`Failed to list records: ${errorMessage}`);

      if (error instanceof Error) {
        (wrappedError as Error & { cause?: Error }).cause = error;
      }

      throw wrappedError;
    }
  }

  async update(caller: Caller, filter: Filter, patch: RecordData): Promise<void> {
    try {
      // Fetch id and partition key field for efficient point operations
      const partitionKeyField = this.getPartitionKeyFieldName();
      const projection = new Projection('id', partitionKeyField);
      const records = await this.list(caller, filter, projection);

      if (records.length === 0) {
        return; // Nothing to update
      }

      // Extract id and partition key pairs for point operations
      const itemsWithPartitionKeys = records.map(record => ({
        id: record.id as string,
        partitionKey: record[partitionKeyField] as string | number,
      }));

      await this.internalModel.update(itemsWithPartitionKeys, patch);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const wrappedError = new Error(`Failed to update records: ${errorMessage}`);

      if (error instanceof Error) {
        (wrappedError as Error & { cause?: Error }).cause = error;
      }

      throw wrappedError;
    }
  }

  async delete(caller: Caller, filter: Filter): Promise<void> {
    try {
      // Fetch id and partition key field for efficient point operations
      const partitionKeyField = this.getPartitionKeyFieldName();
      const projection = new Projection('id', partitionKeyField);
      const records = await this.list(caller, filter, projection);

      if (records.length === 0) {
        return; // Nothing to delete
      }

      // Extract id and partition key pairs for point operations
      const itemsWithPartitionKeys = records.map(record => ({
        id: record.id as string,
        partitionKey: record[partitionKeyField] as string | number,
      }));

      await this.internalModel.delete(itemsWithPartitionKeys);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const wrappedError = new Error(`Failed to delete records: ${errorMessage}`);

      if (error instanceof Error) {
        (wrappedError as Error & { cause?: Error }).cause = error;
      }

      throw wrappedError;
    }
  }

  async aggregate(
    caller: Caller,
    filter: Filter,
    aggregation: Aggregation,
    limit?: number,
  ): Promise<AggregateResult[]> {
    try {
      // Build aggregation query
      const querySpec = AggregationConverter.buildAggregationQuery(
        aggregation,
        filter.conditionTree,
        limit,
      );

      // Execute aggregation query
      const rawResults = await this.internalModel.aggregateQuery(querySpec);

      // Process results into Forest Admin format
      return AggregationConverter.processAggregationResults(rawResults, aggregation);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const wrappedError = new Error(`Failed to aggregate records: ${errorMessage}`);

      if (error instanceof Error) {
        (wrappedError as Error & { cause?: Error }).cause = error;
      }

      throw wrappedError;
    }
  }

  /**
   * Get the partition key field name in Forest Admin notation (with -> for nested paths)
   * Converts Cosmos DB path like "/tenantId" or "/address/city" to "tenantId" or "address->city"
   */
  private getPartitionKeyFieldName(): string {
    return this.internalModel
      .getPartitionKeyPath()
      .replace(/^\//, '') // Remove leading slash
      .replace(/\//g, '->'); // Convert nested paths to arrow notation
  }
}
