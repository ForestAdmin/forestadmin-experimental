/**
 * Tests for retry-handler utility
 */

import {
  withRetry,
  isRateLimitError,
  isTransientError,
  configureRetryOptions,
} from '../src/utils/retry-handler';

describe('retry-handler', () => {
  beforeEach(() => {
    // Reset retry options to defaults
    configureRetryOptions({
      maxRetries: 3,
      initialDelayMs: 10, // Short delays for tests
      maxDelayMs: 100,
      backoffMultiplier: 2,
      jitter: false,
    });
  });

  describe('isRateLimitError', () => {
    it('should identify rate limit error by statusCode', () => {
      expect(isRateLimitError({ statusCode: 429 })).toBe(true);
      expect(isRateLimitError({ statusCode: 200 })).toBe(false);
    });

    it('should identify rate limit error by status', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
    });

    it('should identify rate limit error by code', () => {
      expect(isRateLimitError({ code: 'RATE_LIMIT_EXCEEDED' })).toBe(true);
    });

    it('should return false for null/undefined', () => {
      expect(isRateLimitError(null)).toBe(false);
      expect(isRateLimitError(undefined)).toBe(false);
    });
  });

  describe('isTransientError', () => {
    it('should identify rate limit errors as transient', () => {
      expect(isTransientError({ statusCode: 429 })).toBe(true);
    });

    it('should identify server errors as transient', () => {
      expect(isTransientError({ statusCode: 503 })).toBe(true);
      expect(isTransientError({ statusCode: 504 })).toBe(true);
    });

    it('should identify network errors as transient', () => {
      expect(isTransientError({ code: 'ECONNRESET' })).toBe(true);
      expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isTransientError({ code: 'ENOTFOUND' })).toBe(true);
    });

    it('should not identify client errors as transient', () => {
      expect(isTransientError({ statusCode: 400 })).toBe(false);
      expect(isTransientError({ statusCode: 401 })).toBe(false);
      expect(isTransientError({ statusCode: 404 })).toBe(false);
    });
  });

  describe('withRetry', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient errors', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce({ statusCode: 429 })
        .mockRejectedValueOnce({ statusCode: 503 })
        .mockResolvedValue('success');

      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const error = { statusCode: 429 };
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn)).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should not retry non-transient errors', async () => {
      const error = { statusCode: 400, message: 'Bad Request' };
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn)).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use custom retry options', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce({ statusCode: 429 })
        .mockResolvedValue('success');

      const result = await withRetry(fn, {
        maxRetries: 1,
        initialDelayMs: 5,
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('configureRetryOptions', () => {
    it('should configure global retry options', async () => {
      configureRetryOptions({
        maxRetries: 1,
        initialDelayMs: 5,
      });

      const fn = jest.fn()
        .mockRejectedValueOnce({ statusCode: 429 })
        .mockRejectedValueOnce({ statusCode: 429 })
        .mockResolvedValue('success');

      // With maxRetries: 1, should fail after 2 attempts
      await expect(withRetry(fn)).rejects.toEqual({ statusCode: 429 });
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
});
