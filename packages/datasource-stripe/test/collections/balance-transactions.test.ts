/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for BalanceTransactionsCollection
 */

import BalanceTransactionsCollection from '../../src/collections/balance-transactions';
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

describe('BalanceTransactionsCollection', () => {
  let datasource: StripeDataSource;
  let collection: BalanceTransactionsCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Balance Transactions') as BalanceTransactionsCollection;
  });

  describe('create', () => {
    it('should throw error - balance transactions cannot be created', async () => {
      await expect(collection.create(mockCaller, [{ amount: 100 }])).rejects.toThrow(
        'Balance transactions cannot be created directly',
      );
    });
  });

  describe('update', () => {
    it('should throw error - balance transactions cannot be updated', async () => {
      await expect(collection.update(mockCaller, {} as any, { amount: 100 })).rejects.toThrow(
        'Balance transactions are read-only',
      );
    });
  });

  describe('delete', () => {
    it('should throw error - balance transactions cannot be deleted', async () => {
      await expect(collection.delete(mockCaller, {} as any)).rejects.toThrow(
        'Balance transactions cannot be deleted',
      );
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.amount).toBeDefined();
      expect(fields.amount.columnType).toBe('Number');
      expect(fields.type).toBeDefined();
      expect(fields.type.columnType).toBe('Enum');
      expect(fields.status).toBeDefined();
      expect(fields.available_on).toBeDefined();
    });

    it('should have all fields read-only', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.amount.isReadOnly).toBe(true);
      expect(fields.currency.isReadOnly).toBe(true);
      expect(fields.net.isReadOnly).toBe(true);
      expect(fields.fee.isReadOnly).toBe(true);
      expect(fields.type.isReadOnly).toBe(true);
    });
  });
});
