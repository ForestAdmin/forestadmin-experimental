import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import {
  Caller,
  CollectionSchema,
  ColumnSchema,
  DataSourceFactory,
  Logger,
  PaginatedFilter,
  Projection,
} from '@forestadmin/datasource-toolkit';

import ArrayCollection from './array-collection';
import CosmosCollection from './collection';
import CosmosDataSource from './datasource';
import { ConfigurationOptions, CosmosDatasourceBuilder } from './introspection/builder';
import Introspector, { VirtualArrayCollectionConfig } from './introspection/introspector';
import { CosmosSchema } from './model-builder/model';
import { ManualSchemaConfig } from './types/manual-schema';
import { convertManualSchemaToModels } from './utils/manual-schema-converter';
import TypeConverter, { CosmosDataType } from './utils/type-converter';

export interface IntrospectionConfig {
  /**
   * Number of sample documents to analyze for schema inference
   *
   * Default: 100
   *
   * Note: Cosmos DB queries are automatically paginated if they exceed 4 MB response size.
   * Large sample sizes (>1000) will work but may:
   * - Consume more Request Units (RUs)
   * - Take longer to complete
   * - Use more memory
   *
   * Recommended values:
   * - Small containers (<10K docs): 100-500
   * - Medium containers (10K-100K docs): 500-1000
   * - Large containers (>100K docs): 1000-5000
   */
  sampleSize?: number;

  /**
   * Field to order documents by during introspection
   *
   * Example: '_ts' to order by timestamp (latest first)
   * Default: undefined (no ordering)
   *
   * Common fields:
   * - '_ts': Cosmos DB system timestamp (seconds since epoch)
   * - 'createdAt': Your custom timestamp field
   * - 'id': Document ID (for consistent ordering)
   *
   * Note: Ordering may increase query RU consumption and requires an index
   * on the specified field for optimal performance.
   */
  orderByField?: string;

  /**
   * Order direction for introspection sampling
   *
   * 'DESC' for descending (latest first), 'ASC' for ascending (oldest first)
   * Default: 'DESC'
   */
  orderDirection?: 'ASC' | 'DESC';
}

export { default as CosmosCollection } from './collection';
export { default as CosmosDataSource } from './datasource';
export { default as ArrayCollection } from './array-collection';
export { default as TypeConverter } from './utils/type-converter';
export { default as ModelCosmos } from './model-builder/model';
export type { CosmosSchema } from './model-builder/model';
export type { VirtualArrayCollectionConfig } from './introspection/introspector';
export type {
  CollectionDefinition,
  FieldDefinition,
  ManualSchemaConfig,
} from './types/manual-schema';

/**
 * Create a Cosmos DB datasource with an existing CosmosClient instance
 * @param client Existing CosmosClient instance
 * @param databaseName Optional database name for auto-introspection
 * @param options Optional configuration builder function
 * @example
 * createCosmosDataSourceWithExistingClient(
 *   existingClient,
 *   'myDatabase',
 *   configurator => configurator.addCollectionFromContainer({
 *     name: 'Users',
 *     databaseName: 'myDatabase',
 *     containerName: 'users-container'
 *   })
 * )
 */
export function createCosmosDataSourceWithExistingClient(
  client: CosmosClient,
  databaseName?: string,
  options?: ConfigurationOptions,
): DataSourceFactory {
  return async (logger: Logger) => {
    let collectionModels;

    if (options) {
      const builder = options(new CosmosDatasourceBuilder(client)) as CosmosDatasourceBuilder;
      collectionModels = await builder.createCollectionsFromConfiguration();
    } else if (databaseName) {
      collectionModels = await Introspector.introspect(client, databaseName, logger);
    } else {
      collectionModels = [];
    }

    if (collectionModels.length === 0 && !options) {
      const message =
        'No collections were introspected. Please provide a databaseName or use the builder.';
      logger?.('Warn', message);
    }

    return new CosmosDataSource(client, collectionModels, logger);
  };
}

/**
 * Create a Cosmos DB datasource with connection details
 * @param endpoint The Cosmos DB endpoint URL
 * @param key The Cosmos DB access key
 * @param databaseName Optional database name for auto-introspection
 * @param options Optional configuration options
 * @example
 * .createCosmosDataSource(
 *   'https://myaccount.documents.azure.com:443/',
 *   'myAccessKey',
 *   'myDatabase',
 *   {
 *     builder: configurator =>
 *       configurator.addCollectionFromContainer({
 *         name: 'Users',
 *         databaseName: 'myDatabase',
 *         containerName: 'users-container'
 *       })
 *   }
 * )
 */
export function createCosmosDataSource(
  endpoint: string,
  key: string,
  databaseName?: string,
  options?: {
    liveQueryConnections?: string;
    liveQueryDatabase?: string;
    builder?: ConfigurationOptions;
    clientOptions?: CosmosClientOptions;
    virtualArrayCollections?: VirtualArrayCollectionConfig[];
    introspectionConfig?: IntrospectionConfig;
    /**
     * Disable automatic introspection and provide manual schema definitions
     * When true, you must provide a 'schema' configuration with collection definitions
     * Default: false
     */
    disableIntrospection?: boolean;
    /**
     * Manual schema configuration
     * Required when disableIntrospection is true
     * Allows you to define collections and their fields explicitly
     */
    schema?: ManualSchemaConfig;
  },
): DataSourceFactory {
  return async (logger: Logger) => {
    const client = new CosmosClient({
      endpoint,
      key,
      ...options?.clientOptions,
    });

    const {
      liveQueryConnections,
      liveQueryDatabase,
      builder,
      virtualArrayCollections,
      introspectionConfig,
      disableIntrospection,
      schema,
    } = options || {};

    // Apply introspection config defaults
    const finalIntrospectionConfig: IntrospectionConfig = {
      sampleSize: introspectionConfig?.sampleSize ?? 100,
      orderByField: introspectionConfig?.orderByField,
      orderDirection: introspectionConfig?.orderDirection ?? 'DESC',
    };

    let collectionModels;

    // Handle manual schema configuration
    if (disableIntrospection) {
      if (!schema) {
        throw new Error(
          'When disableIntrospection is true, you must provide a schema configuration ' +
            'with collection definitions',
        );
      }

      logger?.('Info', 'Using manual schema configuration (introspection disabled)');
      collectionModels = await convertManualSchemaToModels(client, schema, logger);
    } else if (builder) {
      const datasourceBuilder = builder(
        new CosmosDatasourceBuilder(client),
      ) as CosmosDatasourceBuilder;

      collectionModels = await datasourceBuilder.createCollectionsFromConfiguration();
    } else if (databaseName) {
      collectionModels = await Introspector.introspect(
        client,
        databaseName,
        logger,
        finalIntrospectionConfig.sampleSize,
        finalIntrospectionConfig.orderByField,
        finalIntrospectionConfig.orderDirection,
      );
    } else {
      collectionModels = [];
    }

    if (collectionModels.length === 0 && !builder && !disableIntrospection) {
      const message =
        'No collections were introspected. Please provide a databaseName or use the builder.';
      logger?.('Warn', message);
    }

    const datasource = new CosmosDataSource(client, collectionModels, logger, {
      liveQueryConnections,
      liveQueryDatabase,
    });

    // Add virtual array collections if specified
    if (virtualArrayCollections && virtualArrayCollections.length > 0) {
      // Track created virtual collections for dependency resolution
      const createdVirtualCollections = new Map<string, ArrayCollection | CosmosCollection>();

      for (const config of virtualArrayCollections) {
        try {
          logger?.(
            'Info',
            `Creating virtual collection '${config.collectionName}' for array ` +
              `field '${config.arrayFieldPath}'`,
          );

          // Find the parent collection (could be physical or virtual)
          const parentCollection = datasource.getCollection(config.parentContainerName);

          if (!parentCollection) {
            logger?.(
              'Warn',
              `Parent collection '${config.parentContainerName}' not found for ` +
                `virtual array collection '${config.collectionName}'`,
            );
          } else {
            let arraySchema: CosmosSchema | null = null;

            // Check if parent is a virtual ArrayCollection
            const isParentVirtual = parentCollection instanceof ArrayCollection;

            if (isParentVirtual) {
              // For nested virtual collections, introspect from the parent's schema
              logger?.(
                'Info',
                `Parent '${config.parentContainerName}' is a virtual collection, ` +
                  `introspecting from its schema`,
              );

              // Get the field schema from the parent collection
              const parentSchema = parentCollection.schema;
              const arrayField = parentSchema.fields[config.arrayFieldPath];

              if (!arrayField || arrayField.type !== 'Column') {
                logger?.(
                  'Warn',
                  `Array field '${config.arrayFieldPath}' not found in parent ` +
                    `virtual collection '${config.parentContainerName}'`,
                );
              } else {
                // For nested arrays, we need to fetch actual data to introspect the structure
                // Use the parent ArrayCollection to get sample data
                // Sequential: we need sample data to introspect array structure
                // eslint-disable-next-line no-await-in-loop -- Sequential introspection required
                const sampleRecords = await (parentCollection as ArrayCollection).list(
                  {} as Caller,
                  new PaginatedFilter({
                    page: {
                      limit: finalIntrospectionConfig.sampleSize ?? 100,
                      skip: 0,
                      apply: (records: unknown[]) => records,
                    },
                  }),
                  new Projection(config.arrayFieldPath),
                );

                // Collect array items from sample records
                const arrayItems: unknown[] = [];

                for (const record of sampleRecords) {
                  const value = record[config.arrayFieldPath];

                  if (Array.isArray(value)) {
                    arrayItems.push(...value);
                  }
                }

                if (arrayItems.length === 0) {
                  logger?.(
                    'Warn',
                    `No array items found in field '${config.arrayFieldPath}' of ` +
                      `virtual collection '${config.parentContainerName}'`,
                  );
                } else {
                  // Analyze array items to infer schema
                  const fieldTypes: Record<string, CosmosDataType[]> = {};

                  for (const item of arrayItems) {
                    if (typeof item === 'object' && item !== null) {
                      for (const [fieldKey, value] of Object.entries(item)) {
                        if (!fieldTypes[fieldKey]) {
                          fieldTypes[fieldKey] = [];
                        }

                        const type = TypeConverter.inferTypeFromValue(value);
                        fieldTypes[fieldKey].push(type);
                      }
                    }
                  }

                  // Build schema from inferred types
                  arraySchema = {};

                  for (const [fieldName, types] of Object.entries(fieldTypes)) {
                    const uniqueTypes = Array.from(new Set(types));
                    const commonType = TypeConverter.getMostSpecificType(uniqueTypes);
                    const nullable = uniqueTypes.includes('null');

                    arraySchema[fieldName] = {
                      type: commonType,
                      nullable,
                      indexed: true,
                    };
                  }
                }
              }
            } else if (!databaseName) {
              // For physical containers, use the existing introspection method
              // Sequential: we need to introspect the array field structure
              logger?.(
                'Warn',
                `Database name is required to introspect physical container for ` +
                  `virtual collection '${config.collectionName}'`,
              );
            } else {
              // Sequential: we need to introspect the array field structure
              // eslint-disable-next-line no-await-in-loop -- Sequential introspection required
              arraySchema = await Introspector.introspectArrayField(
                client,
                databaseName,
                config.parentContainerName,
                config.arrayFieldPath,
              );
            }

            if (arraySchema) {
              // Convert CosmosSchema to Forest Admin fields
              const fields: Record<string, ColumnSchema> = {};

              for (const [fieldName, fieldInfo] of Object.entries(arraySchema)) {
                const columnType = TypeConverter.getColumnTypeFromDataType(
                  fieldInfo.type as CosmosDataType,
                );
                const operators = TypeConverter.operatorsForColumnType(columnType);
                fields[fieldName] = {
                  columnType,
                  filterOperators: operators,
                  isPrimaryKey: false,
                  isReadOnly: false,
                  isSortable: TypeConverter.isSortable(fieldInfo.type as CosmosDataType),
                  type: 'Column',
                } as ColumnSchema;
              }

              // Create collection schema with introspected fields
              const collectionSchema: CollectionSchema = {
                actions: {},
                charts: [],
                countable: true,
                fields,
                searchable: true,
                segments: [],
              };

              // Create the virtual array collection (without virtualized child fields yet)
              const arrayCollection = new ArrayCollection(
                datasource,
                parentCollection as CosmosCollection,
                config.collectionName,
                config.arrayFieldPath,
                collectionSchema,
                logger,
                client,
                [], // Empty for now, will be set after all collections are created
                true, // Enable optimizations for better performance with large datasets
              );

              // Add the collection to the datasource
              datasource.addCollection(arrayCollection);
              createdVirtualCollections.set(config.collectionName, arrayCollection);

              logger?.(
                'Info',
                `Successfully created virtual collection '${config.collectionName}'`,
              );
            }
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const errorStack = error instanceof Error ? error.stack : '';
          logger?.(
            'Warn',
            `Failed to create virtual array collection '${config.collectionName}': ${errorMessage}`,
          );
          logger?.('Debug', `Error stack: ${errorStack}`);
        }
      }

      // After all collections are created, set virtualized child fields
      // For each parent collection that has virtual child collections
      // Tell it which fields are virtualized
      const parentCollections = new Set(virtualArrayCollections.map(c => c.parentContainerName));

      for (const parentName of parentCollections) {
        try {
          const parentCollection = datasource.getCollection(parentName);

          // Find all child virtual collections that have this collection as parent
          const childVirtualFields = virtualArrayCollections
            .filter(c => c.parentContainerName === parentName)
            .map(c => c.arrayFieldPath);

          if (childVirtualFields.length > 0) {
            // For virtual collections (ArrayCollection), set virtualized child fields for filtering
            if (parentCollection instanceof ArrayCollection) {
              parentCollection.setVirtualizedChildFields(childVirtualFields);
              logger?.(
                'Info',
                `Set virtualized child fields for virtual collection '${parentName}': ` +
                  `[${childVirtualFields.join(', ')}]`,
              );
            }

            // For physical collections (CosmosCollection), mark array fields as non-sortable
            if (parentCollection instanceof CosmosCollection) {
              parentCollection.markVirtualizedFieldsAsNonSortable(childVirtualFields);
              logger?.(
                'Info',
                `Marked virtualized array fields as non-sortable for '${parentName}': ` +
                  `[${childVirtualFields.join(', ')}]`,
              );
            }
          }
        } catch (error) {
          // Parent collection might not exist
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger?.(
            'Debug',
            `Skipping virtualized field setup for '${parentName}': ${errorMessage}`,
          );
        }
      }
    }

    return datasource;
  };
}

/**
 * Create a Cosmos DB datasource for the local emulator
 * @param databaseName Optional database name for auto-introspection
 * @param options Optional configuration options
 * @example
 * .createCosmosDataSourceForEmulator('myDatabase', {
 *   builder: configurator =>
 *     configurator.addCollectionFromContainer({
 *       name: 'Users',
 *       databaseName: 'myDatabase',
 *       containerName: 'users'
 *     })
 * })
 */
export function createCosmosDataSourceForEmulator(
  databaseName?: string,
  options?: {
    liveQueryConnections?: string;
    liveQueryDatabase?: string;
    builder?: ConfigurationOptions;
    clientOptions?: CosmosClientOptions;
    introspectionConfig?: IntrospectionConfig;
    disableIntrospection?: boolean;
    schema?: ManualSchemaConfig;
  },
): DataSourceFactory {
  // Default emulator connection details
  const endpoint = 'https://localhost:8081';
  const key =
    'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';

  return createCosmosDataSource(endpoint, key, databaseName, options);
}
