/**
 * @forestadmin-experimental/datasource-airtable-v3
 *
 * Forest Admin DataSource for Airtable - TypeScript implementation
 * Following the architecture pattern of datasource-cosmos
 */

import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';

import AirtableDataSource from './datasource';
import { Introspector, AirtableDatasourceBuilder, convertManualSchemaToModels } from './introspection';
import {
  AirtableDataSourceOptions,
  ConfigurationOptions,
  ManualSchemaConfig,
  RetryOptions,
} from './types/config';
import { configureLogger, configureRetryOptions } from './utils/retry-handler';

// Re-export types
export type {
  AirtableDataSourceOptions,
  ConfigurationOptions,
  ManualSchemaConfig,
  RetryOptions,
  CollectionDefinition,
  FieldDefinition,
} from './types/config';

export type {
  AirtableFieldType,
  AirtableFieldDefinition,
  AirtableTableDefinition,
  AirtableBaseDefinition,
  AirtableRecord,
  AirtableAttachment,
  AirtableCollaborator,
} from './types/airtable';

// Re-export classes
export { default as AirtableDataSource } from './datasource';
export { default as AirtableCollection } from './collection';
export { default as AirtableModel } from './model-builder/model';
export { default as TypeConverter } from './utils/type-converter';
export { default as Serializer } from './utils/serializer';
export { default as AggregationConverter } from './utils/aggregation-converter';

// Re-export utilities
export {
  buildFilterFormula,
  buildSort,
  buildFields,
  extractRecordId,
  extractRecordIds,
} from './utils/filter-converter';

export {
  withRetry,
  createRetryWrapper,
  isRateLimitError,
  isTransientError,
  configureRetryOptions,
  configureLogger,
  getSharedRetryOptions,
} from './utils/retry-handler';

export {
  AIRTABLE_META_URL,
  AIRTABLE_API_URL,
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from './utils/constants';

// Re-export introspection
export { Introspector, AirtableDatasourceBuilder } from './introspection';

/**
 * Create an Airtable DataSource with automatic introspection
 *
 * @param options - Configuration options
 * @returns DataSource factory function
 *
 * @example
 * // Basic usage with environment variable
 * agent.addDataSource(createAirtableDataSource());
 *
 * @example
 * // With API key and filtering
 * agent.addDataSource(createAirtableDataSource({
 *   apiKey: 'pat...',
 *   includeBases: ['My Base'],
 *   excludeTables: ['Archive'],
 * }));
 *
 * @example
 * // With custom collection naming
 * agent.addDataSource(createAirtableDataSource({
 *   collectionNameFormatter: (base, table) => table.name,
 * }));
 */
export function createAirtableDataSource(
  options: AirtableDataSourceOptions = {},
): DataSourceFactory {
  return async (logger: Logger) => {
    const apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Airtable API key is required. ' +
        'Set AIRTABLE_API_KEY environment variable or pass apiKey in options.',
      );
    }

    // Configure logger for retry handler
    configureLogger(logger);

    // Configure retry options if provided
    if (options.retryOptions) {
      configureRetryOptions(options.retryOptions);
    }

    let models;
    let bases;

    // Handle manual schema configuration
    if (options.disableIntrospection) {
      if (!options.schema) {
        throw new Error(
          'When disableIntrospection is true, you must provide a schema configuration.',
        );
      }

      logger?.('Info', 'Using manual schema configuration (introspection disabled)');

      const result = await convertManualSchemaToModels(
        apiKey,
        options.schema,
        logger,
        options.endpointUrl,
      );

      models = result.models;
      bases = result.bases;
    } else if (options.builder) {
      // Use builder pattern
      logger?.('Info', 'Using builder configuration');

      const builder = new AirtableDatasourceBuilder(
        apiKey,
        options.endpointUrl,
        options.retryOptions,
      );

      options.builder(builder);

      const result = await builder.build();
      models = result.models;
      bases = result.bases;
    } else {
      // Use automatic introspection
      logger?.('Info', 'Using automatic introspection');

      const introspector = new Introspector(apiKey, options, logger);
      const result = await introspector.introspect();

      models = result.models;
      bases = result.bases;
    }

    if (models.length === 0) {
      logger?.('Warn', 'No collections were created. Check your configuration.');
    }

    return new AirtableDataSource(models, bases, logger);
  };
}

/**
 * Create an Airtable DataSource with builder configuration
 *
 * @param apiKey - Airtable API key
 * @param builderFn - Configuration builder function
 * @param options - Additional options
 * @returns DataSource factory function
 *
 * @example
 * agent.addDataSource(createAirtableDataSourceWithBuilder(
 *   'pat...',
 *   builder => builder
 *     .addCollectionFromTable({
 *       name: 'Users',
 *       baseId: 'app...',
 *       tableId: 'tbl...',
 *     })
 *     .addCollectionsFromBase({
 *       baseId: 'app...',
 *       excludeTables: ['Archive'],
 *     })
 * ));
 */
export function createAirtableDataSourceWithBuilder(
  apiKey: string,
  builderFn: ConfigurationOptions,
  options: { endpointUrl?: string; retryOptions?: RetryOptions } = {},
): DataSourceFactory {
  return async (logger: Logger) => {
    configureLogger(logger);

    if (options.retryOptions) {
      configureRetryOptions(options.retryOptions);
    }

    const builder = new AirtableDatasourceBuilder(
      apiKey,
      options.endpointUrl,
      options.retryOptions,
    );

    builderFn(builder);

    const { models, bases } = await builder.build();

    if (models.length === 0) {
      logger?.('Warn', 'No collections were created. Check your builder configuration.');
    }

    return new AirtableDataSource(models, bases, logger);
  };
}

/**
 * Create an Airtable DataSource with manual schema (no introspection)
 *
 * @param apiKey - Airtable API key
 * @param schema - Manual schema configuration
 * @param options - Additional options
 * @returns DataSource factory function
 *
 * @example
 * agent.addDataSource(createAirtableDataSourceWithSchema(
 *   'pat...',
 *   {
 *     collections: [
 *       {
 *         name: 'Users',
 *         baseId: 'app...',
 *         tableId: 'tbl...',
 *         fields: [
 *           { name: 'Name', type: 'singleLineText' },
 *           { name: 'Email', type: 'email' },
 *           { name: 'Active', type: 'checkbox' },
 *         ],
 *       },
 *     ],
 *   }
 * ));
 */
export function createAirtableDataSourceWithSchema(
  apiKey: string,
  schema: ManualSchemaConfig,
  options: { endpointUrl?: string; retryOptions?: RetryOptions } = {},
): DataSourceFactory {
  return async (logger: Logger) => {
    configureLogger(logger);

    if (options.retryOptions) {
      configureRetryOptions(options.retryOptions);
    }

    logger?.('Info', 'Creating Airtable DataSource with manual schema');

    const { models, bases } = await convertManualSchemaToModels(
      apiKey,
      schema,
      logger,
      options.endpointUrl,
    );

    if (models.length === 0) {
      logger?.('Warn', 'No collections were created. Check your schema configuration.');
    }

    return new AirtableDataSource(models, bases, logger);
  };
}

// Default export
export default createAirtableDataSource;
