/**
 * StripeDataSource - Forest Admin DataSource implementation for Stripe
 */

import { BaseDataSource, Logger } from '@forestadmin/datasource-toolkit';
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
import StripeCollection from './collection';
import { RequiredStripeOptions, StripeDataSourceOptions, StripeResourceType } from './types';
import {
  configureLogger,
  configureRetryOptions,
  DEFAULT_RETRY_OPTIONS,
  STRIPE_API_VERSION,
  SUPPORTED_RESOURCES,
} from './utils';

/**
 * StripeDataSource - Main datasource class
 *
 * Provides access to Stripe resources as Forest Admin collections
 */
export default class StripeDataSource extends BaseDataSource {
  private readonly secretKey: string;
  private readonly options: RequiredStripeOptions;
  private stripe: Stripe | null = null;
  private readonly logger?: Logger;

  constructor(options: StripeDataSourceOptions = {}) {
    super();

    const secretKey = options.secretKey || process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error(
        'Stripe Secret Key is required. ' +
          'Set STRIPE_SECRET_KEY environment variable or pass secretKey in options.',
      );
    }

    this.secretKey = secretKey;
    this.logger = options.logger;

    this.options = {
      secretKey,
      apiVersion: options.apiVersion || (STRIPE_API_VERSION as Stripe.LatestApiVersion),
      includeResources: options.includeResources || null,
      excludeResources: options.excludeResources || [],
      retryOptions: {
        ...DEFAULT_RETRY_OPTIONS,
        ...options.retryOptions,
      },
      logger: options.logger,
    };

    // Configure shared retry options and logger
    configureRetryOptions(this.options.retryOptions);
    configureLogger(this.logger);
  }

  /**
   * Check if a resource should be included
   */
  private shouldIncludeResource(resourceName: StripeResourceType): boolean {
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
   */
  private createCollection(resourceName: StripeResourceType): StripeCollection | null {
    if (!this.stripe) {
      return null;
    }

    const collectionMap: Record<
      StripeResourceType,
      new (dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) => StripeCollection
    > = {
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
      this.log('Warn', `Unknown resource type: ${resourceName}`);

      return null;
    }

    return new CollectionClass(this, this.stripe, this.logger);
  }

  /**
   * Initialize the datasource - create Stripe client and register collections
   */
  async initialize(): Promise<void> {
    // Initialize Stripe client
    this.stripe = new Stripe(this.secretKey, {
      apiVersion: this.options.apiVersion,
    });

    this.log('Info', 'Initializing...');

    // Verify connection by fetching account info
    try {
      const account = await this.stripe.accounts.retrieve();
      this.log('Info', `Connected to Stripe account: ${account.id}`);
    } catch (error) {
      this.log('Error', `Failed to connect to Stripe: ${(error as Error).message}`);
      throw error;
    }

    // Register collections for each supported resource
    for (const resourceName of SUPPORTED_RESOURCES) {
      if (!this.shouldIncludeResource(resourceName)) {
        this.log('Info', `Skipping resource: ${resourceName}`);
         
        continue;
      }

      this.log('Info', `Adding collection for: ${resourceName}`);

      const collection = this.createCollection(resourceName);

      if (collection) {
        this.addCollection(collection);
      }
    }

    // Register relationships between collections
    this.registerRelationships();

    this.log('Info', `Initialized with ${this.collections.length} collection(s)`);
  }

  /**
   * Register relationships between Stripe collections
   * Only OneToMany relationships as requested:
   *
   * Customer (1) → (N) Invoices, Subscriptions, Charges, PaymentIntents
   * Invoice (1) → (N) Charges, PaymentIntents
   * PaymentIntent (1) → (N) Refunds, Charges
   * Charge (1) → (N) Refunds
   * Product (1) → (N) Prices
   */
  private registerRelationships(): void {
    // Get collections as StripeCollection (may not exist if excluded)
    const customers = this.collections.find(c => c.name === 'Stripe Customers') as
      | StripeCollection
      | undefined;
    const invoices = this.collections.find(c => c.name === 'Stripe Invoices') as
      | StripeCollection
      | undefined;
    const paymentIntents = this.collections.find(c => c.name === 'Stripe Payment Intents') as
      | StripeCollection
      | undefined;
    const refunds = this.collections.find(c => c.name === 'Stripe Refunds') as
      | StripeCollection
      | undefined;
    const subscriptions = this.collections.find(c => c.name === 'Stripe Subscriptions') as
      | StripeCollection
      | undefined;
    const charges = this.collections.find(c => c.name === 'Stripe Charges') as
      | StripeCollection
      | undefined;
    const products = this.collections.find(c => c.name === 'Stripe Products') as
      | StripeCollection
      | undefined;
    const prices = this.collections.find(c => c.name === 'Stripe Prices') as
      | StripeCollection
      | undefined;

    // Customer (1) → (N) Invoices, Subscriptions, Charges, PaymentIntents
    if (customers && invoices) {
      customers.addOneToManyRelation('invoices', 'Stripe Invoices', 'customer');
    }

    if (customers && subscriptions) {
      customers.addOneToManyRelation('subscriptions', 'Stripe Subscriptions', 'customer');
    }

    if (customers && charges) {
      customers.addOneToManyRelation('charges', 'Stripe Charges', 'customer');
    }

    if (customers && paymentIntents) {
      customers.addOneToManyRelation('paymentIntents', 'Stripe Payment Intents', 'customer');
    }

    // Invoice (1) → (N) Charges, PaymentIntents
    if (invoices && charges) {
      invoices.addOneToManyRelation('charges', 'Stripe Charges', 'invoice');
    }

    if (invoices && paymentIntents) {
      invoices.addOneToManyRelation('paymentIntents', 'Stripe Payment Intents', 'invoice');
    }

    // PaymentIntent (1) → (N) Refunds, Charges
    if (paymentIntents && refunds) {
      paymentIntents.addOneToManyRelation('refunds', 'Stripe Refunds', 'payment_intent');
    }

    if (paymentIntents && charges) {
      paymentIntents.addOneToManyRelation('charges', 'Stripe Charges', 'payment_intent');
    }

    // Charge (1) → (N) Refunds
    if (charges && refunds) {
      charges.addOneToManyRelation('refunds', 'Stripe Refunds', 'charge');
    }

    // Product (1) → (N) Prices
    if (products && prices) {
      products.addOneToManyRelation('prices', 'Stripe Prices', 'product');
    }

    this.log('Info', 'Registered native relationships between collections');
  }

  /**
   * Get the Stripe client instance
   */
  getStripeClient(): Stripe | null {
    return this.stripe;
  }

  /**
   * Log a message using the logger or console
   */
  private log(level: 'Info' | 'Warn' | 'Error', message: string): void {
    const fullMessage = `StripeDataSource - ${message}`;

    if (this.logger) {
      this.logger(level, fullMessage);
    } else {
      const logFn =
        level === 'Error' ? console.error : level === 'Warn' ? console.warn : console.info;
      logFn(`[${fullMessage}]`);
    }
  }
}
