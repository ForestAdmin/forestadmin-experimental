/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for SubscriptionsCollection
 */

import SubscriptionsCollection from '../../src/collections/subscriptions';
import StripeDataSource from '../../src/datasource';

// Mock Stripe
const mockStripeSubscriptions = {
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
    subscriptions: mockStripeSubscriptions,
    invoices: {},
    paymentIntents: {},
    charges: {},
    refunds: {},
    balanceTransactions: {},
  }));
});

describe('SubscriptionsCollection', () => {
  let datasource: StripeDataSource;
  let collection: SubscriptionsCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Subscriptions') as SubscriptionsCollection;
  });

  describe('delete', () => {
    it('should cancel subscription instead of deleting', async () => {
      // When filter has id=value, retrieve is called instead of list
      mockStripeSubscriptions.retrieve.mockResolvedValue({ id: 'sub_123' });
      mockStripeSubscriptions.cancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' });

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'sub_123' },
      } as any;

      await collection.delete(mockCaller, filter);

      expect(mockStripeSubscriptions.cancel).toHaveBeenCalledWith('sub_123');
    });

    it('should cancel multiple subscriptions', async () => {
      mockStripeSubscriptions.list.mockResolvedValue({
        data: [{ id: 'sub_1' }, { id: 'sub_2' }],
      });
      mockStripeSubscriptions.cancel.mockResolvedValue({ status: 'canceled' });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeSubscriptions.cancel).toHaveBeenCalledTimes(2);
    });

    it('should not cancel when no subscriptions match', async () => {
      mockStripeSubscriptions.list.mockResolvedValue({ data: [] });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeSubscriptions.cancel).not.toHaveBeenCalled();
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.customer).toBeDefined();
      expect(fields.status).toBeDefined();
      expect(fields.status.columnType).toBe('Enum');
      expect(fields.status.enumValues).toContain('active');
      expect(fields.status.enumValues).toContain('canceled');
      expect(fields.current_period_start).toBeDefined();
      expect(fields.current_period_end).toBeDefined();
    });

    it('should have status and period fields as read-only', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.status.isReadOnly).toBe(true);
      expect(fields.current_period_start.isReadOnly).toBe(true);
      expect(fields.current_period_end.isReadOnly).toBe(true);
    });
  });
});
