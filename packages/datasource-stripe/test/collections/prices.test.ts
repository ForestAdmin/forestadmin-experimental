/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for PricesCollection
 */

import PricesCollection from '../../src/collections/prices';
import StripeDataSource from '../../src/datasource';

// Mock Stripe
const mockStripePrices = {
  retrieve: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      retrieve: jest.fn().mockResolvedValue({ id: 'acct_test123' }),
    },
    customers: {},
    products: {},
    prices: mockStripePrices,
    subscriptions: {},
    invoices: {},
    paymentIntents: {},
    charges: {},
    refunds: {},
    balanceTransactions: {},
  }));
});

describe('PricesCollection', () => {
  let datasource: StripeDataSource;
  let collection: PricesCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Prices') as PricesCollection;
  });

  describe('delete', () => {
    it('should archive price instead of deleting', async () => {
      // When filter has id=value, retrieve is called instead of list
      mockStripePrices.retrieve.mockResolvedValue({ id: 'price_123', active: true });
      mockStripePrices.update.mockResolvedValue({ id: 'price_123', active: false });

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'price_123' },
      } as any;

      await collection.delete(mockCaller, filter);

      expect(mockStripePrices.update).toHaveBeenCalledWith(
        'price_123',
        expect.objectContaining({ active: false }),
      );
    });
  });

  describe('schema', () => {
    it('should have correct field definitions', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.isPrimaryKey).toBe(true);
      expect(fields.unit_amount).toBeDefined();
      expect(fields.currency).toBeDefined();
      expect(fields.type).toBeDefined();
      expect(fields.type.columnType).toBe('Enum');
      expect(fields.type.enumValues).toContain('one_time');
      expect(fields.type.enumValues).toContain('recurring');
    });

    it('should have type as read-only', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.type.isReadOnly).toBe(true);
    });
  });
});
