import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import {
  CollectionSchema,
  ColumnSchema,
  DataSourceFactory,
  Logger,
  Projection,
} from '@forestadmin/datasource-toolkit';

import ArrayCollection from './array-collection';
import CosmosCollection from './collection';
import CosmosDataSource from './datasource';
import { ConfigurationOptions, CosmosDatasourceBuilder } from './introspection/builder';
import Introspector, { VirtualArrayCollectionConfig } from './introspection/introspector';
import { CosmosSchema } from './model-builder/model';
import TypeConverter, { CosmosDataType } from './utils/type-converter';

export { default as CosmosCollection } from './collection';
export { default as CosmosDataSource } from './datasource';
export { default as ArrayCollection } from './array-collection';
export { default as TypeConverter } from './utils/type-converter';
export { default as ModelCosmos } from './model-builder/model';
export type { CosmosSchema } from './model-builder/model';
export type { VirtualArrayCollectionConfig } from './introspection/introspector';

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
  },
): DataSourceFactory {
  return async (logger: Logger) => {
    const client = new CosmosClient({
      endpoint,
      key,
      ...options?.clientOptions,
    });

    const { liveQueryConnections, liveQueryDatabase, builder, virtualArrayCollections } =
      options || {};

    let collectionModels;

    if (builder) {
      const datasourceBuilder = builder(
        new CosmosDatasourceBuilder(client),
      ) as CosmosDatasourceBuilder;
      collectionModels = await datasourceBuilder.createCollectionsFromConfiguration();
    } else if (databaseName) {
      collectionModels = await Introspector.introspect(client, databaseName, logger);
    } else {
      collectionModels = [];
    }

    if (collectionModels.length === 0 && !builder) {
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
      const createdVirtualCollections = new Map<string, any>();

      for (const config of virtualArrayCollections) {
        try {
          logger?.(
            'Info',
            // eslint-disable-next-line max-len
            `Creating virtual collection '${config.collectionName}' for array field '${config.arrayFieldPath}'`,
          );

          // Find the parent collection (could be physical or virtual)
          const parentCollection = datasource.getCollection(config.parentContainerName);

          if (!parentCollection) {
            logger?.(
              'Warn',
              // eslint-disable-next-line max-len
              `Parent collection '${config.parentContainerName}' not found for virtual array collection '${config.collectionName}'`,
            );
            // eslint-disable-next-line no-continue
            continue;
          }

          let arraySchema: CosmosSchema;

          // Check if parent is a virtual ArrayCollection
          const isParentVirtual = parentCollection instanceof ArrayCollection;

          if (isParentVirtual) {
            // For nested virtual collections, introspect from the parent's schema
            logger?.(
              'Info',
              // eslint-disable-next-line max-len
              `Parent '${config.parentContainerName}' is a virtual collection, introspecting from its schema`,
            );

            // Get the field schema from the parent collection
            const parentSchema = parentCollection.schema;
            const arrayField = parentSchema.fields[config.arrayFieldPath];

            if (!arrayField || arrayField.type !== 'Column') {
              logger?.(
                'Warn',
                // eslint-disable-next-line max-len
                `Array field '${config.arrayFieldPath}' not found in parent virtual collection '${config.parentContainerName}'`,
              );
              // eslint-disable-next-line no-continue
              continue;
            }

            // For nested arrays, we need to fetch actual data to introspect the structure
            // Use the parent ArrayCollection to get sample data
            // eslint-disable-next-line no-await-in-loop
            const sampleRecords = await (parentCollection as ArrayCollection).list(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {} as any,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              { limit: 100 } as any,
              new Projection(config.arrayFieldPath),
            );

            // Collect array items from sample records
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const arrayItems: any[] = [];

            for (const record of sampleRecords) {
              const value = record[config.arrayFieldPath];

              if (Array.isArray(value)) {
                arrayItems.push(...value);
              }
            }

            if (arrayItems.length === 0) {
              logger?.(
                'Warn',
                // eslint-disable-next-line max-len
                `No array items found in field '${config.arrayFieldPath}' of virtual collection '${config.parentContainerName}'`,
              );
              // eslint-disable-next-line no-continue
              continue;
            }

            // Analyze array items to infer schema
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const fieldTypes: Record<string, any[]> = {};

            for (const item of arrayItems) {
              if (typeof item === 'object' && item !== null) {
                // eslint-disable-next-line @typescript-eslint/no-shadow
                for (const [key, value] of Object.entries(item)) {
                  if (!fieldTypes[key]) {
                    fieldTypes[key] = [];
                  }

                  const type = TypeConverter.inferTypeFromValue(value);
                  fieldTypes[key].push(type);
                }
              }
            }

            // Build schema from inferred types
            arraySchema = {};

            for (const [fieldName, types] of Object.entries(fieldTypes)) {
              const uniqueTypes = Array.from(new Set(types));
              const commonType = TypeConverter.getMostSpecificType(uniqueTypes as any);
              const nullable = uniqueTypes.includes('null');

              arraySchema[fieldName] = {
                type: commonType,
                nullable,
                indexed: true,
              };
            }
          } else {
            // For physical containers, use the existing introspection method
            // eslint-disable-next-line no-await-in-loop
            arraySchema = await Introspector.introspectArrayField(
              client,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              databaseName!,
              config.parentContainerName,
              config.arrayFieldPath,
            );
          }

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
            parentCollection as any,
            config.collectionName,
            config.arrayFieldPath,
            collectionSchema,
            logger,
            client,
            [], // Empty for now, will be set after all collections are created
          );

          // Add the collection to the datasource
          datasource.addCollection(arrayCollection);
          createdVirtualCollections.set(config.collectionName, arrayCollection);

          logger?.('Info', `Successfully created virtual collection '${config.collectionName}'`);
        } catch (error) {
          logger?.(
            'Warn',
            // eslint-disable-next-line max-len
            `Failed to create virtual array collection '${config.collectionName}': ${error.message}`,
          );
          logger?.('Debug', `Error stack: ${error.stack}`);
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
                // eslint-disable-next-line max-len
                `Set virtualized child fields for virtual collection '${parentName}': [${childVirtualFields.join(
                  ', ',
                )}]`,
              );
            }

            // For physical collections (CosmosCollection), mark array fields as non-sortable
            if (parentCollection instanceof CosmosCollection) {
              parentCollection.markVirtualizedFieldsAsNonSortable(childVirtualFields);
              logger?.(
                'Info',
                // eslint-disable-next-line max-len
                `Marked virtualized array fields as non-sortable for '${parentName}': [${childVirtualFields.join(
                  ', ',
                )}]`,
              );
            }
          }
        } catch (error) {
          // Parent collection might not exist
          logger?.(
            'Debug',
            `Skipping virtualized field setup for '${parentName}': ${error.message}`,
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
  },
): DataSourceFactory {
  // Default emulator connection details
  const endpoint = 'https://localhost:8081';
  const key =
    'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';

  return createCosmosDataSource(endpoint, key, databaseName, options);
}
