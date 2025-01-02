import { Client } from '@elastic/elasticsearch';
import { BaseDataSource, Logger } from '@forestadmin/datasource-toolkit';

import ElasticsearchCollection from './collection';
import ModelElasticsearch from './model-builder/model';

interface NativeQueryConnection {
  instance: Client;
}

export default class ElasticsearchDataSource extends BaseDataSource<ElasticsearchCollection> {
  /**
   * We can't directly use the Elasticsearch version we install in the package.json
   * as the customer's version may be different.
   * To ensure compatibility, we need to only import types from Elasticsearch,
   *    and use the customer elasticsearch version to deal with the data manipulation.
   */
  protected elasticsearchClient: Client;

  constructor(
    elasticsearchClient: Client,
    collectionModels: ModelElasticsearch[],
    logger: Logger,
    options?: { liveQueryConnections?: string },
  ) {
    super();

    if (!elasticsearchClient) throw new Error('Invalid (null) Elasticsearch instance.');
    this.elasticsearchClient = elasticsearchClient;

    // Creating collections
    this.createCollections(collectionModels, logger);

    if (options?.liveQueryConnections) {
      this.addNativeQueryConnection(options.liveQueryConnections, {
        instance: this.elasticsearchClient,
      });
    }

    logger?.('Info', 'ElasticsearchDataSource - Built');
  }

  protected async createCollections(collectionModels: ModelElasticsearch[], logger: Logger) {
    collectionModels
      // avoid schema reordering
      .sort((modelA, modelB) => (modelA.name > modelB.name ? 1 : -1))
      .forEach(model => {
        const collection = new ElasticsearchCollection(
          this,
          model,
          logger,
          this.elasticsearchClient,
        );
        this.addCollection(collection);
      });
  }

  override async executeNativeQuery(connectionName: string, query: string, contextVariables = {}) {
    if (!this.nativeQueryConnections[connectionName]) {
      throw new Error(`Unknown connection name '${connectionName}'`);
    }

    const { params, esQuery } = this.replaceSqlArguments(query, contextVariables);

    const response = await (
      this.nativeQueryConnections[connectionName] as NativeQueryConnection
    ).instance.sql.query({
      query: esQuery,
      params,
    });

    return response.rows.map(row => {
      const rows: Record<string, unknown> = {};
      response.columns.forEach((column, index) => {
        rows[column.name] = row[index];
      });

      return rows;
    });
  }

  private replaceSqlArguments(sqlQuery: string, values: Record<string, unknown>) {
    const params: unknown[] = [];

    const placeholderRegex = /\$(\w+)/g;

    const esQuery = sqlQuery.replace(placeholderRegex, (match, key) => {
      if (key in values) {
        params.push(values[key]);

        return '?';
      }
    });

    return { esQuery, params };
  }
}
