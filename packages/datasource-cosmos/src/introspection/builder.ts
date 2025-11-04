import { CosmosClient } from '@azure/cosmos';
import { FieldSchema } from '@forestadmin/datasource-toolkit';

import introspectContainer from './container-introspector';
import ModelCosmos from '../model-builder/model';

export type OverrideTypeConverter = (field: {
  fieldName: string;
  attribute: { type: string; nullable?: boolean; indexed?: boolean };
  generatedFieldSchema: FieldSchema;
}) => void | FieldSchema;

export type CosmosCollectionBase = {
  /**
   * Give the name of the collection (Forest Admin collection name)
   */
  name: string;

  /**
   * Allow to override the type converter
   */
  overrideTypeConverter?: OverrideTypeConverter;

  /**
   * Enabling `enableCount` allows the pagination widget to display the total number of pages
   * in this collection while browsing records.
   *
   * _It is enabled by default but can be disabled for performance reasons._
   */
  enableCount?: boolean;
};

export type CosmosCollectionFromContainerOptions = {
  /**
   * The Cosmos DB database name
   */
  databaseName: string;

  /**
   * The Cosmos DB container name
   */
  containerName: string;

  /**
   * The partition key path for this container (e.g., "/userId")
   */
  partitionKeyPath?: string;

  /**
   * Number of sample documents to analyze for schema inference (default: 100)
   */
  sampleSize?: number;

  /**
   * Field to order documents by during introspection
   * Example: '_ts' to order by timestamp (latest first)
   * Default: undefined (no ordering)
   */
  orderByField?: string;

  /**
   * Order direction for introspection sampling
   * 'DESC' for descending (latest first), 'ASC' for ascending (oldest first)
   * Default: 'DESC'
   */
  orderDirection?: 'ASC' | 'DESC';
} & CosmosCollectionBase;

export type ConfigurationOptions = (
  configurator: CosmosDatasourceOptionsBuilder,
) => CosmosDatasourceOptionsBuilder;

export interface CosmosDatasourceOptionsBuilder {
  /**
   * Add a collection from a Cosmos DB container
   */
  addCollectionFromContainer(options: CosmosCollectionFromContainerOptions): this;
}

/**
 * Builder pattern to ease adding collections from Cosmos DB
 */
export class CosmosDatasourceBuilder implements CosmosDatasourceOptionsBuilder {
  private readonly cosmosClient: CosmosClient;

  protected collectionsPromises: Array<Promise<ModelCosmos>> = [];

  constructor(cosmosClient: CosmosClient) {
    this.cosmosClient = cosmosClient;
  }

  public addCollectionFromContainer({
    name,
    databaseName,
    containerName,
    partitionKeyPath,
    overrideTypeConverter,
    enableCount,
    sampleSize = 100,
    orderByField,
    orderDirection = 'DESC',
  }: CosmosCollectionFromContainerOptions): this {
    this.collectionsPromises.push(
      (async () => {
        const model = await introspectContainer(
          this.cosmosClient,
          name,
          databaseName,
          containerName,
          partitionKeyPath,
          sampleSize,
          overrideTypeConverter,
          enableCount,
          {
            orderByField,
            orderDirection,
          },
        );

        return model;
      })(),
    );

    return this;
  }

  /**
   * Internal usages only - the client only sees CosmosDatasourceOptionsBuilder interface
   */
  public async createCollectionsFromConfiguration(): Promise<ModelCosmos[]> {
    return Promise.all(this.collectionsPromises);
  }
}
