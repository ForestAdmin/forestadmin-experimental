/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for PaymentIntentsCollection
 */

import PaymentIntentsCollection from '../../src/collections/payment-intents';
import StripeDataSource from '../../src/datasource';

// Mock Stripe
const mockStripePaymentIntents = {
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
    paymentIntents: mockStripePaymentIntents,
    charges: {},
    refunds: {},
    balanceTransactions: {},
  }));
});

describe('PaymentIntentsCollection', () => {
  let datasource: StripeDataSource;
  let collection: PaymentIntentsCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Payment Intents') as PaymentIntentsCollection;
  });

  describe('delete', () => {
    it('should cancel payment intent instead of deleting', async () => {
      mockStripePaymentIntents.retrieve.mockResolvedValue({
        id: 'pi_123',
        status: 'requires_payment_method',
      });
      mockStripePaymentIntents.cancel.mockResolvedValue({
        id: 'pi_123',
        status: 'canceled',
      });

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'pi_123' },
      } as any;

      await collection.delete(mockCaller, filter);

      expect(mockStripePaymentIntents.cancel).toHaveBeenCalledWith('pi_123');
    });

    it('should cancel multiple payment intents', async () => {
      mockStripePaymentIntents.list.mockResolvedValue({
        data: [
          { id: 'pi_1', status: 'requires_payment_method' },
          { id: 'pi_2', status: 'requires_confirmation' },
        ],
      });
      mockStripePaymentIntents.cancel.mockResolvedValue({ status: 'canceled' });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripePaymentIntents.cancel).toHaveBeenCalledTimes(2);
    });

    it('should skip already canceled payment intents', async () => {
      mockStripePaymentIntents.list.mockResolvedValue({
        data: [
          { id: 'pi_1', status: 'canceled' },
          { id: 'pi_2', status: 'requires_payment_method' },
        ],
      });
      mockStripePaymentIntents.cancel.mockResolvedValue({ status: 'canceled' });

      await collection.delete(mockCaller, {} as any);

      // Only the non-canceled one should be canceled
      expect(mockStripePaymentIntents.cancel).toHaveBeenCalledTimes(1);
      expect(mockStripePaymentIntents.cancel).toHaveBeenCalledWith('pi_2');
    });

    it('should skip succeeded payment intents', async () => {
      mockStripePaymentIntents.list.mockResolvedValue({
        data: [{ id: 'pi_1', status: 'succeeded' }],
      });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripePaymentIntents.cancel).not.toHaveBeenCalled();
    });

    it('should not cancel when no payment intents match', async () => {
      mockStripePaymentIntents.list.mockResolvedValue({ data: [] });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripePaymentIntents.cancel).not.toHaveBeenCalled();
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.amount).toBeDefined();
      expect(fields.currency).toBeDefined();
      expect(fields.status).toBeDefined();
      expect(fields.status.columnType).toBe('Enum');
      expect(fields.status.enumValues).toContain('requires_payment_method');
      expect(fields.status.enumValues).toContain('succeeded');
      expect(fields.status.enumValues).toContain('canceled');
    });

    it('should have status as read-only', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.status.isReadOnly).toBe(true);
    });
  });
});
