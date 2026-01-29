/**
 * Tests for StripeDataSource
 */

import StripeDataSource from '../src/datasource';

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

describe('StripeDataSource', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, STRIPE_SECRET_KEY: 'sk_test_xxx' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should throw error if no secret key provided', () => {
      delete process.env.STRIPE_SECRET_KEY;

      expect(() => new StripeDataSource()).toThrow('Stripe Secret Key is required');
    });

    it('should use environment variable for secret key', () => {
      const datasource = new StripeDataSource();

      expect(datasource).toBeDefined();
    });

    it('should use provided secret key', () => {
      delete process.env.STRIPE_SECRET_KEY;
      const datasource = new StripeDataSource({ secretKey: 'sk_test_custom' });

      expect(datasource).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('should connect to Stripe and register collections', async () => {
      const datasource = new StripeDataSource();
      await datasource.initialize();

      expect(datasource.collections).toHaveLength(9);
    });

    it('should include only specified resources', async () => {
      const datasource = new StripeDataSource({
        includeResources: ['customers', 'products'],
      });
      await datasource.initialize();

      expect(datasource.collections).toHaveLength(2);
      expect(datasource.collections.map(c => c.name)).toContain('Stripe Customers');
      expect(datasource.collections.map(c => c.name)).toContain('Stripe Products');
    });

    it('should exclude specified resources', async () => {
      const datasource = new StripeDataSource({
        excludeResources: ['balance_transactions', 'charges'],
      });
      await datasource.initialize();

      expect(datasource.collections).toHaveLength(7);
      expect(datasource.collections.map(c => c.name)).not.toContain('Stripe Balance Transactions');
      expect(datasource.collections.map(c => c.name)).not.toContain('Stripe Charges');
    });

    it('should call logger during initialization', async () => {
      const mockLogger = jest.fn();
      const datasource = new StripeDataSource({ logger: mockLogger });
      await datasource.initialize();

      expect(mockLogger).toHaveBeenCalledWith('Info', expect.stringContaining('Initializing'));
      expect(mockLogger).toHaveBeenCalledWith('Info', expect.stringContaining('Connected to Stripe'));
      expect(mockLogger).toHaveBeenCalledWith('Info', expect.stringContaining('Initialized with'));
    });
  });

  describe('getStripeClient', () => {
    it('should return null before initialization', () => {
      const datasource = new StripeDataSource();

      expect(datasource.getStripeClient()).toBeNull();
    });

    it('should return Stripe client after initialization', async () => {
      const datasource = new StripeDataSource();
      await datasource.initialize();

      expect(datasource.getStripeClient()).toBeDefined();
    });
  });
});
