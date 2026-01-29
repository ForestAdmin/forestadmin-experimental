/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for StripeCollection
 */

import { Projection } from '@forestadmin/datasource-toolkit';

import StripeCollection from '../src/collection';
import StripeDataSource from '../src/datasource';

// Mock Stripe
const mockStripeCustomers = {
  retrieve: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  del: jest.fn(),
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      retrieve: jest.fn().mockResolvedValue({ id: 'acct_test123' }),
    },
    customers: mockStripeCustomers,
    products: {},
    prices: {},
    subscriptions: {},
    invoices: {},
    paymentIntents: {},
    charges: {},
    refunds: {},
    balanceTransactions: {},
  }));
});

describe('StripeCollection', () => {
  let datasource: StripeDataSource;
  let collection: StripeCollection;
  const mockCaller = { id: 1, email: 'test@example.com' } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Customers') as StripeCollection;
  });

  describe('list', () => {
    it('should fetch single record by ID', async () => {
      const mockRecord = { id: 'cus_123', email: 'john@example.com', created: 1704067200 };
      mockStripeCustomers.retrieve.mockResolvedValue(mockRecord);

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'cus_123' },
      } as any;

      const result = await collection.list(mockCaller, filter, new Projection('id', 'email'));

      expect(mockStripeCustomers.retrieve).toHaveBeenCalledWith('cus_123');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cus_123');
    });

    it('should return empty array when single record not found', async () => {
      const error = new Error('Not found');
      (error as any).code = 'resource_missing';
      mockStripeCustomers.retrieve.mockRejectedValue(error);

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'cus_notfound' },
      } as any;

      const result = await collection.list(mockCaller, filter, new Projection('id'));

      expect(result).toEqual([]);
    });

    it('should query with list when no ID filter', async () => {
      const mockRecords = [
        { id: 'cus_1', email: 'john@example.com', created: 1704067200 },
        { id: 'cus_2', email: 'jane@example.com', created: 1704067300 },
      ];
      mockStripeCustomers.list.mockResolvedValue({ data: mockRecords });

      const result = await collection.list(mockCaller, {} as any, new Projection('id', 'email'));

      expect(mockStripeCustomers.list).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });

    it('should apply email filter', async () => {
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const filter = {
        conditionTree: { field: 'email', operator: 'Equal', value: 'test@example.com' },
      } as any;

      await collection.list(mockCaller, filter, new Projection());

      expect(mockStripeCustomers.list).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
      );
    });

    it('should apply status filter', async () => {
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const filter = {
        conditionTree: { field: 'status', operator: 'Equal', value: 'active' },
      } as any;

      await collection.list(mockCaller, filter, new Projection());

      expect(mockStripeCustomers.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });

    it('should apply pagination limit', async () => {
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const filter = {
        page: { limit: 50 },
      } as any;

      await collection.list(mockCaller, filter, new Projection());

      expect(mockStripeCustomers.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 }),
      );
    });

    it('should handle AND conditions', async () => {
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const filter = {
        conditionTree: {
          aggregator: 'And',
          conditions: [
            { field: 'email', operator: 'Equal', value: 'test@example.com' },
            { field: 'status', operator: 'Equal', value: 'active' },
          ],
        },
      } as any;

      await collection.list(mockCaller, filter, new Projection());

      expect(mockStripeCustomers.list).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          status: 'active',
        }),
      );
    });

    it('should convert timestamps to dates', async () => {
      const mockRecords = [{ id: 'cus_1', created: 1704067200 }];
      mockStripeCustomers.list.mockResolvedValue({ data: mockRecords });

      const result = await collection.list(mockCaller, {} as any, new Projection('id', 'created'));

      expect(result[0].created).toBeInstanceOf(Date);
    });
  });

  describe('aggregate', () => {
    it('should perform count aggregation', async () => {
      const mockRecords = [{ id: 'cus_1' }, { id: 'cus_2' }, { id: 'cus_3' }];
      mockStripeCustomers.list.mockResolvedValue({ data: mockRecords });

      const aggregation = { operation: 'Count', groups: [] } as any;

      const result = await collection.aggregate(mockCaller, {} as any, aggregation);

      expect(result).toEqual([{ value: 3, group: {} }]);
    });

    it('should perform sum aggregation', async () => {
      // Balance is an amount field, so 100 cents becomes "1.00", etc.
      const mockRecords = [
        { id: 'cus_1', balance: 100 },
        { id: 'cus_2', balance: 200 },
        { id: 'cus_3', balance: 300 },
      ];
      mockStripeCustomers.list.mockResolvedValue({ data: mockRecords });

      const aggregation = { operation: 'Sum', field: 'balance', groups: [] } as any;

      const result = await collection.aggregate(mockCaller, {} as any, aggregation);

      // 100/100 + 200/100 + 300/100 = 1 + 2 + 3 = 6
      expect(result).toEqual([{ value: 6, group: {} }]);
    });

    it('should perform avg aggregation', async () => {
      // Balance is an amount field, so 100 cents becomes "1.00", etc.
      const mockRecords = [
        { id: 'cus_1', balance: 100 },
        { id: 'cus_2', balance: 200 },
      ];
      mockStripeCustomers.list.mockResolvedValue({ data: mockRecords });

      const aggregation = { operation: 'Avg', field: 'balance', groups: [] } as any;

      const result = await collection.aggregate(mockCaller, {} as any, aggregation);

      // (1 + 2) / 2 = 1.5
      expect(result).toEqual([{ value: 1.5, group: {} }]);
    });

    it('should return null for missing field', async () => {
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      const aggregation = { operation: 'Sum', groups: [] } as any;

      const result = await collection.aggregate(mockCaller, {} as any, aggregation);

      expect(result).toEqual([{ value: null, group: {} }]);
    });
  });

  describe('create', () => {
    it('should create records', async () => {
      const inputData = [{ email: 'john@example.com', name: 'John' }];
      const createdRecord = { id: 'cus_new', email: 'john@example.com', name: 'John', created: 1704067200 };
      mockStripeCustomers.create.mockResolvedValue(createdRecord);

      const result = await collection.create(mockCaller, inputData);

      expect(mockStripeCustomers.create).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cus_new');
    });

    it('should handle create errors', async () => {
      mockStripeCustomers.create.mockRejectedValue(new Error('Create failed'));

      await expect(collection.create(mockCaller, [{ email: 'test@example.com' }])).rejects.toThrow(
        'Create failed',
      );
    });
  });

  describe('update', () => {
    it('should update records', async () => {
      mockStripeCustomers.list.mockResolvedValue({
        data: [{ id: 'cus_1' }, { id: 'cus_2' }],
      });
      mockStripeCustomers.update.mockResolvedValue({ id: 'cus_1' });

      const filter = {
        conditionTree: { field: 'status', operator: 'Equal', value: 'active' },
      } as any;

      await collection.update(mockCaller, filter, { name: 'Updated' });

      expect(mockStripeCustomers.update).toHaveBeenCalledTimes(2);
      expect(mockStripeCustomers.update).toHaveBeenCalledWith('cus_1', expect.any(Object));
      expect(mockStripeCustomers.update).toHaveBeenCalledWith('cus_2', expect.any(Object));
    });

    it('should not update when no records match', async () => {
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      await collection.update(mockCaller, {} as any, { name: 'Updated' });

      expect(mockStripeCustomers.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete records', async () => {
      mockStripeCustomers.list.mockResolvedValue({
        data: [{ id: 'cus_1' }, { id: 'cus_2' }],
      });
      mockStripeCustomers.del.mockResolvedValue({ deleted: true });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeCustomers.del).toHaveBeenCalledTimes(2);
      expect(mockStripeCustomers.del).toHaveBeenCalledWith('cus_1');
      expect(mockStripeCustomers.del).toHaveBeenCalledWith('cus_2');
    });

    it('should not delete when no records match', async () => {
      mockStripeCustomers.list.mockResolvedValue({ data: [] });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeCustomers.del).not.toHaveBeenCalled();
    });
  });
});
