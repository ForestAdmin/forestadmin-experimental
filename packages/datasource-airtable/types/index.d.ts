/**
 * Type definitions for @anthropic/datasource-airtable
 */

import { BaseCollection, BaseDataSource } from '@forestadmin/datasource-toolkit';

// =============================================================================
// Configuration Option Types
// =============================================================================

/**
 * Airtable Base information
 */
export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel?: string;
}

/**
 * Airtable Table information
 */
export interface AirtableTable {
  id: string;
  name: string;
  primaryFieldId?: string;
  fields: AirtableField[];
}

/**
 * Airtable Field information
 */
export interface AirtableField {
  id: string;
  name: string;
  type: AirtableFieldType;
  options?: Record<string, unknown>;
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
  | 'duration'
  | 'rating'
  | 'count'
  | 'autoNumber'
  | 'checkbox'
  | 'date'
  | 'dateTime'
  | 'createdTime'
  | 'lastModifiedTime'
  | 'singleSelect'
  | 'multipleSelects'
  | 'singleCollaborator'
  | 'multipleCollaborators'
  | 'multipleRecordLinks'
  | 'multipleAttachments'
  | 'formula'
  | 'rollup'
  | 'lookup'
  | 'barcode'
  | 'button'
  | 'externalSyncSource';

/**
 * Collection name formatter function
 */
export type CollectionNameFormatter = (base: AirtableBase, table: AirtableTable) => string;

/**
 * AirtableDataSource configuration options
 */
export interface AirtableDataSourceOptions {
  /**
   * Airtable API Token
   * If not provided, reads from AIRTABLE_API_KEY environment variable
   */
  apiToken?: string;

  /**
   * Custom collection name formatter function
   * @default (base, table) => `${base.name} - ${table.name}`
   */
  collectionNameFormatter?: CollectionNameFormatter;

  /**
   * Only include specified bases (by name or ID)
   * If null, includes all bases
   */
  includeBases?: string[] | null;

  /**
   * Exclude specified bases (by name or ID)
   */
  excludeBases?: string[];

  /**
   * Only include specified tables (by name or ID)
   * If null, includes all tables
   */
  includeTables?: string[] | null;

  /**
   * Exclude specified tables (by name or ID)
   */
  excludeTables?: string[];
}

// =============================================================================
// Main Classes
// =============================================================================

/**
 * AirtableCollection - Represents a single Airtable table
 */
export declare class AirtableCollection extends BaseCollection {
  readonly baseId: string;
  readonly tableId: string;

  constructor(
    dataSource: AirtableDataSource,
    baseId: string,
    tableId: string,
    tableName: string,
    fields: AirtableField[],
    options?: Record<string, unknown>
  );
}

/**
 * AirtableDataSource - Airtable data source
 */
export declare class AirtableDataSource extends BaseDataSource {
  readonly apiToken: string;
  readonly options: Required<AirtableDataSourceOptions>;

  constructor(options?: AirtableDataSourceOptions);

  /**
   * Initialize the datasource, discover and register all Airtable tables
   */
  initialize(): Promise<void>;
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Factory function to create an Airtable DataSource
 *
 * @example
 * // Basic usage
 * agent.addDataSource(createAirtableDataSource());
 *
 * @example
 * // With configuration options
 * agent.addDataSource(createAirtableDataSource({
 *   apiToken: 'pat_xxxxx',
 *   excludeBases: ['Test Base'],
 *   collectionNameFormatter: (base, table) => table.name,
 * }));
 */
export declare function createAirtableDataSource(
  options?: AirtableDataSourceOptions
): () => Promise<AirtableDataSource>;

// =============================================================================
// Constants
// =============================================================================

export declare const AIRTABLE_API_URL: string;
export declare const AIRTABLE_META_URL: string;
export declare const BATCH_SIZE: number;
export declare const DEFAULT_PAGE_SIZE: number;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Maps Airtable field type to Forest Admin field type
 */
export declare function mapFieldType(airtableType: AirtableFieldType): string;

/**
 * Gets supported filter operators for a field type
 */
export declare function getFilterOperators(airtableType: AirtableFieldType): Set<string>;

/**
 * Checks if a field type is read-only
 */
export declare function isReadOnlyField(airtableType: AirtableFieldType): boolean;

/**
 * Extracts single record ID from filter condition
 */
export declare function extractSingleRecordId(filter: unknown): string | null;

/**
 * Builds Airtable filterByFormula
 */
export declare function buildFilterFormula(filter: unknown): string | null;

/**
 * Builds sort parameters
 */
export declare function buildSortParams(sort: unknown): Array<{ field: string; direction: 'asc' | 'desc' }> | null;

/**
 * Builds field projection parameters
 */
export declare function buildFieldsParams(projection: string[] | null): string[] | null;

/**
 * Field type mapping table
 */
export declare const FIELD_TYPE_MAP: Record<AirtableFieldType, string>;
