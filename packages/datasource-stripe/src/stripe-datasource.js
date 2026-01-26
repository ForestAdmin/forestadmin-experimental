/**
 * StripeDataSource - Forest Admin DataSource implementation for Stripe
 */

import { BaseDataSource } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

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
import { STRIPE_API_VERSION, SUPPORTED_RESOURCES } from './constants';

/**
 * StripeDataSource - Main datasource class
 *
 * Provides access to Stripe resources as Forest Admin collections
 */
class StripeDataSource extends BaseDataSource {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.secretKey - Stripe Secret API Key (optional, defaults to env var)
   * @param {string} options.apiVersion - Stripe API version (optional)
   * @param {Array<string>} options.includeResources - Only include specified resources
   * @param {Array<string>} options.excludeResources - Exclude specified resources
   */
  constructor(options = {}) {
    super();

    this.secretKey = options.secretKey || process.env.STRIPE_SECRET_KEY;
    this.options = {
      apiVersion: options.apiVersion || STRIPE_API_VERSION,
      includeResources: options.includeResources || null,
      excludeResources: options.excludeResources || [],
      ...options,
    };

    this.stripe = null;
  }

  /**
   * Check if a resource should be included
   * @param {string} resourceName - Resource name
   * @returns {boolean} Whether to include the resource
   */
  _shouldIncludeResource(resourceName) {
    const { includeResources, excludeResources } = this.options;

    // Check exclusion list
    if (excludeResources.includes(resourceName)) {
      return false;
    }

    // Check inclusion list
    if (includeResources) {
      return includeResources.includes(resourceName);
    }

    return true;
  }

  /**
   * Create collection instance for a resource type
   * @param {string} resourceName - Stripe resource name
   * @returns {Object|null} Collection instance or null
   */
  _createCollection(resourceName) {
    const collectionMap = {
      customers: CustomersCollection,
      products: ProductsCollection,
      prices: PricesCollection,
      subscriptions: SubscriptionsCollection,
      invoices: InvoicesCollection,
      payment_intents: PaymentIntentsCollection,
      charges: ChargesCollection,
      refunds: RefundsCollection,
      balance_transactions: BalanceTransactionsCollection,
    };

    const CollectionClass = collectionMap[resourceName];

    if (!CollectionClass) {
      return null;
    }

    return new CollectionClass(this, this.stripe);
  }

  /**
   * Initialize the datasource - create Stripe client and register collections
   */
  async initialize() {
    if (!this.secretKey) {
      throw new Error(
        'Stripe Secret Key is required. ' +
          'Set STRIPE_SECRET_KEY environment variable or pass secretKey in options.',
      );
    }

    // Initialize Stripe client
    this.stripe = new Stripe(this.secretKey, {
      apiVersion: this.options.apiVersion,
    });

    // Verify connection by fetching account info
    await this.stripe.accounts.retrieve();

    // Store stripe client globally for actions
    global.stripeClient = this.stripe;

    // Register collections for each supported resource
    for (const resourceName of SUPPORTED_RESOURCES) {
      if (!this._shouldIncludeResource(resourceName)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const collection = this._createCollection(resourceName);

      if (collection) {
        this.addCollection(collection);
      }
    }
  }
}

export default StripeDataSource;
