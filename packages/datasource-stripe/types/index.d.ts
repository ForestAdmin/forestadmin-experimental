/**
 * Type definitions for @forestadmin/datasource-stripe
 */

import { BaseCollection, BaseDataSource } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

// =============================================================================
// Configuration Option Types
// =============================================================================

/**
 * Supported Stripe resource types
 */
export type StripeResourceType =
  | 'customers'
  | 'products'
  | 'prices'
  | 'subscriptions'
  | 'invoices'
  | 'payment_intents'
  | 'charges'
  | 'refunds'
  | 'payment_methods'
  | 'balance_transactions';

/**
 * StripeDataSource configuration options
 */
export interface StripeDataSourceOptions {
  /**
   * Stripe Secret API Key
   * If not provided, reads from STRIPE_SECRET_KEY environment variable
   */
  secretKey?: string;

  /**
   * Stripe API version
   * @default '2023-10-16'
   */
  apiVersion?: string;

  /**
   * Only include specified resources
   * If null, includes all supported resources
   */
  includeResources?: StripeResourceType[] | null;

  /**
   * Exclude specified resources
   */
  excludeResources?: StripeResourceType[];
}

// =============================================================================
// Main Classes
// =============================================================================

/**
 * StripeCollection - Base class for Stripe resource collections
 */
export declare class StripeCollection extends BaseCollection {
  readonly stripe: Stripe;
  readonly resourceName: string;

  constructor(
    name: string,
    dataSource: StripeDataSource,
    stripe: Stripe,
    resourceName: string
  );
}

/**
 * StripeDataSource - Stripe data source
 */
export declare class StripeDataSource extends BaseDataSource {
  readonly secretKey: string;
  readonly options: Required<StripeDataSourceOptions>;
  readonly stripe: Stripe;

  constructor(options?: StripeDataSourceOptions);

  /**
   * Initialize the datasource, connect to Stripe and register collections
   */
  initialize(): Promise<void>;
}

// =============================================================================
// Collection Classes
// =============================================================================

export declare class CustomersCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class ProductsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class PricesCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class SubscriptionsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class InvoicesCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class PaymentIntentsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class ChargesCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class RefundsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

export declare class BalanceTransactionsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe);
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Factory function to create a Stripe DataSource
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
export declare function createStripeDataSource(
  options?: StripeDataSourceOptions
): () => Promise<StripeDataSource>;

// =============================================================================
// Constants
// =============================================================================

export declare const DEFAULT_PAGE_SIZE: number;
export declare const BATCH_SIZE: number;
export declare const STRIPE_API_VERSION: string;
export declare const SUPPORTED_RESOURCES: StripeResourceType[];

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Maps internal field type to Forest Admin field type
 */
export declare function mapFieldType(stripeType: string): string;

/**
 * Gets supported filter operators for a field type
 */
export declare function getFilterOperators(stripeType: string): Set<string>;

/**
 * Checks if a field is read-only
 */
export declare function isReadOnlyField(fieldName: string, resourceType: string): boolean;

/**
 * Convert Unix timestamp to Date
 */
export declare function timestampToDate(timestamp: number): Date | null;

/**
 * Convert Date to Unix timestamp
 */
export declare function dateToTimestamp(date: Date | string): number | null;

/**
 * Format currency amount from cents to decimal
 */
export declare function formatCurrencyAmount(amount: number, currency: string): number;

/**
 * Convert decimal amount to cents
 */
export declare function toCurrencyAmount(amount: number, currency: string): number;

/**
 * Filter operators by field type
 */
export declare const FILTER_OPERATORS: {
  string: Set<string>;
  number: Set<string>;
  boolean: Set<string>;
  date: Set<string>;
  enum: Set<string>;
  json: Set<string>;
};
