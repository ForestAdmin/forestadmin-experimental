/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for ProductsCollection
 */

import ProductsCollection from '../../src/collections/products';
import StripeDataSource from '../../src/datasource';

// Mock Stripe
const mockStripeProducts = {
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
    customers: {},
    products: mockStripeProducts,
    prices: {},
    subscriptions: {},
    invoices: {},
    paymentIntents: {},
    charges: {},
    refunds: {},
    balanceTransactions: {},
  }));
});

describe('ProductsCollection', () => {
  let datasource: StripeDataSource;
  let collection: ProductsCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Products') as ProductsCollection;
  });

  describe('delete', () => {
    it('should delete product', async () => {
      mockStripeProducts.retrieve.mockResolvedValue({
        id: 'prod_123',
        active: true,
      });
      mockStripeProducts.del.mockResolvedValue({
        id: 'prod_123',
        deleted: true,
      });

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'prod_123' },
      } as any;

      await collection.delete(mockCaller, filter);

      expect(mockStripeProducts.del).toHaveBeenCalledWith('prod_123');
    });

    it('should delete multiple products', async () => {
      mockStripeProducts.list.mockResolvedValue({
        data: [
          { id: 'prod_1', active: true },
          { id: 'prod_2', active: true },
        ],
      });
      mockStripeProducts.del.mockResolvedValue({ deleted: true });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeProducts.del).toHaveBeenCalledTimes(2);
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.name).toBeDefined();
      expect(fields.description).toBeDefined();
      expect(fields.active).toBeDefined();
      expect(fields.active.columnType).toBe('Boolean');
      expect(fields.default_price).toBeDefined();
      expect(fields.images).toBeDefined();
    });
  });
});
