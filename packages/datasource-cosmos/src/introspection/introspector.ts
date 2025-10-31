import type { CosmosDataType } from '../utils/type-converter';

import { CosmosClient } from '@azure/cosmos';
import { Logger } from '@forestadmin/datasource-toolkit';

import introspectContainer from './container-introspector';
import ModelCosmos, { CosmosSchema } from '../model-builder/model';
import TypeConverter from '../utils/type-converter';

export interface VirtualArrayCollectionConfig {
  parentContainerName: string;
  collectionName: string;
  arrayFieldPath: string;
}

export interface IntrospectionResult {
  models: ModelCosmos[];
  virtualArrayCollections: Array<{
    config: VirtualArrayCollectionConfig;
    schema: CosmosSchema;
    parentModel: ModelCosmos;
  }>;
}

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

    // Sequential execution required: introspecting containers one at a time
    // ensures consistent resource usage and provides better error context per container
    const introspectionResults = await Promise.all(
      userContainers.map(async containerInfo => {
        try {
          const model = await introspectContainer(
            cosmosClient,
            containerInfo.id, // Use container name as collection name
            databaseName,
            containerInfo.id,
            undefined, // Let introspector determine partition key
            100, // Sample size
          );

          logger?.(
            'Info',
            `Introspector - Successfully introspected container '${containerInfo.id}'`,
          );

          return { success: true, model };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          logger?.(
            'Warn',
            `Introspector - Failed to introspect container '${containerInfo.id}': ${errorMessage}`,
          );

          return { success: false, model: null };
        }
      }),
    );

    // Collect successful results
    for (const result of introspectionResults) {
      if (result.success && result.model) {
        results.push(result.model);
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

  /**
   * Introspect array fields in documents to create virtual collection schemas
   */
  static async introspectArrayField(
    cosmosClient: CosmosClient,
    databaseName: string,
    containerName: string,
    arrayFieldPath: string,
    sampleSize = 100,
  ): Promise<CosmosSchema> {
    const database = cosmosClient.database(databaseName);
    const container = database.container(containerName);

    // Build query to fetch documents with the array field
    const fieldPathForQuery = arrayFieldPath.replace(/->/g, '.');
    const querySpec = {
      query:
        `SELECT TOP ${sampleSize} c.id, c.${fieldPathForQuery} as arrayField FROM c ` +
        `WHERE IS_DEFINED(c.${fieldPathForQuery}) AND IS_ARRAY(c.${fieldPathForQuery})`,
    };

    const { resources: sampleDocuments } = await container.items.query(querySpec).fetchAll();

    if (sampleDocuments.length === 0) {
      return {};
    }

    // Collect all array items from the sample documents
    const arrayItems: unknown[] = [];

    for (const doc of sampleDocuments) {
      if (Array.isArray(doc.arrayField)) {
        arrayItems.push(...doc.arrayField);
      }
    }

    if (arrayItems.length === 0) {
      return {};
    }

    // Analyze array items to infer schema
    const fieldTypes: Record<string, CosmosDataType[]> = {};

    for (const item of arrayItems) {
      if (typeof item === 'object' && item !== null) {
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
    const schema: CosmosSchema = {};

    for (const [fieldName, types] of Object.entries(fieldTypes)) {
      const uniqueTypes = Array.from(new Set(types));
      const commonType = TypeConverter.getMostSpecificType(uniqueTypes);
      const nullable = uniqueTypes.includes('null');

      schema[fieldName] = {
        type: commonType,
        nullable,
        indexed: true,
      };
    }

    return schema;
  }
}
