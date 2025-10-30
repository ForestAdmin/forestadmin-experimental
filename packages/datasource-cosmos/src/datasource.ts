import { CosmosClient, SqlQuerySpec } from '@azure/cosmos';
import { BaseDataSource, Logger } from '@forestadmin/datasource-toolkit';

import CosmosCollection from './collection';
import ModelCosmos from './model-builder/model';

interface NativeQueryConnection {
  instance: CosmosClient;
  databaseName: string;
}

export default class CosmosDataSource extends BaseDataSource<CosmosCollection> {
  /**
   * Cosmos DB client instance
   */
  protected cosmosClient: CosmosClient;

  constructor(
    cosmosClient: CosmosClient,
    collectionModels: ModelCosmos[],
    logger: Logger,
    options?: { liveQueryConnections?: string; liveQueryDatabase?: string },
  ) {
    super();

    if (!cosmosClient) throw new Error('Invalid (null) CosmosClient instance.');
    this.cosmosClient = cosmosClient;

    // Creating collections
    this.createCollections(collectionModels, logger);

    if (options?.liveQueryConnections && options?.liveQueryDatabase) {
      this.addNativeQueryConnection(options.liveQueryConnections, {
        instance: this.cosmosClient,
        databaseName: options.liveQueryDatabase,
      });
    }

    logger?.('Info', 'CosmosDataSource - Built');
  }

  protected async createCollections(collectionModels: ModelCosmos[], logger: Logger) {
    collectionModels
      // avoid schema reordering
      .sort((modelA, modelB) => (modelA.name > modelB.name ? 1 : -1))
      .forEach(model => {
        const collection = new CosmosCollection(this, model, logger, this.cosmosClient);
        this.addCollection(collection);
      });
  }

  override async executeNativeQuery(
    connectionName: string,
    query: string,
    contextVariables: Record<string, unknown> = {},
  ): Promise<Record<string, unknown>[]> {
    if (!this.nativeQueryConnections[connectionName]) {
      throw new Error(`Unknown connection name '${connectionName}'`);
    }

    const connection = this.nativeQueryConnections[connectionName] as NativeQueryConnection;
    const { querySpec, containerName } = this.parseQuery(query, contextVariables);

    // Execute the query on the specified container
    const database = connection.instance.database(connection.databaseName);
    const container = database.container(containerName);

    const { resources } = await container.items.query(querySpec).fetchAll();

    return resources;
  }

  /**
   * Parse the query string and extract container name and build SqlQuerySpec
   * Expected format: "SELECT * FROM containerName WHERE ..."
   */
  private parseQuery(
    query: string,
    contextVariables: Record<string, unknown>,
  ): { querySpec: SqlQuerySpec; containerName: string } {
    // Extract container name from query (simple regex-based approach)
    const fromMatch = query.match(/FROM\s+(\w+)/i);

    if (!fromMatch) {
      throw new Error('Invalid query: could not extract container name from FROM clause');
    }

    const containerName = fromMatch[1];

    // Replace placeholders in query with parameterized values
    const { parameterizedQuery, parameters } = this.replacePlaceholders(query, contextVariables);

    const querySpec: SqlQuerySpec = {
      query: parameterizedQuery,
      parameters,
    };

    return { querySpec, containerName };
  }

  /**
   * Replace placeholders ($variableName) with Cosmos DB parameters (@paramN)
   */
  private replacePlaceholders(
    query: string,
    values: Record<string, unknown>,
  ): { parameterizedQuery: string; parameters: SqlQuerySpec['parameters'] } {
    const parameters: SqlQuerySpec['parameters'] = [];
    let paramCounter = 0;

    const placeholderRegex = /\$(\w+)/g;

    const parameterizedQuery = query.replace(placeholderRegex, (match, key) => {
      if (key in values) {
        const paramName = `@param${paramCounter}`;
        paramCounter += 1;
        // Context variables should contain JSON-serializable values for Cosmos DB parameters
        parameters.push({ name: paramName, value: values[key] as string | number | boolean });

        return paramName;
      }

      // If the variable is not in contextVariables, keep the original placeholder
      return match;
    });

    return { parameterizedQuery, parameters };
  }
}
