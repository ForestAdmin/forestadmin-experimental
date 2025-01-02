import ELASTICSEARCH_URL from './connection-details';
import { createElasticsearchDataSource } from '../../src';

// eslint-disable-next-line import/prefer-default-export
export async function getCollectionForIndex(indexName: string) {
  return (
    await createElasticsearchDataSource(ELASTICSEARCH_URL, {
      builder: configurator =>
        configurator.addCollectionFromIndex({ name: 'test-collection', indexName }),
    })(jest.fn())
  ).getCollection('test-collection');
}
