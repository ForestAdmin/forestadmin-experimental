/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for RefundsCollection
 */

import RefundsCollection from '../../src/collections/refunds';
import StripeDataSource from '../../src/datasource';

// Mock Stripe
const mockStripeRefunds = {
  retrieve: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  cancel: jest.fn(),
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      retrieve: jest.fn().mockResolvedValue({ id: 'acct_test123' }),
    },
    customers: {},
    products: {},
    prices: {},
    subscriptions: {},
    invoices: {},
    paymentIntents: {},
    charges: {},
    refunds: mockStripeRefunds,
    balanceTransactions: {},
  }));
});

describe('RefundsCollection', () => {
  let datasource: StripeDataSource;
  let collection: RefundsCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Refunds') as RefundsCollection;
  });

  describe('delete', () => {
    it('should cancel pending refund', async () => {
      mockStripeRefunds.retrieve.mockResolvedValue({
        id: 're_123',
        status: 'pending',
      });
      mockStripeRefunds.cancel.mockResolvedValue({
        id: 're_123',
        status: 'canceled',
      });

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 're_123' },
      } as any;

      await collection.delete(mockCaller, filter);

      expect(mockStripeRefunds.cancel).toHaveBeenCalledWith('re_123');
    });

    it('should cancel multiple pending refunds', async () => {
      mockStripeRefunds.list.mockResolvedValue({
        data: [
          { id: 're_1', status: 'pending' },
          { id: 're_2', status: 'pending' },
        ],
      });
      mockStripeRefunds.cancel.mockResolvedValue({ status: 'canceled' });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeRefunds.cancel).toHaveBeenCalledTimes(2);
    });

    it('should skip already succeeded refunds', async () => {
      mockStripeRefunds.list.mockResolvedValue({
        data: [
          { id: 're_1', status: 'succeeded' },
          { id: 're_2', status: 'pending' },
        ],
      });
      mockStripeRefunds.cancel.mockResolvedValue({ status: 'canceled' });

      await collection.delete(mockCaller, {} as any);

      // Only the pending one should be canceled
      expect(mockStripeRefunds.cancel).toHaveBeenCalledTimes(1);
      expect(mockStripeRefunds.cancel).toHaveBeenCalledWith('re_2');
    });

    it('should skip failed refunds', async () => {
      mockStripeRefunds.list.mockResolvedValue({
        data: [{ id: 're_1', status: 'failed' }],
      });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeRefunds.cancel).not.toHaveBeenCalled();
    });

    it('should not cancel when no refunds match', async () => {
      mockStripeRefunds.list.mockResolvedValue({ data: [] });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeRefunds.cancel).not.toHaveBeenCalled();
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.amount).toBeDefined();
      expect(fields.charge).toBeDefined();
      expect(fields.status).toBeDefined();
      expect(fields.status.columnType).toBe('Enum');
      expect(fields.status.enumValues).toContain('pending');
      expect(fields.status.enumValues).toContain('succeeded');
      expect(fields.status.enumValues).toContain('failed');
    });

    it('should have status as read-only', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.status.isReadOnly).toBe(true);
    });
  });
});
