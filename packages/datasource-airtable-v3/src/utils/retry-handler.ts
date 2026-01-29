/**
 * Retry handler utility for handling Airtable rate limiting and transient errors
 */

import { Logger } from '@forestadmin/datasource-toolkit';

import { RetryOptions } from '../types/config';
import { DEFAULT_RETRY_OPTIONS, HTTP_STATUS } from './constants';

/**
 * Shared retry options instance
 */
let sharedRetryOptions: Required<RetryOptions> = { ...DEFAULT_RETRY_OPTIONS };

/**
 * Shared logger instance
 */
let sharedLogger: Logger | undefined;

/**
 * Configure shared logger
 */
export function configureLogger(logger: Logger | undefined): void {
  sharedLogger = logger;
}

/**
 * Configure shared retry options
 */
export function configureRetryOptions(options: RetryOptions): void {
  sharedRetryOptions = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };
}

/**
 * Get shared retry options
 */
export function getSharedRetryOptions(): Required<RetryOptions> {
  return sharedRetryOptions;
}

/**
 * Check if an error is a rate limit error (429)
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { statusCode?: number; status?: number; code?: string };

  return (
    err.statusCode === HTTP_STATUS.TOO_MANY_REQUESTS ||
    err.status === HTTP_STATUS.TOO_MANY_REQUESTS ||
    err.code === 'RATE_LIMIT_EXCEEDED'
  );
}

/**
 * Check if an error is a transient error that should be retried
 */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const err = error as { statusCode?: number; status?: number; code?: string };
  const status = err.statusCode || err.status;

  // Rate limit errors
  if (isRateLimitError(error)) {
    return true;
  }

  // Server errors that may be transient
  if (status === HTTP_STATUS.SERVICE_UNAVAILABLE || status === HTTP_STATUS.GATEWAY_TIMEOUT) {
    return true;
  }

  // Network errors
  if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
    return true;
  }

  return false;
}

/**
 * Calculate delay for retry with exponential backoff
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>,
  retryAfter?: number,
): number {
  // If server provided Retry-After header, use that
  if (retryAfter && retryAfter > 0) {
    return Math.min(retryAfter * 1000, options.maxDelayMs);
  }

  // Calculate exponential backoff
  let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt);

  // Add jitter if enabled (randomize by +/- 25%)
  if (options.jitter) {
    const jitterFactor = 0.75 + Math.random() * 0.5;
    delay *= jitterFactor;
  }

  // Cap at max delay
  return Math.min(delay, options.maxDelayMs);
}

/**
 * Extract Retry-After value from error response
 */
function extractRetryAfter(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const err = error as { headers?: { 'retry-after'?: string } };

  if (err.headers?.['retry-after']) {
    const value = parseInt(err.headers['retry-after'], 10);

    if (!isNaN(value)) {
      return value;
    }
  }

  return undefined;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic
 *
 * @param fn - The async function to execute
 * @param options - Retry options (uses shared options if not provided)
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const opts: Required<RetryOptions> = {
    ...sharedRetryOptions,
    ...options,
  };

  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt >= opts.maxRetries) {
        break;
      }

      // Don't retry non-transient errors
      if (!isTransientError(error)) {
        break;
      }

      // Calculate delay
      const retryAfter = extractRetryAfter(error);
      const delay = calculateDelay(attempt, opts, retryAfter);

      const rateLimitSuffix = isRateLimitError(error) ? ' (rate limited)' : '';
      const message =
        `Request failed (attempt ${attempt + 1}/${opts.maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms...${rateLimitSuffix}`;

      if (sharedLogger) {
        sharedLogger('Warn', message);
      } else {
        // Fallback to console.warn if no logger configured
        // eslint-disable-next-line no-console
        console.warn(`[AirtableDataSource] ${message}`);
      }

      // eslint-disable-next-line no-await-in-loop
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Create a retry wrapper for a specific function
 */
export function createRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options?: RetryOptions,
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => withRetry(() => fn(...args), options);
}
