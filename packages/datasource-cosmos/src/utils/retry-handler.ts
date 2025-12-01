/**
 * Retry handler for Cosmos DB rate limiting (429 errors)
 *
 * Cosmos DB returns 429 (Too Many Requests) when RU/s limits are exceeded.
 * The response includes a 'x-ms-retry-after-ms' header indicating how long to wait.
 * This handler implements exponential backoff with respect to Cosmos DB's retry-after hints.
 */

export interface RetryOptions {
  /**
   * Maximum number of retry attempts
   * Default: 9 (aligns with Azure SDK default)
   */
  maxRetries?: number;

  /**
   * Initial delay in milliseconds before first retry
   * Default: 1000 (1 second)
   */
  initialDelayMs?: number;

  /**
   * Maximum delay in milliseconds between retries
   * Default: 30000 (30 seconds)
   */
  maxDelayMs?: number;

  /**
   * Multiplier for exponential backoff
   * Default: 2
   */
  backoffMultiplier?: number;

  /**
   * Add random jitter to prevent thundering herd
   * Default: true
   */
  useJitter?: boolean;

  /**
   * Optional callback for retry events (useful for logging/monitoring)
   */
  onRetry?: (attempt: number, delayMs: number, error: Error) => void;
}

export interface RetryableError extends Error {
  code?: number | string;
  headers?: {
    'x-ms-retry-after-ms'?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Default retry configuration
 */
const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 9,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  useJitter: true,
};

/**
 * Check if an error is a retryable rate limit error (429)
 */
export function isRateLimitError(error: unknown): error is RetryableError {
  if (!error || typeof error !== 'object') return false;

  const err = error as RetryableError;

  // Check for Cosmos DB 429 error code
  if (err.code === 429) return true;

  // Check message for rate limiting indicators
  if (err.message?.includes('429') || err.message?.toLowerCase().includes('too many requests')) {
    return true;
  }

  // Check for TooManyRequests in error name or message
  if (err.name === 'TooManyRequests' || err.message?.includes('TooManyRequests')) {
    return true;
  }

  return false;
}

/**
 * Check if an error is a retryable transient error (e.g., network issues, service unavailable)
 */
export function isTransientError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const err = error as RetryableError;
  const { code } = err;

  // Service unavailable (503), Gateway timeout (504), Request timeout (408)
  if (code === 503 || code === 504 || code === 408) return true;

  // Network-related errors
  if (
    err.message?.includes('ECONNRESET') ||
    err.message?.includes('ETIMEDOUT') ||
    err.message?.includes('ENOTFOUND') ||
    err.message?.includes('socket hang up')
  ) {
    return true;
  }

  return false;
}

/**
 * Extract retry-after delay from Cosmos DB error response
 */
export function getRetryAfterMs(error: RetryableError): number | null {
  // Check for x-ms-retry-after-ms header (Cosmos DB specific)
  const retryAfterMs = error.headers?.['x-ms-retry-after-ms'];

  if (retryAfterMs) {
    const parsed = parseInt(retryAfterMs, 10);

    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Check for standard Retry-After header (in seconds)
  const retryAfter = error.headers?.['retry-after'];

  if (retryAfter) {
    const parsed = parseInt(retryAfter, 10);

    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed * 1000; // Convert to milliseconds
    }
  }

  return null;
}

/**
 * Calculate delay for the next retry attempt using exponential backoff
 */
export function calculateBackoffDelay(
  attempt: number,
  options: Required<Omit<RetryOptions, 'onRetry'>>,
  retryAfterMs?: number | null,
): number {
  // If Cosmos DB specified a retry-after delay, use it as the base
  if (retryAfterMs && retryAfterMs > 0) {
    // Add a small buffer to the Cosmos DB suggested delay
    const bufferedDelay = Math.min(retryAfterMs * 1.1, options.maxDelayMs);

    if (options.useJitter) {
      // Add up to 20% jitter
      const jitter = Math.random() * 0.2 * bufferedDelay;

      return Math.min(bufferedDelay + jitter, options.maxDelayMs);
    }

    return bufferedDelay;
  }

  // Calculate exponential backoff: initialDelay * (multiplier ^ attempt)
  const exponentialDelay = options.initialDelayMs * options.backoffMultiplier ** attempt;
  const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

  if (options.useJitter) {
    // Add jitter: randomize between 50% and 100% of the delay
    const jitterMin = cappedDelay * 0.5;
    const jitterMax = cappedDelay;

    return jitterMin + Math.random() * (jitterMax - jitterMin);
  }

  return cappedDelay;
}

/**
 * Sleep for the specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

/**
 * Execute an async operation with retry logic for rate limiting
 *
 * @param operation The async operation to execute
 * @param options Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries are exhausted
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => container.items.create(item),
 *   { maxRetries: 5, onRetry: (attempt, delay) => console.log(`Retry ${attempt}`) }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: RetryOptions,
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop -- Sequential retry logic
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRateLimit = isRateLimitError(error);
      const isTransient = isTransientError(error);

      if (!isRateLimit && !isTransient) {
        // Non-retryable error, throw immediately
        throw error;
      }

      // Check if we've exhausted retries
      if (attempt >= config.maxRetries) {
        throw new Error(
          `Operation failed after ${config.maxRetries} retries. Last error: ${lastError.message}`,
        );
      }

      // Calculate delay for next retry
      const retryAfterMs = isRateLimit ? getRetryAfterMs(error as RetryableError) : null;
      const delayMs = calculateBackoffDelay(attempt, config, retryAfterMs);

      // Call onRetry callback if provided
      if (options?.onRetry) {
        options.onRetry(attempt + 1, delayMs, lastError);
      }

      // Wait before retrying
      // eslint-disable-next-line no-await-in-loop -- Required for retry delay
      await sleep(delayMs);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed unexpectedly');
}

/**
 * Create a retry wrapper with pre-configured options
 *
 * @param defaultOptions Default retry options to use
 * @returns A withRetry function with the default options applied
 *
 * @example
 * ```typescript
 * const retryWithDefaults = createRetryWrapper({ maxRetries: 5 });
 * const result = await retryWithDefaults(() => container.items.create(item));
 * ```
 */
export function createRetryWrapper(
  defaultOptions: RetryOptions,
): <T>(operation: () => Promise<T>, overrideOptions?: RetryOptions) => Promise<T> {
  return <T>(operation: () => Promise<T>, overrideOptions?: RetryOptions) =>
    withRetry(operation, { ...defaultOptions, ...overrideOptions });
}

/**
 * Shared retry options instance for all models
 * This allows centralized configuration of retry behavior
 */
let sharedRetryOptions: RetryOptions = {};

/**
 * Configure the shared retry options for all Cosmos DB operations
 * @param options Retry configuration
 */
export function configureRetryOptions(options: RetryOptions): void {
  sharedRetryOptions = { ...options };
}

/**
 * Get the current shared retry options
 */
export function getSharedRetryOptions(): RetryOptions {
  return { ...sharedRetryOptions };
}
