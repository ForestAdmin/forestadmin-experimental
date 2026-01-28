/**
 * Tests for constants.js
 */

const {
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  AIRTABLE_META_URL,
} = require('../src/constants');

describe('constants', () => {
  describe('BATCH_SIZE', () => {
    it('should be 10 (Airtable API limit)', () => {
      expect(BATCH_SIZE).toBe(10);
    });

    it('should be a number', () => {
      expect(typeof BATCH_SIZE).toBe('number');
    });
  });

  describe('DEFAULT_PAGE_SIZE', () => {
    it('should be 100', () => {
      expect(DEFAULT_PAGE_SIZE).toBe(100);
    });

    it('should not exceed MAX_PAGE_SIZE', () => {
      expect(DEFAULT_PAGE_SIZE).toBeLessThanOrEqual(MAX_PAGE_SIZE);
    });
  });

  describe('MAX_PAGE_SIZE', () => {
    it('should be 100 (Airtable API limit)', () => {
      expect(MAX_PAGE_SIZE).toBe(100);
    });
  });

  describe('AIRTABLE_META_URL', () => {
    it('should be the correct Airtable Meta API URL', () => {
      expect(AIRTABLE_META_URL).toBe('https://api.airtable.com/v0/meta');
    });

    it('should be a valid HTTPS URL', () => {
      expect(AIRTABLE_META_URL).toMatch(/^https:\/\//);
    });
  });
});
