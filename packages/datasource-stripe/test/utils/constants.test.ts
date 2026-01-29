/**
 * Tests for constants
 */

import {
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_RETRY_OPTIONS,
  HTTP_STATUS,
  STRIPE_API_VERSION,
  SUPPORTED_RESOURCES,
  ZERO_DECIMAL_CURRENCIES,
} from '../../src/utils/constants';

describe('constants', () => {
  describe('DEFAULT_PAGE_SIZE', () => {
    it('should be 100', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(100);
    });
  });

  describe('BATCH_SIZE', () => {
    it('should be 100', () => {
      expect(BATCH_SIZE).toBe(100);
    });
  });

  describe('STRIPE_API_VERSION', () => {
    it('should be a valid version string', () => {
      expect(STRIPE_API_VERSION).toBe('2023-10-16');
    });
  });

  describe('SUPPORTED_RESOURCES', () => {
    it('should contain all expected resources', () => {
      expect(SUPPORTED_RESOURCES).toContain('customers');
      expect(SUPPORTED_RESOURCES).toContain('products');
      expect(SUPPORTED_RESOURCES).toContain('prices');
      expect(SUPPORTED_RESOURCES).toContain('subscriptions');
      expect(SUPPORTED_RESOURCES).toContain('invoices');
      expect(SUPPORTED_RESOURCES).toContain('payment_intents');
      expect(SUPPORTED_RESOURCES).toContain('charges');
      expect(SUPPORTED_RESOURCES).toContain('refunds');
      expect(SUPPORTED_RESOURCES).toContain('balance_transactions');
    });

    it('should have 9 resources', () => {
      expect(SUPPORTED_RESOURCES).toHaveLength(9);
    });
  });

  describe('HTTP_STATUS', () => {
    it('should have correct status codes', () => {
      expect(HTTP_STATUS.TOO_MANY_REQUESTS).toBe(429);
      expect(HTTP_STATUS.SERVICE_UNAVAILABLE).toBe(503);
      expect(HTTP_STATUS.GATEWAY_TIMEOUT).toBe(504);
    });
  });

  describe('DEFAULT_RETRY_OPTIONS', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_RETRY_OPTIONS.maxRetries).toBe(3);
      expect(DEFAULT_RETRY_OPTIONS.initialDelayMs).toBe(1000);
      expect(DEFAULT_RETRY_OPTIONS.maxDelayMs).toBe(30000);
      expect(DEFAULT_RETRY_OPTIONS.backoffMultiplier).toBe(2);
      expect(DEFAULT_RETRY_OPTIONS.jitter).toBe(true);
    });
  });

  describe('ZERO_DECIMAL_CURRENCIES', () => {
    it('should contain common zero-decimal currencies', () => {
      expect(ZERO_DECIMAL_CURRENCIES).toContain('jpy');
      expect(ZERO_DECIMAL_CURRENCIES).toContain('krw');
      expect(ZERO_DECIMAL_CURRENCIES).toContain('vnd');
    });

    it('should have 16 currencies', () => {
      expect(ZERO_DECIMAL_CURRENCIES).toHaveLength(16);
    });
  });
});
