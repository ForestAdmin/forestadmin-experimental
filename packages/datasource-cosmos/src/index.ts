import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';

import CosmosDataSource from './datasource';
import { ConfigurationOptions, CosmosDatasourceBuilder } from './introspection/builder';
import Introspector, { VirtualArrayCollectionConfig } from './introspection/introspector';
import { ManualSchemaConfig } from './types/manual-schema';
import { convertManualSchemaToModels } from './utils/manual-schema-converter';
import VirtualCollectionManager from './virtual-collection-manager';

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
      collectionModels = await convertManualSchemaToModels(client, schema, logger, databaseName);
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
      const virtualCollectionManager = new VirtualCollectionManager(
        datasource,
        client,
        databaseName,
        logger,
      );

      await virtualCollectionManager.createVirtualCollections(
        virtualArrayCollections,
        finalIntrospectionConfig.sampleSize ?? 100,
      );
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
