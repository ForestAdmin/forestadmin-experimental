/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for CustomersCollection
 */

import CustomersCollection from '../../src/collections/customers';
import StripeDataSource from '../../src/datasource';

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

describe('CustomersCollection', () => {
  let datasource: StripeDataSource;
  let collection: CustomersCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Customers') as CustomersCollection;
  });

  describe('delete', () => {
    it('should delete customer', async () => {
      mockStripeCustomers.retrieve.mockResolvedValue({ id: 'cus_123' });
      mockStripeCustomers.del.mockResolvedValue({ deleted: true });

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'cus_123' },
      } as any;

      await collection.delete(mockCaller, filter);

      expect(mockStripeCustomers.del).toHaveBeenCalledWith('cus_123');
    });

    it('should delete multiple customers', async () => {
      mockStripeCustomers.list.mockResolvedValue({
        data: [{ id: 'cus_1' }, { id: 'cus_2' }],
      });
      mockStripeCustomers.del.mockResolvedValue({ deleted: true });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeCustomers.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.email).toBeDefined();
      expect(fields.name).toBeDefined();
      expect(fields.phone).toBeDefined();
      expect(fields.balance).toBeDefined();
      expect(fields.currency).toBeDefined();
      expect(fields.metadata).toBeDefined();
    });

    it('should have balance as read-only', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.balance.isReadOnly).toBe(true);
    });
  });
});
