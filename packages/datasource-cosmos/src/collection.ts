/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
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
    try {
      // Build the SQL query from the filter
      const projectionFields = projection.columns.length > 0 ? projection.columns : undefined;

      const querySpec = this.queryConverter.getSqlQuerySpec(
        filter.conditionTree,
        filter.sort,
        projectionFields,
      );

      // Execute the query with pagination
      const recordsResponse = await this.internalModel.query(
        querySpec,
        filter.page?.skip,
        filter.page?.limit,
      );

      // Apply projection to only return projected fields
      return projection.apply(recordsResponse);
    } catch (error) {
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
