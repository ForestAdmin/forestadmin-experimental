/**
 * Tests for serializer utilities
 */

import {
  AMOUNT_FIELDS,
  dateToTimestamp,
  formatCurrencyAmount,
  TIMESTAMP_FIELDS,
  timestampToDate,
  toCurrencyAmount,
} from '../../src/utils/serializer';

describe('serializer', () => {
  describe('timestampToDate', () => {
    it('should convert Unix timestamp to Date', () => {
      const timestamp = 1704067200; // 2024-01-01 00:00:00 UTC
      const result = timestampToDate(timestamp);

      expect(result).toBeInstanceOf(Date);
      expect(result?.getTime()).toBe(timestamp * 1000);
    });

    it('should return null for null input', () => {
      expect(timestampToDate(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(timestampToDate(undefined)).toBeNull();
    });
  });

  describe('dateToTimestamp', () => {
    it('should convert Date to Unix timestamp', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const result = dateToTimestamp(date);

      expect(result).toBe(Math.floor(date.getTime() / 1000));
    });

    it('should convert ISO string to Unix timestamp', () => {
      const isoString = '2024-01-01T00:00:00Z';
      const result = dateToTimestamp(isoString);

      expect(result).toBe(Math.floor(new Date(isoString).getTime() / 1000));
    });

    it('should return null for null input', () => {
      expect(dateToTimestamp(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(dateToTimestamp(undefined)).toBeNull();
    });
  });

  describe('formatCurrencyAmount', () => {
    it('should convert cents to decimal', () => {
      expect(formatCurrencyAmount(1000, 'usd')).toBe(10);
      expect(formatCurrencyAmount(1050, 'usd')).toBe(10.5);
      expect(formatCurrencyAmount(99, 'usd')).toBe(0.99);
    });

    it('should not convert zero-decimal currencies', () => {
      expect(formatCurrencyAmount(1000, 'jpy')).toBe(1000);
      expect(formatCurrencyAmount(1000, 'JPY')).toBe(1000);
    });

    it('should return null for null input', () => {
      expect(formatCurrencyAmount(null, 'usd')).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(formatCurrencyAmount(undefined, 'usd')).toBeNull();
    });

    it('should handle missing currency', () => {
      expect(formatCurrencyAmount(1000)).toBe(10);
    });
  });

  describe('toCurrencyAmount', () => {
    it('should convert decimal to cents', () => {
      expect(toCurrencyAmount(10, 'usd')).toBe(1000);
      expect(toCurrencyAmount(10.5, 'usd')).toBe(1050);
      expect(toCurrencyAmount(0.99, 'usd')).toBe(99);
    });

    it('should not convert zero-decimal currencies', () => {
      expect(toCurrencyAmount(1000, 'jpy')).toBe(1000);
      expect(toCurrencyAmount(1000.5, 'jpy')).toBe(1001); // Rounds
    });

    it('should return null for null input', () => {
      expect(toCurrencyAmount(null, 'usd')).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(toCurrencyAmount(undefined, 'usd')).toBeNull();
    });

    it('should handle missing currency', () => {
      expect(toCurrencyAmount(10)).toBe(1000);
    });
  });

  describe('TIMESTAMP_FIELDS', () => {
    it('should contain expected timestamp fields', () => {
      expect(TIMESTAMP_FIELDS).toContain('created');
      expect(TIMESTAMP_FIELDS).toContain('updated');
      expect(TIMESTAMP_FIELDS).toContain('current_period_start');
      expect(TIMESTAMP_FIELDS).toContain('current_period_end');
      expect(TIMESTAMP_FIELDS).toContain('trial_start');
      expect(TIMESTAMP_FIELDS).toContain('trial_end');
      expect(TIMESTAMP_FIELDS).toContain('available_on');
    });
  });

  describe('AMOUNT_FIELDS', () => {
    it('should contain expected amount fields', () => {
      expect(AMOUNT_FIELDS).toContain('amount');
      expect(AMOUNT_FIELDS).toContain('amount_due');
      expect(AMOUNT_FIELDS).toContain('amount_paid');
      expect(AMOUNT_FIELDS).toContain('unit_amount');
      expect(AMOUNT_FIELDS).toContain('fee');
      expect(AMOUNT_FIELDS).toContain('net');
    });
  });
});
