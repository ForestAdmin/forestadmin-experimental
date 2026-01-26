/**
 * @forestadmin/datasource-stripe
 *
 * Forest Admin DataSource for Stripe
 */

import StripeDataSource from './stripe-datasource';
import StripeCollection from './stripe-collection';
import {
  DEFAULT_PAGE_SIZE,
  BATCH_SIZE,
  STRIPE_API_VERSION,
  SUPPORTED_RESOURCES,
} from './constants';
import {
  mapFieldType,
  getFilterOperators,
  isReadOnlyField,
  timestampToDate,
  dateToTimestamp,
  formatCurrencyAmount,
  toCurrencyAmount,
  FILTER_OPERATORS,
} from './field-mapper';

// Import all collection classes
import {
  CustomersCollection,
  ProductsCollection,
  PricesCollection,
  SubscriptionsCollection,
  InvoicesCollection,
  PaymentIntentsCollection,
  ChargesCollection,
  RefundsCollection,
  BalanceTransactionsCollection,
} from './collections';

/**
 * Factory function to create a Stripe DataSource
 *
 * @param {Object} options - Configuration options
 * @returns {Function} DataSource factory function for Forest Admin
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
function createStripeDataSource(options = {}) {
  return async () => {
    const dataSource = new StripeDataSource(options);
    await dataSource.initialize();
    return dataSource;
  };
}

export {
  // Main exports
  createStripeDataSource,
  StripeDataSource,
  StripeCollection,

  // Collection classes
  CustomersCollection,
  ProductsCollection,
  PricesCollection,
  SubscriptionsCollection,
  InvoicesCollection,
  PaymentIntentsCollection,
  ChargesCollection,
  RefundsCollection,
  BalanceTransactionsCollection,

  // Constants
  DEFAULT_PAGE_SIZE,
  BATCH_SIZE,
  STRIPE_API_VERSION,
  SUPPORTED_RESOURCES,

  // Field mapping utilities
  mapFieldType,
  getFilterOperators,
  isReadOnlyField,
  timestampToDate,
  dateToTimestamp,
  formatCurrencyAmount,
  toCurrencyAmount,
  FILTER_OPERATORS,
};
