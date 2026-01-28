/**
 * Type definitions for @forestadmin/datasource-airtable-v2
 */

import { BaseDataSource, BaseCollection, DataSource } from '@forestadmin/datasource-toolkit';
import Airtable from 'airtable';

/**
 * Base information from Airtable Meta API
 */
export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel?: string;
}

/**
 * Table information from Airtable Meta API
 */
export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId?: string;
  fields: AirtableField[];
  views?: AirtableView[];
}

/**
 * Field definition from Airtable Meta API
 */
export interface AirtableField {
  id: string;
  name: string;
  type: AirtableFieldType;
  description?: string;
  options?: Record<string, any>;
}

/**
 * View definition from Airtable Meta API
 */
export interface AirtableView {
  id: string;
  name: string;
  type: string;
}

/**
 * Airtable field types
 */
export type AirtableFieldType =
  | 'singleLineText'
  | 'multilineText'
  | 'richText'
  | 'email'
  | 'url'
  | 'phoneNumber'
  | 'number'
  | 'currency'
  | 'percent'
  | 'rating'
  | 'duration'
  | 'checkbox'
  | 'date'
  | 'dateTime'
  | 'createdTime'
  | 'lastModifiedTime'
  | 'singleSelect'
  | 'multipleSelects'
  | 'multipleRecordLinks'
  | 'formula'
  | 'rollup'
  | 'lookup'
  | 'count'
  | 'multipleAttachments'
  | 'singleCollaborator'
  | 'multipleCollaborators'
  | 'createdBy'
  | 'lastModifiedBy'
  | 'barcode'
  | 'button'
  | 'autoNumber'
  | 'externalSyncSource'
  | 'aiText';

/**
 * Collection name formatter function type
 */
export type CollectionNameFormatter = (
  base: AirtableBase,
  table: AirtableTable
) => string;

/**
 * Configuration options for the Airtable datasource
 */
export interface AirtableDataSourceOptions {
  /**
   * Airtable API key (Personal Access Token or OAuth token)
   * Defaults to AIRTABLE_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Custom Airtable API endpoint URL
   * Useful for testing or enterprise installations
   */
  endpointUrl?: string;

  /**
   * Custom function to format collection names
   * Default: (base, table) => `${base.name} - ${table.name}`
   */
  collectionNameFormatter?: CollectionNameFormatter;

  /**
   * Only include bases with these names
   * If specified, only these bases will be processed
   */
  includeBases?: string[];

  /**
   * Exclude bases with these names
   * These bases will be skipped during initialization
   */
  excludeBases?: string[];

  /**
   * Only include tables with these names
   * If specified, only these tables will be registered as collections
   */
  includeTables?: string[];

  /**
   * Exclude tables with these names
   * These tables will be skipped during initialization
   */
  excludeTables?: string[];
}

/**
 * Airtable Collection class
 * Represents a single Airtable table as a Forest Admin collection
 */
export declare class AirtableCollection extends BaseCollection {
  /**
   * Airtable SDK base instance
   */
  readonly base: Airtable.Base;

  /**
   * Airtable table ID
   */
  readonly tableId: string;

  /**
   * Airtable SDK table instance
   */
  readonly table: Airtable.Table<any>;

  /**
   * Airtable field definitions
   */
  readonly airtableFields: AirtableField[];

  constructor(
    dataSource: AirtableDataSource,
    base: Airtable.Base,
    tableName: string,
    tableId: string,
    fields: AirtableField[]
  );
}

/**
 * Airtable DataSource class
 * Represents an Airtable workspace as a Forest Admin datasource
 */
export declare class AirtableDataSource extends BaseDataSource {
  /**
   * Airtable API key
   */
  readonly apiKey: string;

  /**
   * Configuration options
   */
  readonly options: Required<Omit<AirtableDataSourceOptions, 'apiKey'>>;

  /**
   * Map of base ID to Airtable SDK base instance
   */
  readonly bases: Map<string, Airtable.Base>;

  constructor(options?: AirtableDataSourceOptions);

  /**
   * Initialize the datasource
   * Discovers bases and tables, registers collections
   */
  initialize(): Promise<void>;
}

/**
 * Field mapper utilities
 */
export declare const fieldMapper: {
  FIELD_TYPE_MAP: Record<AirtableFieldType, string>;
  READ_ONLY_FIELDS: AirtableFieldType[];
  OPERATORS_BY_TYPE: Record<string, string[]>;
  TRANSFORM_FUNCTIONS: Record<string, (value: any) => any>;
  getColumnType(airtableType: AirtableFieldType): string;
  isReadOnly(airtableType: AirtableFieldType): boolean;
  getOperators(columnType: string): string[];
  transformValue(fieldType: AirtableFieldType, value: any): any;
  prepareValueForWrite(fieldType: AirtableFieldType, value: any): any;
};

/**
 * Filter builder utilities
 */
export declare const filterBuilder: {
  escapeFormulaString(value: string): string;
  formatValue(value: any): string;
  buildCondition(field: string, operator: string, value: any): string;
  buildFilterFormula(conditionTree: any): string | null;
  buildSort(sortClauses: any[]): Array<{ field: string; direction: 'asc' | 'desc' }>;
  buildFields(projection: string[]): string[] | null;
  extractRecordId(filter: any): string | null;
  extractRecordIds(filter: any): string[] | null;
};

/**
 * Constants
 */
export declare const constants: {
  BATCH_SIZE: number;
  DEFAULT_PAGE_SIZE: number;
  MAX_PAGE_SIZE: number;
  AIRTABLE_META_URL: string;
};

/**
 * Create an Airtable datasource factory function for Forest Admin
 *
 * @param options - Configuration options
 * @returns Async factory function that creates the datasource
 *
 * @example
 * // Basic usage
 * agent.addDataSource(createAirtableDataSource());
 *
 * @example
 * // With custom API key
 * agent.addDataSource(createAirtableDataSource({
 *   apiKey: 'your-api-key'
 * }));
 *
 * @example
 * // With filtering and custom naming
 * agent.addDataSource(createAirtableDataSource({
 *   includeBases: ['My Base'],
 *   excludeTables: ['Archive', 'Test'],
 *   collectionNameFormatter: (base, table) => table.name
 * }));
 */
export declare function createAirtableDataSource(
  options?: AirtableDataSourceOptions
): () => Promise<DataSource>;

export default createAirtableDataSource;
