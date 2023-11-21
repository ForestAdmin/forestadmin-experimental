import {
  Caller,
  ConditionTreeLeaf,
  Page,
  PaginatedFilter,
  Projection,
  RecordData,
  Sort,
} from '@forestadmin/datasource-toolkit';

import ElasticsearchCollection from '../../src/collection';
import { createElasticsearchDataSource } from '../../src/index';
import ELASTICSEARCH_URL from '../helpers/connection-details';
import {
  createElasticsearchIndex,
  deleteElasticsearchIndex,
} from '../helpers/elastic-search-index-manager';

const dataset = [
  {
    id: 1,
    text: "If I fall, don't bring me back",
    user: 'jon',
  },
  {
    id: 2,
    text: 'Winter is coming',
    user: 'ned',
  },
  {
    id: 3,
    text: 'A Lannister always pays his debts',
    user: 'tyrion',
  },
  {
    id: 4,
    text: 'I am the blood of the dragon',
    user: 'daenerys',
  },
  {
    id: 5,
    text: "A girl is Arya Stark of Winterfell. And I'm going home",
    user: 'arya',
  },
  {
    id: 6,
    text: null,
    user: 'ilyn',
  },
];
const indexName = 'test-index-operators';
let nedUuid;

beforeAll(async () => {
  const bulkItems = await createElasticsearchIndex(indexName, dataset);
  // eslint-disable-next-line no-underscore-dangle
  nedUuid = bulkItems[1].index._id;
});
afterAll(async () => {
  await deleteElasticsearchIndex(indexName);
});

describe('Utils > QueryConverter', () => {
  describe('ConditionTree', () => {
    describe('Operators', () => {
      it.each([
        [
          { field: 'text', operator: 'Present' } as ConditionTreeLeaf,
          expect.not.arrayContaining([expect.objectContaining({ user: 'ilyn' })]),
          5,
        ],
        [{ field: 'text', operator: 'Missing' } as ConditionTreeLeaf, [{ user: 'ilyn' }], 1],
        [
          {
            field: 'user',
            operator: 'Equal',
            value: 'jon',
          } as ConditionTreeLeaf,
          [{ user: 'jon' }],
          1,
        ],
        [
          {
            field: 'text',
            operator: 'Equal',
            value: null,
          } as ConditionTreeLeaf,
          [{ user: 'ilyn' }],
          1,
        ],
        [
          {
            field: 'text',
            operator: 'Equal',
            value: ['', null],
          } as ConditionTreeLeaf,
          [{ user: 'ilyn' }],
          1,
        ],
        [
          {
            field: 'user',
            operator: 'NotIn',
            value: ['tyrion', 'jon'],
          } as ConditionTreeLeaf,
          expect.not.arrayContaining([
            expect.objectContaining({ user: 'tyrion' }),
            expect.objectContaining({ user: 'jon' }),
          ]),
          4,
        ],
        [
          {
            field: 'user',
            operator: 'Like',
            value: 'yrio',
          } as ConditionTreeLeaf,
          expect.not.arrayContaining([expect.objectContaining({ user: 'tyrion' })]),
          0,
        ],
        [
          {
            field: 'text',
            operator: 'Like',
            value: '%debts',
          } as ConditionTreeLeaf,
          [{ text: 'A Lannister always pays his debts' }],
          1,
        ],
        [
          {
            field: 'user',
            operator: 'Like',
            value: 'n%',
          } as ConditionTreeLeaf,
          [{ user: 'ned' }],
          1,
        ],
        [
          {
            field: 'user',
            operator: 'Like',
            value: 'NED',
          } as ConditionTreeLeaf,
          [],
          0,
        ],
        [
          {
            field: 'user',
            operator: 'ILike',
            value: 'NED',
          } as ConditionTreeLeaf,
          [{ user: 'ned' }],
          1,
        ],
        [
          {
            field: 'id',
            operator: 'LessThan',
            value: 2,
          } as ConditionTreeLeaf,
          [{ user: 'jon' }],
          1,
        ],
        [
          {
            field: 'id',
            operator: 'GreaterThan',
            value: 4,
          } as ConditionTreeLeaf,
          expect.arrayContaining([
            expect.objectContaining({ user: 'ilyn' }),
            expect.objectContaining({ user: 'arya' }),
          ]),
          2,
        ],
        [
          {
            field: 'user',
            operator: 'NotContains',
            value: 'ned',
          } as ConditionTreeLeaf,
          expect.not.arrayContaining([expect.objectContaining({ user: 'ned' })]),
          5,
        ],
        [
          {
            field: '_id',
            operator: 'NotEqual',
            value: '{{nedUuid}}',
          } as ConditionTreeLeaf,
          expect.not.arrayContaining([expect.objectContaining({ user: 'ned' })]),
          5,
        ],
        [
          {
            field: '_id',
            operator: 'Equal',
            value: '{{nedUuid}}',
          } as ConditionTreeLeaf,
          expect.arrayContaining([expect.objectContaining({ user: 'ned' })]),
          1,
        ],
      ])(
        'for operator %s it should return %s',
        async (conditionTree: ConditionTreeLeaf, expectedResult: RecordData[], lenght: number) => {
          const collection = (await (
            await createElasticsearchDataSource(ELASTICSEARCH_URL, configurator =>
              configurator.addCollectionFromIndex({ name: 'index', indexName }),
            )(jest.fn())
          ).getCollection('index')) as ElasticsearchCollection;

          conditionTree.value =
            typeof conditionTree.value === 'string'
              ? conditionTree.value.replace('{{nedUuid}}', nedUuid)
              : conditionTree.value;

          const paginatedFilter: PaginatedFilter = {
            conditionTree,
            search: '',
            searchExtended: false,
            segment: '',
            sort: [
              {
                field: 'id',
                ascending: false,
              },
            ] as unknown as Sort,
            page: {
              skip: 0,
              limit: 10,
            } as unknown as Page,
            override: jest.fn(),
            nest: jest.fn(),
            isNestable: true,
          };
          const result = await collection.list(
            null as unknown as Caller,
            paginatedFilter,
            new Projection('_id', 'user', 'text', 'id'),
          );
          expect(result).toMatchObject(expectedResult);
          expect(result.length).toBe(lenght);
        },
      );
    });
  });
});
