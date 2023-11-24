/* eslint-disable max-len */
import { Caller, ConditionTreeLeaf, Filter, Projection } from '@forestadmin/datasource-toolkit';

import { getCollectionForIndex } from '../helpers/elastic-search-collection';
import {
  createElasticsearchIndex,
  deleteElasticsearchIndex,
} from '../helpers/elastic-search-index-manager';

const dataset = [
  {
    text: "If I fall, don't bring me back",
    user: 'jon',
  },
  {
    text: 'Winter is coming',
    user: 'ned',
  },
  {
    text: 'A Lannister always pays his debts',
    user: 'tyrion',
  },
  {
    text: 'I am the blood of the dragon',
    user: 'daenerys',
  },
  {
    text: "A girl is Arya Stark of Winterfell. And I'm going home",
    user: 'arya',
  },
  {
    text: null,
    user: 'ilyn',
  },
];

const indexName = 'test-crud-delete';

beforeAll(async () => {
  await createElasticsearchIndex(indexName, dataset);
});

afterAll(async () => {
  await deleteElasticsearchIndex(indexName);
});

describe('Collection > CRUD > delete', () => {
  describe('nominal', () => {
    it('should delete matching record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const conditionTree = new ConditionTreeLeaf('user', 'Equal', 'jon');

      await collection.delete(
        null as unknown as Caller,
        {
          conditionTree,
        } as unknown as Filter,
      );

      const results = await collection.list(
        null as unknown as Caller,
        { conditionTree } as unknown as Filter,
        new Projection('_id', 'user', 'text'),
      );

      expect(results).toHaveLength(0);
    });

    it('should delete matching records (bulk)', async () => {
      const collection = await getCollectionForIndex(indexName);

      await collection.delete(null as unknown as Caller, {} as unknown as Filter);

      const results = await collection.list(
        null as unknown as Caller,
        {} as unknown as Filter,
        new Projection('_id', 'user', 'text'),
      );

      expect(results).toHaveLength(0);
    });
  });
});
