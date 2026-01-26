/**
 * Constants for Stripe DataSource
 */

// Default page size for list operations
export const DEFAULT_PAGE_SIZE = 100;

// Maximum records per batch operation
export const BATCH_SIZE = 100;

// Stripe API version (optional, uses account default if not set)
export const STRIPE_API_VERSION = '2023-10-16';

// Resource types supported by this datasource
export const SUPPORTED_RESOURCES = [
  'customers',
  'products',
  'prices',
  'subscriptions',
  'invoices',
  'payment_intents',
  'charges',
  'refunds',
  'payment_methods',
  'balance_transactions',
];
