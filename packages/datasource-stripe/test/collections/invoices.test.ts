/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for InvoicesCollection
 */

import InvoicesCollection from '../../src/collections/invoices';
import StripeDataSource from '../../src/datasource';

// Mock Stripe
const mockStripeInvoices = {
  retrieve: jest.fn(),
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  del: jest.fn(),
  voidInvoice: jest.fn(),
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
    invoices: mockStripeInvoices,
    paymentIntents: {},
    charges: {},
    refunds: {},
    balanceTransactions: {},
  }));
});

describe('InvoicesCollection', () => {
  let datasource: StripeDataSource;
  let collection: InvoicesCollection;
  const mockCaller = { id: 1 } as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
    datasource = new StripeDataSource();
    await datasource.initialize();
    collection = datasource.getCollection('Stripe Invoices') as InvoicesCollection;
  });

  describe('delete', () => {
    it('should delete draft invoices', async () => {
      mockStripeInvoices.list.mockResolvedValue({
        data: [{ id: 'in_123', status: 'draft' }],
      });
      mockStripeInvoices.del.mockResolvedValue({ deleted: true });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeInvoices.del).toHaveBeenCalledWith('in_123');
      expect(mockStripeInvoices.voidInvoice).not.toHaveBeenCalled();
    });

    it('should void open invoices', async () => {
      mockStripeInvoices.list.mockResolvedValue({
        data: [{ id: 'in_123', status: 'open' }],
      });
      mockStripeInvoices.voidInvoice.mockResolvedValue({ id: 'in_123', status: 'void' });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeInvoices.voidInvoice).toHaveBeenCalledWith('in_123');
      expect(mockStripeInvoices.del).not.toHaveBeenCalled();
    });

    it('should not delete paid invoices', async () => {
      mockStripeInvoices.list.mockResolvedValue({
        data: [{ id: 'in_123', status: 'paid' }],
      });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeInvoices.del).not.toHaveBeenCalled();
      expect(mockStripeInvoices.voidInvoice).not.toHaveBeenCalled();
    });

    it('should handle mixed statuses', async () => {
      mockStripeInvoices.list.mockResolvedValue({
        data: [
          { id: 'in_draft', status: 'draft' },
          { id: 'in_open', status: 'open' },
          { id: 'in_paid', status: 'paid' },
        ],
      });
      mockStripeInvoices.del.mockResolvedValue({ deleted: true });
      mockStripeInvoices.voidInvoice.mockResolvedValue({ status: 'void' });

      await collection.delete(mockCaller, {} as any);

      expect(mockStripeInvoices.del).toHaveBeenCalledWith('in_draft');
      expect(mockStripeInvoices.voidInvoice).toHaveBeenCalledWith('in_open');
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
      expect(fields.status.enumValues).toContain('draft');
      expect(fields.status.enumValues).toContain('open');
      expect(fields.status.enumValues).toContain('paid');
      expect(fields.amount_due).toBeDefined();
      expect(fields.hosted_invoice_url).toBeDefined();
    });

    it('should have amount fields as read-only', () => {
      const fields = collection.schema.fields as Record<string, any>;

      expect(fields.amount_due.isReadOnly).toBe(true);
      expect(fields.amount_paid.isReadOnly).toBe(true);
      expect(fields.amount_remaining.isReadOnly).toBe(true);
    });
  });
});
