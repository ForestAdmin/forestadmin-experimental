/**
 * StripeDataSource - Forest Admin DataSource implementation for Stripe
 */

const { BaseDataSource } = require('@forestadmin/datasource-toolkit');
const Stripe = require('stripe');

const { STRIPE_API_VERSION, SUPPORTED_RESOURCES } = require('./constants');
const {
  CustomersCollection,
  ProductsCollection,
  PricesCollection,
  SubscriptionsCollection,
  InvoicesCollection,
  PaymentIntentsCollection,
  ChargesCollection,
  RefundsCollection,
  BalanceTransactionsCollection,
} = require('./collections');

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
      console.warn(`[StripeDataSource] Unknown resource type: ${resourceName}`);
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
        'Set STRIPE_SECRET_KEY environment variable or pass secretKey in options.'
      );
    }

    // Initialize Stripe client
    this.stripe = new Stripe(this.secretKey, {
      apiVersion: this.options.apiVersion,
    });

    console.log('[StripeDataSource] Initializing...');

    // Verify connection by fetching account info
    try {
      const account = await this.stripe.accounts.retrieve();
      console.log(`[StripeDataSource] Connected to Stripe account: ${account.id}`);
    } catch (error) {
      console.error('[StripeDataSource] Failed to connect to Stripe:', error.message);
      throw error;
    }

    // Store stripe client globally for actions
    global.stripeClient = this.stripe;

    // Register collections for each supported resource
    for (const resourceName of SUPPORTED_RESOURCES) {
      if (!this._shouldIncludeResource(resourceName)) {
        console.log(`[StripeDataSource] Skipping resource: ${resourceName}`);
        continue;
      }

      console.log(`[StripeDataSource] Adding collection for: ${resourceName}`);

      const collection = this._createCollection(resourceName);
      if (collection) {
        this.addCollection(collection);
      }
    }

    console.log(`[StripeDataSource] Initialized with ${this.collections.length} collection(s)`);
  }
}

module.exports = StripeDataSource;
