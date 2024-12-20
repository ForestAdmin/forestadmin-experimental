import { Client } from '@elastic/elasticsearch';

import ELASTICSEARCH_URL from './helpers/connection-details';
import { ElasticsearchCollection, ElasticsearchDataSource } from '../src';
import ModelElasticsearch from '../src/model-builder/model';

describe('ElasticsearchDataSource', () => {
  it('should fail to instantiate without a Elasticsearch instance', () => {
    expect(
      () => new ElasticsearchDataSource(undefined as unknown as Client, [], jest.fn()),
    ).toThrow('Invalid (null) Elasticsearch instance.');
  });

  it('should have no predefined collection', () => {
    expect(
      new ElasticsearchDataSource({ models: {} } as unknown as Client, [], jest.fn()).collections,
    ).toStrictEqual([]);
  });

  it('should create collection based on models', () => {
    const elasticsearchClient = new Client({ node: ELASTICSEARCH_URL });

    const datasource = new ElasticsearchDataSource(
      elasticsearchClient,
      [
        new ModelElasticsearch(elasticsearchClient, 'cars', ['indexPatterns'], ['aliases'], {
          properties: {},
        }),
      ],
      jest.fn(),
    );

    expect(datasource.getCollection('cars')).toBeInstanceOf(ElasticsearchCollection);
  });

  describe('executeNativeQuery', () => {
    it('should execute the given query on the correct connection', async () => {
      const elasticsearchClient = new Client({ node: ELASTICSEARCH_URL });

      const dataSource = new ElasticsearchDataSource(
        elasticsearchClient,
        [
          new ModelElasticsearch(elasticsearchClient, 'cars', ['indexPatterns'], ['aliases'], {
            properties: {},
          }),
        ],
        jest.fn(),
        {
          liveQueryConnections: 'main',
        },
      );
      const spyQuery = jest.spyOn(elasticsearchClient.sql, 'query').mockResolvedValue({
        columns: [{ name: 'id', type: 'number' }],
        rows: [[1]],
      });

      const result = await dataSource.executeNativeQuery(
        'main',
        'SELECT id FROM "index-alias" WHERE type = $something',
        { something: 'value' },
      );

      expect(spyQuery).toHaveBeenCalled();
      expect(spyQuery).toHaveBeenCalledWith({
        query: 'SELECT id FROM "index-alias" WHERE type = ?',
        params: ['value'],
      });
      expect(result).toEqual([
        {
          id: 1,
        },
      ]);
    });

    describe('when giving an unknown connection name', () => {
      it('should throw an error', async () => {
        const elasticsearchClient = new Client({ node: ELASTICSEARCH_URL });

        const dataSource = new ElasticsearchDataSource(
          elasticsearchClient,
          [
            new ModelElasticsearch(elasticsearchClient, 'cars', ['indexPatterns'], ['aliases'], {
              properties: {},
            }),
          ],
          jest.fn(),
          {
            liveQueryConnections: 'main',
          },
        );
        const spyQuery = jest.spyOn(elasticsearchClient.sql, 'query').mockImplementation();

        await expect(
          dataSource.executeNativeQuery('production', 'query', { something: 'value' }),
        ).rejects.toThrow(new Error(`Unknown connection name 'production'`));
        expect(spyQuery).not.toHaveBeenCalled();
      });
    });
  });
});
