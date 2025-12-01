import type { RetryOptions, RetryableError } from '../../src/utils/retry-handler';

import {
  calculateBackoffDelay,
  configureRetryOptions,
  createRetryWrapper,
  getRetryAfterMs,
  getSharedRetryOptions,
  isRateLimitError,
  isTransientError,
  withRetry,
} from '../../src/utils/retry-handler';

describe('RetryHandler', () => {
  describe('isRateLimitError', () => {
    it('should return true for error with code 429', () => {
      const error = { code: 429, message: 'Too many requests' };
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return true for error message containing 429', () => {
      const error = new Error('Request failed with status 429');
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return true for error message containing "too many requests"', () => {
      const error = new Error('Too many requests, please retry later');
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return true for error with name TooManyRequests', () => {
      const error = new Error('Rate limited');
      error.name = 'TooManyRequests';
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return true for error message containing TooManyRequests', () => {
      const error = new Error('TooManyRequests: Retry after some time');
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isRateLimitError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isRateLimitError(undefined)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isRateLimitError('string error')).toBe(false);
    });

    it('should return false for other error codes', () => {
      const error = { code: 500, message: 'Internal server error' };
      expect(isRateLimitError(error)).toBe(false);
    });

    it('should return false for regular errors', () => {
      const error = new Error('Something went wrong');
      expect(isRateLimitError(error)).toBe(false);
    });
  });

  describe('isTransientError', () => {
    it('should return true for 503 Service Unavailable', () => {
      const error = { code: 503, message: 'Service unavailable' };
      expect(isTransientError(error)).toBe(true);
    });

    it('should return true for 504 Gateway Timeout', () => {
      const error = { code: 504, message: 'Gateway timeout' };
      expect(isTransientError(error)).toBe(true);
    });

    it('should return true for 408 Request Timeout', () => {
      const error = { code: 408, message: 'Request timeout' };
      expect(isTransientError(error)).toBe(true);
    });

    it('should return true for ECONNRESET errors', () => {
      const error = new Error('read ECONNRESET');
      expect(isTransientError(error)).toBe(true);
    });

    it('should return true for ETIMEDOUT errors', () => {
      const error = new Error('connect ETIMEDOUT');
      expect(isTransientError(error)).toBe(true);
    });

    it('should return true for ENOTFOUND errors', () => {
      const error = new Error('getaddrinfo ENOTFOUND');
      expect(isTransientError(error)).toBe(true);
    });

    it('should return true for socket hang up errors', () => {
      const error = new Error('socket hang up');
      expect(isTransientError(error)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isTransientError(null)).toBe(false);
    });

    it('should return false for non-transient errors', () => {
      const error = { code: 400, message: 'Bad request' };
      expect(isTransientError(error)).toBe(false);
    });
  });

  describe('getRetryAfterMs', () => {
    it('should extract x-ms-retry-after-ms header', () => {
      const error: RetryableError = {
        name: 'Error',
        message: 'Rate limited',
        headers: { 'x-ms-retry-after-ms': '5000' },
      };
      expect(getRetryAfterMs(error)).toBe(5000);
    });

    it('should extract retry-after header (in seconds) and convert to ms', () => {
      const error: RetryableError = {
        name: 'Error',
        message: 'Rate limited',
        headers: { 'retry-after': '3' },
      };
      expect(getRetryAfterMs(error)).toBe(3000);
    });

    it('should prefer x-ms-retry-after-ms over retry-after', () => {
      const error: RetryableError = {
        name: 'Error',
        message: 'Rate limited',
        headers: {
          'x-ms-retry-after-ms': '2000',
          'retry-after': '10',
        },
      };
      expect(getRetryAfterMs(error)).toBe(2000);
    });

    it('should return null if no headers present', () => {
      const error: RetryableError = {
        name: 'Error',
        message: 'Rate limited',
      };
      expect(getRetryAfterMs(error)).toBe(null);
    });

    it('should return null for invalid header values', () => {
      const error: RetryableError = {
        name: 'Error',
        message: 'Rate limited',
        headers: { 'x-ms-retry-after-ms': 'invalid' },
      };
      expect(getRetryAfterMs(error)).toBe(null);
    });

    it('should return null for zero or negative values', () => {
      const error: RetryableError = {
        name: 'Error',
        message: 'Rate limited',
        headers: { 'x-ms-retry-after-ms': '0' },
      };
      expect(getRetryAfterMs(error)).toBe(null);
    });
  });

  describe('calculateBackoffDelay', () => {
    const defaultOptions = {
      maxRetries: 9,
      initialDelayMs: 1000,
      maxDelayMs: 30000,
      backoffMultiplier: 2,
      useJitter: false,
    };

    it('should calculate exponential backoff for attempt 0', () => {
      const delay = calculateBackoffDelay(0, defaultOptions);
      expect(delay).toBe(1000); // 1000 * 2^0 = 1000
    });

    it('should calculate exponential backoff for attempt 1', () => {
      const delay = calculateBackoffDelay(1, defaultOptions);
      expect(delay).toBe(2000); // 1000 * 2^1 = 2000
    });

    it('should calculate exponential backoff for attempt 2', () => {
      const delay = calculateBackoffDelay(2, defaultOptions);
      expect(delay).toBe(4000); // 1000 * 2^2 = 4000
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, defaultOptions);
      expect(delay).toBe(30000); // Should be capped at maxDelayMs
    });

    it('should use retry-after delay when provided', () => {
      const delay = calculateBackoffDelay(0, defaultOptions, 5000);
      // Should use retry-after with small buffer (5000 * 1.1 = 5500)
      expect(delay).toBe(5500);
    });

    it('should cap retry-after delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(0, defaultOptions, 50000);
      expect(delay).toBe(30000); // Capped at maxDelayMs
    });

    it('should add jitter when enabled', () => {
      const optionsWithJitter = { ...defaultOptions, useJitter: true };
      const delays = new Set<number>();

      // Generate multiple delays and check they vary
      for (let i = 0; i < 10; i += 1) {
        delays.add(calculateBackoffDelay(2, optionsWithJitter));
      }

      // With jitter, we should get varied delays
      // All should be between 2000 (50% of 4000) and 4000
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(2000);
        expect(delay).toBeLessThanOrEqual(4000);
      });
    });

    it('should add jitter to retry-after delay when enabled', () => {
      const optionsWithJitter = { ...defaultOptions, useJitter: true };
      const delays = new Set<number>();

      for (let i = 0; i < 10; i += 1) {
        delays.add(calculateBackoffDelay(0, optionsWithJitter, 5000));
      }

      // With jitter, delays should vary between 5500 and 5500 + 20% jitter
      // Actually the formula is: bufferedDelay + random * 0.2 * bufferedDelay
      // = 5500 + [0, 1100] = [5500, 6600]
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(5500);
        expect(delay).toBeLessThanOrEqual(6600);
      });
    });
  });

  describe('withRetry', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt without retry', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const resultPromise = withRetry(operation);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on rate limit error and succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: 429, message: 'Rate limited' })
        .mockResolvedValueOnce('success');

      const resultPromise = withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 100,
        useJitter: false,
      });

      // Fast-forward past the retry delay
      await jest.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should retry on transient error and succeed', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: 503, message: 'Service unavailable' })
        .mockResolvedValueOnce('success');

      const resultPromise = withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 100,
        useJitter: false,
      });

      await jest.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should throw immediately for non-retryable errors', async () => {
      const error = new Error('Bad request');
      Object.assign(error, { code: 400 });
      const operation = jest.fn().mockRejectedValue(error);

      await expect(withRetry(operation, { maxRetries: 3 })).rejects.toThrow('Bad request');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw after exhausting max retries', async () => {
      const error = { code: 429, message: 'Rate limited' };
      const operation = jest.fn().mockRejectedValue(error);

      // Don't use fake timers for this test - too complex with async loops
      jest.useRealTimers();

      await expect(
        withRetry(operation, {
          maxRetries: 2,
          initialDelayMs: 10, // Short delay for fast test
          useJitter: false,
        }),
      ).rejects.toThrow('Operation failed after 2 retries');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('should call onRetry callback on each retry', async () => {
      const onRetry = jest.fn();
      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: 429, message: 'Rate limited' })
        .mockRejectedValueOnce({ code: 429, message: 'Rate limited' })
        .mockResolvedValueOnce('success');

      const resultPromise = withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 100,
        useJitter: false,
        onRetry,
      });

      await jest.advanceTimersByTimeAsync(100);
      await jest.advanceTimersByTimeAsync(200);
      await resultPromise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.any(Object));
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, expect.any(Object));
    });

    it('should respect retry-after header from Cosmos DB', async () => {
      const error: RetryableError = {
        name: 'Error',
        message: 'Rate limited',
        code: 429,
        headers: { 'x-ms-retry-after-ms': '500' },
      };
      const operation = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('success');

      const resultPromise = withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 10000,
        useJitter: false,
      });

      // Should wait for retry-after (500 * 1.1 = 550ms)
      await jest.advanceTimersByTimeAsync(550);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff between retries', async () => {
      const onRetry = jest.fn();
      const error = { code: 429, message: 'Rate limited' };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      const resultPromise = withRetry(operation, {
        maxRetries: 5,
        initialDelayMs: 100,
        backoffMultiplier: 2,
        useJitter: false,
        onRetry,
      });

      await jest.advanceTimersByTimeAsync(100); // First retry
      await jest.advanceTimersByTimeAsync(200); // Second retry
      await jest.advanceTimersByTimeAsync(400); // Third retry
      await resultPromise;

      expect(onRetry).toHaveBeenNthCalledWith(1, 1, 100, expect.any(Object)); // 100 * 2^0
      expect(onRetry).toHaveBeenNthCalledWith(2, 2, 200, expect.any(Object)); // 100 * 2^1
      expect(onRetry).toHaveBeenNthCalledWith(3, 3, 400, expect.any(Object)); // 100 * 2^2
    });
  });

  describe('createRetryWrapper', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a wrapper with default options', async () => {
      const retryWithDefaults = createRetryWrapper({
        maxRetries: 2,
        initialDelayMs: 50,
        useJitter: false,
      });

      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: 429, message: 'Rate limited' })
        .mockResolvedValueOnce('success');

      const resultPromise = retryWithDefaults(operation);
      await jest.advanceTimersByTimeAsync(50);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should allow overriding default options', async () => {
      const retryWithDefaults = createRetryWrapper({
        maxRetries: 1,
        initialDelayMs: 50,
        useJitter: false,
      });

      const error = { code: 429, message: 'Rate limited' };
      const operation = jest
        .fn()
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success');

      // Override maxRetries to allow more retries
      const resultPromise = retryWithDefaults(operation, { maxRetries: 3 });

      await jest.advanceTimersByTimeAsync(50);
      await jest.advanceTimersByTimeAsync(100);
      const result = await resultPromise;

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });
  });

  describe('configureRetryOptions and getSharedRetryOptions', () => {
    it('should configure and retrieve shared retry options', () => {
      const options: RetryOptions = {
        maxRetries: 5,
        initialDelayMs: 500,
        maxDelayMs: 15000,
      };

      configureRetryOptions(options);
      const retrieved = getSharedRetryOptions();

      expect(retrieved).toEqual(options);
    });

    it('should return a copy of options to prevent mutation', () => {
      const options: RetryOptions = { maxRetries: 3 };
      configureRetryOptions(options);

      const retrieved1 = getSharedRetryOptions();
      const retrieved2 = getSharedRetryOptions();

      expect(retrieved1).not.toBe(retrieved2);
      expect(retrieved1).toEqual(retrieved2);
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle mixed retryable and success responses', async () => {
      const operation = jest
        .fn()
        .mockRejectedValueOnce({ code: 429, message: 'Rate limited' })
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockRejectedValueOnce({ code: 503, message: 'Service unavailable' })
        .mockResolvedValueOnce('finally success');

      const resultPromise = withRetry(operation, {
        maxRetries: 5,
        initialDelayMs: 100,
        useJitter: false,
      });

      await jest.advanceTimersByTimeAsync(100); // After first 429
      await jest.advanceTimersByTimeAsync(200); // After socket hang up
      await jest.advanceTimersByTimeAsync(400); // After 503
      const result = await resultPromise;

      expect(result).toBe('finally success');
      expect(operation).toHaveBeenCalledTimes(4);
    });

    it('should handle Cosmos DB specific error structure', async () => {
      // Simulate realistic Cosmos DB 429 error
      const cosmosError = {
        code: 429,
        message: 'Request rate is too large. More Request Units may be needed.',
        headers: {
          'x-ms-retry-after-ms': '1000',
          'x-ms-request-charge': '0',
        },
      };

      const operation = jest
        .fn()
        .mockRejectedValueOnce(cosmosError)
        .mockResolvedValueOnce({
          resource: { id: 'test', name: 'Test Item' },
        });

      const onRetry = jest.fn();
      const resultPromise = withRetry(operation, {
        maxRetries: 3,
        initialDelayMs: 100,
        maxDelayMs: 5000,
        useJitter: false,
        onRetry,
      });

      // Should wait for ~1100ms (1000 * 1.1)
      await jest.advanceTimersByTimeAsync(1100);
      const result = await resultPromise;

      expect(result).toEqual({ resource: { id: 'test', name: 'Test Item' } });
      expect(operation).toHaveBeenCalledTimes(2);
      // Verify delay respects x-ms-retry-after-ms
      expect(onRetry).toHaveBeenCalledWith(1, 1100, cosmosError);
    });
  });
});
