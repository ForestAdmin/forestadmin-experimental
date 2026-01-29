/**
 * Constants for Stripe DataSource
 */

import { RetryOptions, StripeResourceType } from '../types';

/**
 * Default page size for list operations
 */
export const DEFAULT_PAGE_SIZE = 100;

/**
 * Maximum records per batch operation
 */
export const BATCH_SIZE = 100;

/**
 * Stripe API version
 */
export const STRIPE_API_VERSION = '2023-10-16' as const;

/**
 * Resource types supported by this datasource
 */
export const SUPPORTED_RESOURCES: StripeResourceType[] = [
  'customers',
  'products',
  'prices',
  'subscriptions',
  'invoices',
  'payment_intents',
  'charges',
  'refunds',
  'balance_transactions',
];

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Zero-decimal currencies (amount is already in whole units)
 */
export const ZERO_DECIMAL_CURRENCIES = [
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
];
