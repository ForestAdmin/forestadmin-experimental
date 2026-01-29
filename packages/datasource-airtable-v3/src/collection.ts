/**
 * AirtableCollection - Forest Admin Collection implementation for Airtable
 */

import {
  Aggregation,
  AggregateResult,
  BaseCollection,
  Caller,
  DataSource,
  Filter,
  Logger,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';

import AirtableModel from './model-builder/model';
import { AirtableFieldType } from './types/airtable';
import TypeConverter from './utils/type-converter';
import AggregationConverter from './utils/aggregation-converter';
import {
  buildFilterFormula,
  buildSort,
  buildFields,
  extractRecordId,
  extractRecordIds,
} from './utils/filter-converter';

export default class AirtableCollection extends BaseCollection {
  /**
   * Internal model for Airtable operations
   */
  protected readonly model: AirtableModel;

  /**
   * Logger instance
   */
  protected readonly logger?: Logger;

  constructor(dataSource: DataSource, model: AirtableModel, logger?: Logger) {
    super(model.name, dataSource);

    this.model = model;
    this.logger = logger;

    // Register schema
    this.registerSchema();

    // Enable count if model supports it
    if (model.enableCount) {
      this.enableCount();
    }

    logger?.('Debug', `AirtableCollection - ${model.name} initialized`);
  }

  /**
   * Register the collection schema from model fields
   */
  private registerSchema(): void {
    // Add the 'id' field (Airtable record ID)
    this.addField('id', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: true,
      isReadOnly: true,
      filterOperators: new Set(['Equal', 'NotEqual', 'In', 'NotIn']),
      isSortable: false,
    });

    // Add each Airtable field
    for (const field of this.model.getFields()) {
      const fieldType = field.type as AirtableFieldType;
      const columnType = TypeConverter.toColumnType(fieldType);
      const isReadOnly = TypeConverter.isReadOnly(fieldType);
      const isSortable = TypeConverter.isSortable(fieldType);
      const filterOperators = TypeConverter.getFilterOperators(columnType);

      // Handle enum values for single select fields
      const enumValues = columnType === 'Enum'
        ? TypeConverter.getEnumValues(field.options as { choices?: Array<{ name: string }> })
        : undefined;

      this.addField(field.name, {
        type: 'Column',
        columnType,
        isReadOnly,
        isSortable,
        filterOperators,
        ...(enumValues && { enumValues }),
      });
    }
  }

  /**
   * List records from Airtable
   */
  async list(
    _caller: Caller,
    filter: PaginatedFilter,
    projection: Projection,
  ): Promise<RecordData[]> {
    try {
      // Check for single record ID lookup (optimization)
      const singleId = extractRecordId(filter);

      if (singleId) {
        const record = await this.model.findById(singleId);

        return record ? [record] : [];
      }

      // Check for multiple record IDs lookup (optimization)
      const multipleIds = extractRecordIds(filter);

      if (multipleIds && multipleIds.length > 0) {
        return this.model.findByIds(multipleIds);
      }

      // Build query options
      const filterFormula = buildFilterFormula(filter?.conditionTree);
      const sort = buildSort(filter?.sort);
      const fields = buildFields(projection);

      // Query records
      let records = await this.model.query({
        filterByFormula: filterFormula,
        sort,
        fields,
      });

      // Apply pagination
      const skip = filter?.page?.skip || 0;
      const limit = filter?.page?.limit;

      if (skip > 0 || limit) {
        records = records.slice(skip, limit ? skip + limit : undefined);
      }

      return records;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.('Error', `AirtableCollection.list failed: ${errorMessage}`);

      throw new Error(`Failed to list records: ${errorMessage}`);
    }
  }

  /**
   * Create records in Airtable
   */
  async create(_caller: Caller, data: RecordData[]): Promise<RecordData[]> {
    try {
      return await this.model.create(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.('Error', `AirtableCollection.create failed: ${errorMessage}`);

      throw new Error(`Failed to create records: ${errorMessage}`);
    }
  }

  /**
   * Update records in Airtable
   */
  async update(_caller: Caller, filter: Filter, patch: RecordData): Promise<void> {
    try {
      // Get record IDs to update
      const records = await this.list(_caller, filter, new Projection('id'));

      if (records.length === 0) {
        return;
      }

      const ids = records.map(r => r.id as string);
      await this.model.update(ids, patch);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.('Error', `AirtableCollection.update failed: ${errorMessage}`);

      throw new Error(`Failed to update records: ${errorMessage}`);
    }
  }

  /**
   * Delete records from Airtable
   */
  async delete(_caller: Caller, filter: Filter): Promise<void> {
    try {
      // Get record IDs to delete
      const records = await this.list(_caller, filter, new Projection('id'));

      if (records.length === 0) {
        return;
      }

      const ids = records.map(r => r.id as string);
      await this.model.delete(ids);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.('Error', `AirtableCollection.delete failed: ${errorMessage}`);

      throw new Error(`Failed to delete records: ${errorMessage}`);
    }
  }

  /**
   * Aggregate records
   * Since Airtable doesn't support server-side aggregations, we perform them client-side
   */
  async aggregate(
    _caller: Caller,
    filter: Filter,
    aggregation: Aggregation,
    limit?: number,
  ): Promise<AggregateResult[]> {
    try {
      // Fetch all matching records
      const records = await this.list(_caller, filter, new Projection());

      // Perform aggregation client-side
      return AggregationConverter.aggregate(records, aggregation, limit);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger?.('Error', `AirtableCollection.aggregate failed: ${errorMessage}`);

      throw new Error(`Failed to aggregate records: ${errorMessage}`);
    }
  }
}
