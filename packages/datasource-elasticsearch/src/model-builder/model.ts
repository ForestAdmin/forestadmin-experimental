/* eslint-disable no-underscore-dangle */
import { Client, estypes } from '@elastic/elasticsearch';
import { RecordData } from '@forestadmin/datasource-toolkit';

import { OverrideTypeConverter } from '../introspection/builder';
import Serializer from '../utils/serializer';

export default class ModelElasticsearch {
  public name: string;

  /**
   * An index template is a way to tell Elasticsearch how to configure an index when it is
   * created. For data streams, the index template configures the stream’s backing indices
   * as they are created. Templates are configured prior to index creation. When an index
   * is created - either manually or through indexing a document - the template settings
   * are used as a basis for creating the index.
   */
  private indexPatterns: string[];

  /**
   * An alias is a secondary name for a group of data streams or indices.
   * Most Elasticsearch APIs accept an alias in place of a data stream or index name.
   */
  private aliases: string[];

  /**
   * Mapping is the process of defining how a document, and the fields it contains, are
   * stored and indexed.
   *
   * https://www.elastic.co/guide/en/elasticsearch/reference/master/mapping-types.html
   */
  private mapping: estypes.MappingTypeMapping;

  private elasticsearchClient: Client;

  public generateIndexName: (record?: unknown) => string;

  public overrideTypeConverter?: OverrideTypeConverter;

  public enableCount?: boolean;

  constructor(
    elasticsearchClient: Client,
    name: string,
    indexPatterns: string[],
    aliases: string[],
    mapping: estypes.MappingTypeMapping,
    generateIndexName?: (record?: unknown) => string,
    overrideTypeConverter?: OverrideTypeConverter,
    enableCount?: boolean,
  ) {
    this.name = name;
    this.indexPatterns = indexPatterns;
    this.aliases = aliases;
    this.mapping = mapping;
    this.generateIndexName = generateIndexName;
    this.overrideTypeConverter = overrideTypeConverter;
    this.enableCount = enableCount;

    this.elasticsearchClient = elasticsearchClient;
  }

  public async create(data: RecordData[]): Promise<RecordData[]> {
    if (!this.generateIndexName)
      throw new Error('You need to define generateIndexName in order to create a record');

    // How to handle this the proper way ?
    if (this.mapping.properties.createdAt) {
      data.forEach(newRecord => {
        newRecord.createdAt = new Date();
      });
    }

    const operations = data.flatMap(newRecord => [
      {
        // Strategies
        // - create fails if a document with the same ID already exists in the target
        // - index adds or replaces a document as necessary
        // we choose index behavior for now but we don't provide IDs
        index: { _index: this.generateIndexName(newRecord) },
      },
      newRecord,
    ]);

    const bulkResponse = await this.elasticsearchClient.bulk({
      operations,
      refresh: true,
    });

    return bulkResponse.items.map((item, index) =>
      Serializer.serialize({
        _id: item.index._id,
        ...data[index],
      }),
    );
  }

  public async update(ids: string[], patch: RecordData): Promise<void> {
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html#bulk-update
    const recordsToUpdate = await this.search({
      query: {
        ids: {
          values: ids,
        },
      },
      _source: false,
    });

    const operations = recordsToUpdate.reduce<Array<unknown>>((acc, { _id: id, _index: index }) => {
      acc.push({
        update: {
          _index: index,
          _id: id,
        },
      });
      acc.push({
        doc: patch,
      });

      return acc;
    }, []);

    await this.elasticsearchClient.bulk({
      operations,
      refresh: true,
    });
  }

  public async delete(ids: string[]): Promise<void> {
    // https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-bulk.html#docs-bulk
    const recordsToUpdate = await this.search({
      query: {
        ids: {
          values: ids,
        },
      },
      _source: false,
    });

    const operations = recordsToUpdate.map(({ _id: id, _index: index }) => ({
      delete: {
        _index: index,
        _id: id,
      },
    }));

    await this.elasticsearchClient.bulk({
      operations,
      refresh: true,
    });
  }

  public async search(
    searchBody: Record<string, unknown>,
    offset?: number,
    limit?: number,
  ): Promise<RecordData[]> {
    const response = await this.elasticsearchClient.search<{
      hits: {
        hits: RecordData[];
      };
    }>({
      index: this.indexPatterns[0],
      body: searchBody,
      from: offset,
      size: limit,
    });

    return response.hits.hits.map(hit => {
      return Serializer.serialize({
        _id: hit._id,
        _index: hit._index,
        ...hit._source,
      });
    });
  }

  public async aggregateSearch(
    searchBody: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const response = await this.elasticsearchClient.search<{
      aggregations: Record<string, unknown>;
    }>({
      size: 0,
      index: this.indexPatterns[0],
      body: searchBody,
    });

    return response.aggregations;
  }

  // INTERNAL USAGES

  /**
   * Return all fields
   */
  public getAttributes() {
    return this.mapping.properties;
  }
}
