/**
 * Stripe-specific type definitions
 */

import Stripe from 'stripe';

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
  | 'balance_transactions';

/**
 * Stripe resource name to SDK resource mapping
 */
export interface StripeResourceMap {
  customers: Stripe.CustomersResource;
  products: Stripe.ProductsResource;
  prices: Stripe.PricesResource;
  subscriptions: Stripe.SubscriptionsResource;
  invoices: Stripe.InvoicesResource;
  payment_intents: Stripe.PaymentIntentsResource;
  charges: Stripe.ChargesResource;
  refunds: Stripe.RefundsResource;
  balance_transactions: Stripe.BalanceTransactionsResource;
}

/**
 * Union type of all Stripe resources
 */
export type StripeResourceUnion = StripeResourceMap[StripeResourceType];

/**
 * Field type mapping for Stripe fields
 */
export type StripeFieldType =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'timestamp'
  | 'enum'
  | 'json'
  | 'array'
  | 'object';

/**
 * Stripe record with id
 */
export interface StripeRecord {
  id: string;
  [key: string]: unknown;
}

/**
 * Stripe list response
 */
export interface StripeListResponse<T> {
  data: T[];
  has_more: boolean;
  object: string;
}

/**
 * Stripe error response
 */
export interface StripeError {
  type: string;
  code?: string;
  message: string;
  statusCode?: number;
  status?: number;
}

/**
 * Custom error class for Stripe DataSource errors
 */
export class StripeDataSourceError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly isRetryable: boolean;
  public readonly originalError?: Error;

  constructor(
    message: string,
    code: string,
    options?: { statusCode?: number; isRetryable?: boolean; cause?: Error },
  ) {
    super(message);
    this.name = 'StripeDataSourceError';
    this.code = code;
    this.statusCode = options?.statusCode;
    this.isRetryable = options?.isRetryable ?? false;
    this.originalError = options?.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StripeDataSourceError);
    }
  }

  static fromStripeError(error: StripeError): StripeDataSourceError {
    const statusCode = error.statusCode ?? error.status;
    const isRetryable = statusCode === 429 || (statusCode !== undefined && statusCode >= 500);

    return new StripeDataSourceError(error.message, error.code ?? error.type, {
      statusCode,
      isRetryable,
    });
  }

  static notFound(resourceType: string, id: string): StripeDataSourceError {
    return new StripeDataSourceError(
      `${resourceType} with id '${id}' not found`,
      'resource_not_found',
      { statusCode: 404, isRetryable: false },
    );
  }

  static operationNotSupported(operation: string, resourceType: string): StripeDataSourceError {
    return new StripeDataSourceError(
      `${operation} operation is not supported for ${resourceType}`,
      'operation_not_supported',
      { statusCode: 400, isRetryable: false },
    );
  }

  static configurationError(message: string): StripeDataSourceError {
    return new StripeDataSourceError(message, 'configuration_error', {
      statusCode: 500,
      isRetryable: false,
    });
  }
}
