/* eslint-disable max-len */
import { Caller, RecordData } from '@forestadmin/datasource-toolkit';

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

const indexName = 'test-index-crud';

beforeAll(async () => {
  await createElasticsearchIndex(indexName, dataset);
});

afterAll(async () => {
  await deleteElasticsearchIndex(indexName);
});

describe('Collection > CRUD > create', () => {
  describe('nominal', () => {
    it.each([
      [
        'create new records and return them',

        [
          {
            text: 'I did what I had to do to survive, my lady. But I am a Stark. I will always be a Stark.',
            user: 'Sansa',
          },
          {
            text: "During the War of the Ninepenny Kings, a cheap name for a cheap cause, where other men fought for the king, my father fought to befriend Hoster Tully, Lord Paramount of the Trident and head of one of the oldest and greatest houses in Westeros. Thanks to my father's heroic efforts, Lord Hoster agreed to foster me at Riverrun with his own children.",
            user: 'Baelish',
          },
        ],

        expect.arrayContaining([
          expect.objectContaining({ user: 'Sansa' }),
          expect.objectContaining({ user: 'Baelish' }),
        ]),
      ],
    ])('should %s', async (_, data: RecordData[], expectedResult: RecordData[]) => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.create(null as unknown as Caller, data);
      expect(result).toMatchObject(expectedResult);
    });
  });
});
