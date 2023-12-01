import { Aggregation, Caller, Filter } from '@forestadmin/datasource-toolkit';

import { getCollectionForIndex } from '../helpers/elastic-search-collection';
import {
  createElasticsearchIndex,
  deleteElasticsearchIndex,
} from '../helpers/elastic-search-index-manager';

const dataset = [
  {
    discriminant: 'blue',
    weight: 1,
  },
  {
    discriminant: 'blue',
    weight: 21,
  },
  {
    discriminant: 'blue',
    weight: 3,
  },
  {
    discriminant: 'red',
    weight: 4,
  },
  {
    discriminant: 'red',
    weight: 5,
  },
  {
    discriminant: 'red',
    weight: 6,
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

    it.skip('should count aggregate', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        { operation: 'Count', field: 'discriminant' } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ user: 'jon', text: 'Ygritte <3' }));
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

  describe.skip('Sum group by', () => {
    it('should sum field record', async () => {
      const collection = await getCollectionForIndex(indexName);

      const result = await collection.aggregate(
        null as unknown as Caller,
        {} as unknown as Filter,
        {
          operation: 'Sum',
          field: 'weight',
          // groups: [{ field: 'discriminant', operation: 'Sum' }],
        } as unknown as Aggregation,
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
          // groups: [{ field: 'discriminant', operation: 'Sum' }],
        } as unknown as Aggregation,
      );

      expect(result[0]).toMatchObject(expect.objectContaining({ value: 3 }));
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
});
