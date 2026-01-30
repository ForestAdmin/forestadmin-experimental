/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for ChargesCollection
 */

import ChargesCollection from '../../src/collections/charges';
import StripeDataSource from '../../src/datasource';

// Mock Stripe
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
    refunds: {},
    balanceTransactions: {},
  }));
});

describe('ChargesCollection', () => {
  let datasource: StripeDataSource;
  let collection: ChargesCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Charges') as ChargesCollection;
  });

  describe('create', () => {
    it('should throw error - charges cannot be created directly', async () => {
      await expect(collection.create(mockCaller, [{ amount: '100' }])).rejects.toThrow(
        'Charges cannot be created directly',
      );
    });
  });

  describe('delete', () => {
    it('should throw error - charges cannot be deleted', async () => {
      await expect(collection.delete(mockCaller, {} as any)).rejects.toThrow(
        'Charges cannot be deleted',
      );
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.amount).toBeDefined();
      expect(fields.status).toBeDefined();
      expect(fields.status.columnType).toBe('Enum');
      expect(fields.paid).toBeDefined();
      expect(fields.receipt_url).toBeDefined();
    });

    it('should have read-only amount fields', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.amount.isReadOnly).toBe(true);
      expect(fields.amount_captured.isReadOnly).toBe(true);
      expect(fields.amount_refunded.isReadOnly).toBe(true);
    });
  });
});
