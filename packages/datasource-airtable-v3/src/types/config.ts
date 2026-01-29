/**
 * Configuration type definitions for the Airtable DataSource
 */

import { Logger } from '@forestadmin/datasource-toolkit';

import { AirtableBaseDefinition, AirtableTableDefinition } from './airtable';

/**
 * Options for creating the Airtable DataSource
 */
export interface AirtableDataSourceOptions {
  /**
   * Airtable API key (Personal Access Token)
   * If not provided, will use AIRTABLE_API_KEY environment variable
   */
  apiKey?: string;

  /**
   * Custom Airtable API endpoint URL
   * Useful for testing or proxy setups
   */
  endpointUrl?: string;

  /**
   * Custom function to format collection names
   * Default: (base, table) => `${base.name} - ${table.name}`
   *
   * @param base - Base information
   * @param table - Table information
   * @returns The collection name to use in Forest Admin
   */
  collectionNameFormatter?: (
    base: { id: string; name: string },
    table: { id: string; name: string }
  ) => string;

  /**
   * Only include bases with these names
   * If specified, excludeBases is ignored
   */
  includeBases?: string[];

  /**
   * Exclude bases with these names
   */
  excludeBases?: string[];

  /**
   * Only include tables with these names
   * If specified, excludeTables is ignored
   */
  includeTables?: string[];

  /**
   * Exclude tables with these names
   */
  excludeTables?: string[];

  /**
   * Disable automatic introspection
   * When true, you must provide a 'schema' configuration
   */
  disableIntrospection?: boolean;

  /**
   * Manual schema configuration
   * Required when disableIntrospection is true
   */
  schema?: ManualSchemaConfig;

  /**
   * Retry options for handling rate limiting
   */
  retryOptions?: RetryOptions;

  /**
   * Configuration for builder pattern
   */
  builder?: ConfigurationOptions;
}

/**
 * Builder pattern configuration function type
 */
export type ConfigurationOptions = (
  builder: AirtableDataSourceBuilder
) => AirtableDataSourceBuilder;

/**
 * Builder interface for configuring the DataSource
 */
export interface AirtableDataSourceBuilder {
  /**
   * Add a collection from a specific base and table
   */
  addCollectionFromTable(config: {
    name: string;
    baseId: string;
    tableId: string;
  }): AirtableDataSourceBuilder;

  /**
   * Add all tables from a specific base
   */
  addCollectionsFromBase(config: {
    baseId: string;
    collectionNameFormatter?: (table: { id: string; name: string }) => string;
    excludeTables?: string[];
  }): AirtableDataSourceBuilder;
}

/**
 * Manual schema configuration
 */
export interface ManualSchemaConfig {
  /**
   * Array of collection definitions
   */
  collections: CollectionDefinition[];
}

/**
 * Manual collection definition
 */
export interface CollectionDefinition {
  /**
   * The name of the collection in Forest Admin
   */
  name: string;

  /**
   * The Airtable base ID
   */
  baseId: string;

  /**
   * The Airtable table ID
   */
  tableId: string;

  /**
   * Field definitions for this collection
   */
  fields: FieldDefinition[];

  /**
   * Whether to enable count operations
   * Default: true
   */
  enableCount?: boolean;
}

/**
 * Manual field definition
 */
export interface FieldDefinition {
  /**
   * The name of the field
   */
  name: string;

  /**
   * The Airtable field type
   */
  type: string;

  /**
   * Whether the field is read-only
   * Default: false
   */
  isReadOnly?: boolean;

  /**
   * Whether the field is sortable
   * Default: true
   */
  isSortable?: boolean;

  /**
   * Field options (for select fields, etc.)
   */
  options?: Record<string, unknown>;
}

/**
 * Retry options for handling Airtable rate limiting
 */
export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * Default: 5
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry
   * Default: 1000
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds between retries
   * Default: 30000
   */
  maxDelayMs?: number;

  /**
   * Multiplier for exponential backoff
   * Default: 2
   */
  backoffMultiplier?: number;

  /**
   * Whether to add jitter to retry delays
   * Default: true
   */
  jitter?: boolean;
}

/**
 * Internal model configuration
 */
export interface AirtableModelConfig {
  name: string;
  baseId: string;
  tableId: string;
  fields: ModelFieldDefinition[];
  enableCount?: boolean;
}

/**
 * Type for Airtable field definition in model (internal use)
 */
export interface ModelFieldDefinition {
  id: string;
  name: string;
  type: string;
  options?: Record<string, unknown>;
}

/**
 * Introspection result
 */
export interface IntrospectionResult {
  bases: Array<{
    base: AirtableBaseDefinition;
    tables: AirtableTableDefinition[];
  }>;
}

/**
 * Logger type alias
 */
export type AirtableLogger = Logger;
