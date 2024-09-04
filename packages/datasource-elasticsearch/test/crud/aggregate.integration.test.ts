import { Aggregation, Caller, Filter } from '@forestadmin/datasource-toolkit';

import { getCollectionForIndex } from '../helpers/elastic-search-collection';
import {
  createElasticsearchIndex,
  deleteElasticsearchIndex,
} from '../helpers/elastic-search-index-manager';

const mappings = {
  properties: {
    discriminant: { type: 'keyword' },
    weight: { type: 'integer' },
    date: { type: 'date' },
  },
};
const dataset = [
  {
    discriminant: 'blue',
    weight: 1,
    date: '2023-11-23',
  },
  {
    discriminant: 'blue',
    weight: 21,
    date: '2023-11-21',
  },
  {
    discriminant: 'blue',
    weight: 3,
    date: '2023-10-21',
  },
  {
    discriminant: 'red',
    weight: 4,
    date: '2023-06-21',
  },
  {
    discriminant: 'red',
    weight: 5,
    date: '2023-01-21',
  },
  {
    discriminant: 'red',
    weight: 6,
    date: '2022-01-01',
  },
];

const indexName = 'test-crud-update';

beforeAll(async () => {
  await createElasticsearchIndex(indexName, dataset, mappings as never);
});

afterAll(async () => {
  await deleteElasticsearchIndex(indexName);
});

describe('Collection > CRUD > aggregate', () => {
  describe('Count', () => {
    it('should count record record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        { operation: 'Count' } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 6 }));
    });

    it('should count record record with filter', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {
          conditionTree: {
            field: 'discriminant',
            operator: 'Equal',
            value: 'red',
          },
        } as unknown as Filter,
        { operation: 'Count' } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 3 }));
    });
  });

  describe('Sum', () => {
    it('should sum field record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        { operation: 'Sum', field: 'weight' } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 40 }));
    });

    it('should sum field record with filter', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {
          conditionTree: {
            field: 'discriminant',
            operator: 'Equal',
            value: 'red',
          },
        } as unknown as Filter,
        {
          operation: 'Sum',
          field: 'weight',
        } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 15 }));
    });
  });

  describe('Avg', () => {
    it('should sum field record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        { operation: 'Avg', field: 'weight' } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 6.666666666666667 }));
    });

    it('should sum field record with filter', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {
          conditionTree: {
            field: 'discriminant',
            operator: 'Equal',
            value: 'red',
          },
        } as unknown as Filter,
        {
          operation: 'Avg',
          field: 'weight',
        } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 5 }));
    });
  });

  describe('Max', () => {
    it('should sum field record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        { operation: 'Max', field: 'weight' } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 21 }));
    });

    it('should sum field record with filter', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {
          conditionTree: {
            field: 'discriminant',
            operator: 'Equal',
            value: 'red',
          },
        } as unknown as Filter,
        {
          operation: 'Max',
          field: 'weight',
        } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 6 }));
    });
  });

  describe('Min', () => {
    it('should sum field record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        { operation: 'Min', field: 'weight' } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 1 }));
    });

    it('should sum field record with filter', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {
          conditionTree: {
            field: 'discriminant',
            operator: 'Equal',
            value: 'red',
          },
        } as unknown as Filter,
        {
          operation: 'Min',
          field: 'weight',
        } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 4 }));
    });
  });

  describe('Date Operations', () => {
    it.each([
      [
        'Year',
        [
          { group: { date: '2022-01-01' }, value: 1 },
          { group: { date: '2023-01-01' }, value: 5 },
        ],
      ],
      [
        'Month',
        [
          { group: { date: '2022-01-01' }, value: 1 },
          { group: { date: '2022-02-01' }, value: 0 },
          { group: { date: '2022-03-01' }, value: 0 },
          { group: { date: '2022-04-01' }, value: 0 },
          { group: { date: '2022-05-01' }, value: 0 },
          { group: { date: '2022-06-01' }, value: 0 },
          { group: { date: '2022-07-01' }, value: 0 },
          { group: { date: '2022-08-01' }, value: 0 },
          { group: { date: '2022-09-01' }, value: 0 },
          { group: { date: '2022-10-01' }, value: 0 },
          { group: { date: '2022-11-01' }, value: 0 },
          { group: { date: '2022-12-01' }, value: 0 },
          { group: { date: '2023-01-01' }, value: 1 },
          { group: { date: '2023-02-01' }, value: 0 },
          { group: { date: '2023-03-01' }, value: 0 },
          { group: { date: '2023-04-01' }, value: 0 },
          { group: { date: '2023-05-01' }, value: 0 },
          { group: { date: '2023-06-01' }, value: 1 },
          { group: { date: '2023-07-01' }, value: 0 },
          { group: { date: '2023-08-01' }, value: 0 },
          { group: { date: '2023-09-01' }, value: 0 },
          { group: { date: '2023-10-01' }, value: 1 },
          { group: { date: '2023-11-01' }, value: 2 },
        ],
      ],
      [
        'Week',
        [
          { group: { date: '2021-12-27' }, value: 1 },
          { group: { date: '2022-01-03' }, value: 0 },
          { group: { date: '2022-01-10' }, value: 0 },
          { group: { date: '2022-01-17' }, value: 0 },
          // ...
          { value: 1, group: { date: '2023-01-16' } },
          { value: 0, group: { date: '2023-01-23' } },
          // ...
          { value: 0, group: { date: '2023-05-29' } },
          { value: 0, group: { date: '2023-06-05' } },
          { value: 0, group: { date: '2023-06-12' } },
          { value: 1, group: { date: '2023-06-19' } },
          { value: 0, group: { date: '2023-06-26' } },
          { value: 0, group: { date: '2023-07-03' } },
          // ...
          { value: 0, group: { date: '2023-10-02' } },
          { value: 0, group: { date: '2023-10-09' } },
          { value: 1, group: { date: '2023-10-16' } },
          { value: 0, group: { date: '2023-10-23' } },
          { value: 0, group: { date: '2023-10-30' } },
          { value: 0, group: { date: '2023-11-06' } },
          { value: 0, group: { date: '2023-11-13' } },
          { value: 2, group: { date: '2023-11-20' } },
        ],
      ],
      [
        'Day',
        [
          { group: { date: '2022-01-01' }, value: 1 },
          { group: { date: '2023-06-03' }, value: 0 },
          { group: { date: '2023-06-21' }, value: 1 },
          { group: { date: '2023-10-21' }, value: 1 },
          { group: { date: '2023-11-21' }, value: 1 },
          { group: { date: '2023-11-23' }, value: 1 },
        ],
      ],
    ])('should create bucket aggregation that count by "%s"', async (dateOperation, expected) => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        {
          operation: 'Count',
          groups: [{ field: 'date', operation: dateOperation }],
        } as unknown as Aggregation,
      );

      expect(result).toMatchObject(expect.arrayContaining(expected));
    });
  });

  describe('group by', () => {
    describe('simple count group by field', () => {
      it('should return aggregate groups with count', async () => {
        const collection = await getCollectionForIndex(indexName);

        const result = await collection.aggregate(
          null as unknown as Caller,
          {} as unknown as Filter,
          { operation: 'Count', groups: [{ field: 'discriminant' }] } as unknown as Aggregation,
        );

        expect(result).toMatchObject([
          { group: { discriminant: 'blue' }, value: 3 },
          { group: { discriminant: 'red' }, value: 3 },
        ]);
      });
    });
    describe('simple sum group by field', () => {
      it('should sum field record', async () => {
        const collection = await getCollectionForIndex(indexName);

        const result = await collection.aggregate(
          null as unknown as Caller,
          {} as unknown as Filter,
          {
            operation: 'Sum',
            field: 'weight',
            groups: [{ field: 'discriminant' }],
          } as unknown as Aggregation,
        );

        expect(result).toMatchObject([
          { group: { discriminant: 'blue' }, value: 25 },
          { group: { discriminant: 'red' }, value: 15 },
        ]);
      });

      it('should sum field record with filter', async () => {
        const collection = await getCollectionForIndex(indexName);

        const result = await collection.aggregate(
          null as unknown as Caller,
          {
            conditionTree: {
              field: 'discriminant',
              operator: 'Equal',
              value: 'red',
            },
          } as unknown as Filter,
          {
            operation: 'Sum',
            field: 'weight',
            groups: [{ field: 'discriminant' }],
          } as unknown as Aggregation,
        );

        expect(result).toMatchObject([{ group: { discriminant: 'red' }, value: 15 }]);
      });
    });
  });
});
