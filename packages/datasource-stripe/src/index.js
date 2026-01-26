/**
 * @forestadmin/datasource-stripe
 *
 * Forest Admin DataSource for Stripe
 */

import {
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
import {
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
  STRIPE_API_VERSION,
  SUPPORTED_RESOURCES,
} from './constants';
import {
  dateToTimestamp,
  FILTER_OPERATORS,
  formatCurrencyAmount,
  getFilterOperators,
  isReadOnlyField,
  mapFieldType,
  timestampToDate,
  toCurrencyAmount,
} from './field-mapper';
import StripeCollection from './stripe-collection';
import StripeDataSource from './stripe-datasource';

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
