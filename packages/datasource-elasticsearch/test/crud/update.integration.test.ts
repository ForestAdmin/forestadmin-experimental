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

const indexName = 'test-crud-update';

beforeAll(async () => {
  await createElasticsearchIndex(indexName, dataset);
});

afterAll(async () => {
  await deleteElasticsearchIndex(indexName);
});

describe('Collection > CRUD > update', () => {
  describe('nominal', () => {
    it('should update existing record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const conditionTree = new ConditionTreeLeaf('user', 'Equal', 'jon');

      await collection.update(
        null as unknown as Caller,
        {
          conditionTree,
        } as unknown as Filter,
        {
          text: 'Ygritte <3',
        },
      );

      const result = await collection.list(
        null as unknown as Caller,
        { conditionTree } as unknown as Filter,
        new Projection('_id', 'user', 'text'),
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ user: 'jon', text: 'Ygritte <3' }));
    });

    it('should update existing records (bulk)', async () => {
      const collection = await getCollectionForIndex(indexName);

      await collection.update(null as unknown as Caller, {} as unknown as Filter, {
        text: 'Update everything',
      });

      const results = await collection.list(
        null as unknown as Caller,
        {} as unknown as Filter,
        new Projection('_id', 'user', 'text'),
      );

      results.forEach(result =>
        expect(result).toMatchObject(expect.objectContaining({ text: 'Update everything' })),
      );
    });
  });
});
