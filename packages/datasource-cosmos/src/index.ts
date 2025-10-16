import { CosmosClient, CosmosClientOptions } from '@azure/cosmos';
import { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';

import CosmosDataSource from './datasource';
import { ConfigurationOptions, CosmosDatasourceBuilder } from './introspection/builder';
import Introspector from './introspection/introspector';

export { default as CosmosCollection } from './collection';
export { default as CosmosDataSource } from './datasource';
export { default as TypeConverter } from './utils/type-converter';
export { default as ModelCosmos } from './model-builder/model';
export type { CosmosSchema } from './model-builder/model';

/**
 * Create a Cosmos DB datasource with an existing CosmosClient instance
 * @param client Existing CosmosClient instance
 * @param databaseName The Cosmos DB database name to introspect
 * @param options Optional configuration options
 * @example
 * .createCosmosDataSourceWithExistingClient(existingClient, 'myDatabase', configurator =>
 *   configurator.addCollectionFromContainer({
 *     name: 'Users',
 *     databaseName: 'myDatabase',
 *     containerName: 'users-container'
 *   })
 * )
 */
export function createCosmosDataSourceWithExistingClient(
  client: CosmosClient,
  databaseName?: string,
): DataSourceFactory {
  return async (logger: Logger, options?: ConfigurationOptions) => {
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
  },
): DataSourceFactory {
  return async (logger: Logger) => {
    const client = new CosmosClient({
      endpoint,
      key,
      ...options?.clientOptions,
    });

    const { liveQueryConnections, liveQueryDatabase, builder } = options || {};

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

    return new CosmosDataSource(client, collectionModels, logger, {
      liveQueryConnections,
      liveQueryDatabase,
    });
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
