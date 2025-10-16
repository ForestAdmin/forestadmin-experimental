/* eslint-disable no-await-in-loop */
import { CosmosClient } from '@azure/cosmos';
import { Logger } from '@forestadmin/datasource-toolkit';

import introspectContainer from './container-introspector';
import ModelCosmos from '../model-builder/model';

export default class Introspector {
  /**
   * Introspect all containers in a Cosmos DB database
   */
  static async introspect(
    cosmosClient: CosmosClient,
    databaseName: string,
    logger?: Logger,
  ): Promise<ModelCosmos[]> {
    logger?.('Info', 'Introspector - Introspect Cosmos DB');

    return Introspector.introspectAll(cosmosClient, databaseName, logger);
  }

  /**
   * Introspect all containers in the specified database
   */
  private static async introspectAll(
    cosmosClient: CosmosClient,
    databaseName: string,
    logger?: Logger,
  ): Promise<ModelCosmos[]> {
    const results: ModelCosmos[] = [];
    const database = cosmosClient.database(databaseName);

    // Get all containers in the database
    const { resources: containers } = await database.containers.readAll().fetchAll();

    // Filter out system containers if needed
    const userContainers = containers.filter(container => !container.id.startsWith('_'));

    logger?.(
      'Info',
      `Introspector - Found ${userContainers.length} containers in database '${databaseName}'`,
    );

    // Introspect each container
    for (const containerInfo of userContainers) {
      try {
        const model = await introspectContainer(
          cosmosClient,
          containerInfo.id, // Use container name as collection name
          databaseName,
          containerInfo.id,
          undefined, // Let introspector determine partition key
          100, // Sample size
        );

        results.push(model);

        logger?.(
          'Info',
          `Introspector - Successfully introspected container '${containerInfo.id}'`,
        );
      } catch (error) {
        logger?.(
          'Warn',
          `Introspector - Failed to introspect container '${containerInfo.id}': ${error.message}`,
        );
      }
    }

    logger?.(
      'Info',
      `Introspector - The following containers have been loaded: ${userContainers
        .map(c => c.id)
        .join(', ')}`,
    );

    return results;
  }

  /**
   * Introspect a specific container
   */
  static async introspectContainer(
    cosmosClient: CosmosClient,
    databaseName: string,
    containerName: string,
    sampleSize?: number,
    logger?: Logger,
  ): Promise<ModelCosmos> {
    logger?.('Info', `Introspector - Introspecting container '${containerName}'`);

    const model = await introspectContainer(
      cosmosClient,
      containerName,
      databaseName,
      containerName,
      undefined,
      sampleSize || 100,
    );

    logger?.('Info', `Introspector - Successfully introspected container '${containerName}'`);

    return model;
  }
}
