/**
 * @forestadmin-experimental/datasource-stripe
 *
 * Forest Admin DataSource for Stripe
 */

import StripeDataSource from './datasource';
import { StripeDataSourceOptions } from './types';

// Export collection classes
export {
  BalanceTransactionsCollection,
  ChargesCollection,
  CustomersCollection,
  InvoicesCollection,
  PaymentIntentsCollection,
  PricesCollection,
  ProductsCollection,
  RefundsCollection,
  SubscriptionsCollection,
} from './collections';

// Export main classes
export { default as StripeCollection } from './collection';
export { default as StripeDataSource } from './datasource';

// Export types
export {
  RequiredStripeOptions,
  RetryOptions,
  StripeDataSourceError,
  StripeDataSourceOptions,
  StripeError,
  StripeFieldType,
  StripeListResponse,
  StripeRecord,
  StripeResourceMap,
  StripeResourceType,
} from './types';

// Export utilities
export {
  AMOUNT_FIELDS,
  BATCH_SIZE,
  configureLogger,
  configureRetryOptions,
  createRetryWrapper,
  dateToTimestamp,
  DEFAULT_PAGE_SIZE,
  DEFAULT_RETRY_OPTIONS,
  FILTER_OPERATORS,
  formatCurrencyAmount,
  getFilterOperators,
  getSharedRetryOptions,
  HTTP_STATUS,
  isRateLimitError,
  isReadOnlyField,
  isTransientError,
  mapFieldType,
  STRIPE_API_VERSION,
  SUPPORTED_RESOURCES,
  TIMESTAMP_FIELDS,
  timestampToDate,
  toCurrencyAmount,
  withRetry,
  ZERO_DECIMAL_CURRENCIES,
} from './utils';

/**
 * Factory function to create a Stripe DataSource
 *
 * @param options - Configuration options
 * @returns DataSource factory function for Forest Admin
 *
 * @example
 * // Basic usage
 * agent.addDataSource(createStripeDataSource());
 *
 * @example
 * // With configuration options
 * agent.addDataSource(createStripeDataSource({
 *   secretKey: 'sk_test_xxxxx',
 *   excludeResources: ['balance_transactions'],
 * }));
 */
export function createStripeDataSource(
  options: StripeDataSourceOptions = {},
): () => Promise<StripeDataSource> {
  return async () => {
    const dataSource = new StripeDataSource(options);
    await dataSource.initialize();

    return dataSource;
  };
}
