/**
 * AirtableModel - Encapsulates all Airtable SDK operations for a single table
 *
 * This model layer separates the Airtable API interactions from the Collection layer,
 * following the pattern used in datasource-cosmos.
 */

import { RecordData } from '@forestadmin/datasource-toolkit';
import Airtable, { Record as AirtableSDKRecord, FieldSet } from 'airtable';

import { AirtableFieldType } from '../types/airtable';
import { RetryOptions } from '../types/config';
import { BATCH_SIZE, DEFAULT_PAGE_SIZE } from '../utils/constants';
import { getSharedRetryOptions, withRetry } from '../utils/retry-handler';
import Serializer from '../utils/serializer';

// Airtable SDK types
type AirtableBase = ReturnType<typeof Airtable.base>;
type AirtableTable = ReturnType<AirtableBase>;

/**
 * Field definition for model
 */
export interface ModelFieldDefinition {
  id: string;
  name: string;
  type: string;
  options?: Record<string, unknown>;
}

/**
 * Schema definition for an Airtable model
 */
export interface AirtableSchema {
  [fieldName: string]: {
    type: string;
    isReadOnly: boolean;
    isSortable: boolean;
    options?: Record<string, unknown>;
  };
}

/**
 * Query options for list operations
 */
export interface QueryOptions {
  filterByFormula?: string;
  sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
  fields?: string[];
  maxRecords?: number;
  pageSize?: number;
}

/**
 * AirtableModel class - handles all SDK interactions for a table
 */
export default class AirtableModel {
  public readonly name: string;
  public readonly baseId: string;
  public readonly tableId: string;
  public readonly enableCount: boolean;

  private readonly base: AirtableBase;
  private readonly table: AirtableTable;
  private readonly fields: ModelFieldDefinition[];
  private readonly retryOptions: RetryOptions;

  constructor(
    name: string,
    base: AirtableBase,
    baseId: string,
    tableId: string,
    fields: ModelFieldDefinition[],
    enableCount = true,
    retryOptions?: RetryOptions,
  ) {
    this.name = name;
    this.baseId = baseId;
    this.tableId = tableId;
    this.base = base;
    this.table = base(tableId);
    this.fields = fields;
    this.enableCount = enableCount;
    this.retryOptions = retryOptions || getSharedRetryOptions();
  }

  /**
   * Get all field definitions
   */
  getFields(): ModelFieldDefinition[] {
    return this.fields;
  }

  /**
   * Find a single record by ID
   */
  async findById(id: string): Promise<RecordData | null> {
    try {
      const record = await withRetry(() => this.table.find(id), this.retryOptions);

      return this.transformRecord(record);
    } catch (error) {
      const err = error as { statusCode?: number };

      if (err.statusCode === 404) {
        return null;
      }

      throw error;
    }
  }

  /**
   * Find multiple records by IDs
   */
  async findByIds(ids: string[]): Promise<RecordData[]> {
    const results: RecordData[] = [];

    // Fetch in parallel with rate limiting consideration
    const promises = ids.map(async id => {
      const record = await this.findById(id);

      return record;
    });

    const records = await Promise.all(promises);

    for (const record of records) {
      if (record) {
        results.push(record);
      }
    }

    return results;
  }

  /**
   * Query records with options
   */
  async query(options: QueryOptions = {}): Promise<RecordData[]> {
    const queryOptions: Record<string, unknown> = {
      pageSize: options.pageSize || DEFAULT_PAGE_SIZE,
    };

    if (options.filterByFormula) {
      queryOptions.filterByFormula = options.filterByFormula;
    }

    if (options.sort && options.sort.length > 0) {
      queryOptions.sort = options.sort;
    }

    if (options.fields && options.fields.length > 0) {
      queryOptions.fields = options.fields;
    }

    if (options.maxRecords) {
      queryOptions.maxRecords = options.maxRecords;
    }

    // Use .all() to handle pagination automatically
    const records = await withRetry(() => this.table.select(queryOptions).all(), this.retryOptions);

    return records.map(record => this.transformRecord(record));
  }

  /**
   * Create records
   */
  async create(data: RecordData[]): Promise<RecordData[]> {
    const createdRecords: RecordData[] = [];

    // Prepare records for Airtable
    const recordsToCreate = data.map(item => ({
      fields: Serializer.deserialize(item, this.getFieldDefs()) as Partial<FieldSet>,
    }));

    // Batch create (Airtable limits to 10 records per request)
    for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
      const batch = recordsToCreate.slice(i, i + BATCH_SIZE);

      // eslint-disable-next-line no-await-in-loop
      const created = await withRetry(() => this.table.create(batch), this.retryOptions);

      for (const record of created) {
        createdRecords.push(this.transformRecord(record));
      }
    }

    return createdRecords;
  }

  /**
   * Update records by IDs
   */
  async update(ids: string[], patch: RecordData): Promise<void> {
    const preparedPatch = Serializer.deserialize(patch, this.getFieldDefs()) as Partial<FieldSet>;

    const recordsToUpdate = ids.map(id => ({
      id,
      fields: preparedPatch,
    }));

    // Batch update
    for (let i = 0; i < recordsToUpdate.length; i += BATCH_SIZE) {
      const batch = recordsToUpdate.slice(i, i + BATCH_SIZE);

      // eslint-disable-next-line no-await-in-loop
      await withRetry(() => this.table.update(batch), this.retryOptions);
    }
  }

  /**
   * Delete records by IDs
   */
  async delete(ids: string[]): Promise<void> {
    // Batch delete
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);

      // eslint-disable-next-line no-await-in-loop
      await withRetry(() => this.table.destroy(batch), this.retryOptions);
    }
  }

  /**
   * Transform an Airtable SDK record to RecordData
   */
  private transformRecord(record: AirtableSDKRecord<FieldSet>): RecordData {
    const result: RecordData = {
      id: record.id,
    };

    for (const field of this.fields) {
      const value = record.fields[field.name];
      result[field.name] = Serializer.serializeValue(value, field.type as AirtableFieldType);
    }

    return result;
  }

  /**
   * Get field definitions in the format expected by Serializer
   */
  private getFieldDefs(): Array<{
    name: string;
    type: AirtableFieldType;
    options?: Record<string, unknown>;
  }> {
    return this.fields.map(f => ({
      name: f.name,
      type: f.type as AirtableFieldType,
      options: f.options,
    }));
  }
}
