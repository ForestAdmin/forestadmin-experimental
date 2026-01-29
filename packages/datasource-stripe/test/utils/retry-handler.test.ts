/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Tests for retry-handler utilities
 */

import {
  configureLogger,
  configureRetryOptions,
  getSharedRetryOptions,
  isRateLimitError,
  isTransientError,
  withRetry,
} from '../../src/utils/retry-handler';
import { DEFAULT_RETRY_OPTIONS } from '../../src/utils/constants';

describe('retry-handler', () => {
  beforeEach(() => {
    // Reset to default options before each test
    configureRetryOptions(DEFAULT_RETRY_OPTIONS);
    configureLogger(undefined);
  });

  describe('isRateLimitError', () => {
    it('should return true for 429 statusCode', () => {
      expect(isRateLimitError({ statusCode: 429 })).toBe(true);
    });

    it('should return true for 429 status', () => {
      expect(isRateLimitError({ status: 429 })).toBe(true);
    });

    it('should return true for rate_limit code', () => {
      expect(isRateLimitError({ code: 'rate_limit' })).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isRateLimitError({ statusCode: 500 })).toBe(false);
      expect(isRateLimitError({ code: 'other_error' })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isRateLimitError(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isRateLimitError('error')).toBe(false);
      expect(isRateLimitError(123)).toBe(false);
    });
  });

  describe('isTransientError', () => {
    it('should return true for rate limit errors', () => {
      expect(isTransientError({ statusCode: 429 })).toBe(true);
    });

    it('should return true for 503 Service Unavailable', () => {
      expect(isTransientError({ statusCode: 503 })).toBe(true);
      expect(isTransientError({ status: 503 })).toBe(true);
    });

    it('should return true for 504 Gateway Timeout', () => {
      expect(isTransientError({ statusCode: 504 })).toBe(true);
      expect(isTransientError({ status: 504 })).toBe(true);
    });

    it('should return true for network errors', () => {
      expect(isTransientError({ code: 'ECONNRESET' })).toBe(true);
      expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isTransientError({ code: 'ENOTFOUND' })).toBe(true);
    });

    it('should return false for other errors', () => {
      expect(isTransientError({ statusCode: 400 })).toBe(false);
      expect(isTransientError({ statusCode: 401 })).toBe(false);
      expect(isTransientError({ statusCode: 404 })).toBe(false);
    });

    it('should return false for null', () => {
      expect(isTransientError(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isTransientError('error')).toBe(false);
    });
  });

  describe('configureRetryOptions', () => {
    it('should update shared retry options', () => {
      configureRetryOptions({ maxRetries: 5 });
      const options = getSharedRetryOptions();

      expect(options.maxRetries).toBe(5);
      expect(options.initialDelayMs).toBe(DEFAULT_RETRY_OPTIONS.initialDelayMs);
    });

    it('should merge with default options', () => {
      configureRetryOptions({ maxDelayMs: 60000 });
      const options = getSharedRetryOptions();

      expect(options.maxDelayMs).toBe(60000);
      expect(options.maxRetries).toBe(DEFAULT_RETRY_OPTIONS.maxRetries);
    });
  });

  describe('withRetry', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throw on non-transient error without retry', async () => {
      const error = new Error('Bad request');
      (error as any).statusCode = 400;
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn)).rejects.toThrow('Bad request');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on transient error', async () => {
      const error = new Error('Rate limited');
      (error as any).statusCode = 429;
      const fn = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue('success');

      configureRetryOptions({ maxRetries: 3, initialDelayMs: 10 });
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
      const error = new Error('Service unavailable');
      (error as any).statusCode = 503;
      const fn = jest.fn().mockRejectedValue(error);

      configureRetryOptions({ maxRetries: 2, initialDelayMs: 10 });
      await expect(withRetry(fn)).rejects.toThrow('Service unavailable');
      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should use custom options', async () => {
      const error = new Error('Timeout');
      (error as any).statusCode = 504;
      const fn = jest.fn().mockRejectedValue(error);

      await expect(withRetry(fn, { maxRetries: 1, initialDelayMs: 10 })).rejects.toThrow('Timeout');
      expect(fn).toHaveBeenCalledTimes(2); // Initial + 1 retry
    });

    it('should use Retry-After header when available', async () => {
      const error = new Error('Rate limited');
      (error as any).statusCode = 429;
      (error as any).headers = { 'retry-after': '1' };
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      configureRetryOptions({ maxRetries: 1, initialDelayMs: 10 });
      const result = await withRetry(fn);

      expect(result).toBe('success');
    });

    it('should log warnings when retrying', async () => {
      const mockLogger = jest.fn();
      configureLogger(mockLogger);

      const error = new Error('Rate limited');
      (error as any).statusCode = 429;
      const fn = jest.fn().mockRejectedValueOnce(error).mockResolvedValue('success');

      configureRetryOptions({ maxRetries: 1, initialDelayMs: 10 });
      await withRetry(fn);

      expect(mockLogger).toHaveBeenCalledWith('Warn', expect.stringContaining('retrying'));
    });
  });
});
