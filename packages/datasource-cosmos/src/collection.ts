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
import QueryConverter from './utils/query-converter';

export default class CosmosCollection extends BaseCollection {
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
      throw new Error(`Failed to create records: ${error.message}`);
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

        // Skip deeply nested fields (2+ levels like receiver->authorizationBalance->value)
        const nestingLevel = (clause.field.match(/->/g) || []).length;

        if (nestingLevel >= 2) {
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

    try {
      // Execute the query with pagination
      const recordsResponse = await this.internalModel.query(
        querySpec,
        filter.page?.skip,
        filter.page?.limit,
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

      throw new Error(`Failed to list records: ${error.message}`);
    }
  }

  async update(caller: Caller, filter: Filter, patch: RecordData): Promise<void> {
    try {
      // First, get the IDs of records to update
      const records = await this.list(caller, filter, new Projection('id'));
      const ids = records.map(record => record.id as string);

      if (ids.length === 0) {
        return; // Nothing to update
      }

      await this.internalModel.update(ids, patch);
    } catch (error) {
      throw new Error(`Failed to update records: ${error.message}`);
    }
  }

  async delete(caller: Caller, filter: Filter): Promise<void> {
    try {
      // First, get the IDs of records to delete
      const records = await this.list(caller, filter, new Projection('id'));
      const ids = records.map(record => record.id as string);

      if (ids.length === 0) {
        return; // Nothing to delete
      }

      await this.internalModel.delete(ids);
    } catch (error) {
      throw new Error(`Failed to delete records: ${error.message}`);
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
      throw new Error(`Failed to aggregate records: ${error.message}`);
    }
  }
}
