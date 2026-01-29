/**
 * Configuration types for Stripe DataSource
 */

import { Logger } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import { StripeResourceType } from './stripe';

/**
 * Retry options for rate limiting and transient errors
 */
export interface RetryOptions {
  /** Maximum number of retries (default: 3) */
  maxRetries?: number;

  /** Initial delay in milliseconds (default: 1000) */
  initialDelayMs?: number;

  /** Maximum delay in milliseconds (default: 30000) */
  maxDelayMs?: number;

  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;

  /** Whether to add jitter to delays (default: true) */
  jitter?: boolean;
}

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
  apiVersion?: Stripe.LatestApiVersion;

  /**
   * Only include specified resources
   * If null or undefined, includes all supported resources
   */
  includeResources?: StripeResourceType[] | null;

  /**
   * Exclude specified resources
   */
  excludeResources?: StripeResourceType[];

  /**
   * Retry options for rate limiting
   */
  retryOptions?: RetryOptions;

  /**
   * Logger function from Forest Admin
   */
  logger?: Logger;
}

/**
 * Required version of stripe options (with defaults applied)
 */
export interface RequiredStripeOptions {
  secretKey: string;
  apiVersion: Stripe.LatestApiVersion;
  includeResources: StripeResourceType[] | null;
  excludeResources: StripeResourceType[];
  retryOptions: Required<RetryOptions>;
  logger?: Logger;
}
