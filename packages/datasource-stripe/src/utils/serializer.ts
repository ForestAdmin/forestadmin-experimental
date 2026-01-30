/**
 * Data serialization utilities for Stripe
 */

import { ZERO_DECIMAL_CURRENCIES } from './constants';

/**
 * Convert Unix timestamp to Date
 */
export function timestampToDate(timestamp: number | null | undefined): Date | null {
  if (timestamp == null) {
    return null;
  }

  return new Date(timestamp * 1000);
}

/**
 * Convert Date to Unix timestamp
 */
export function dateToTimestamp(date: Date | string | null | undefined): number | null {
  if (date == null) {
    return null;
  }

  const d = date instanceof Date ? date : new Date(date);

  return Math.floor(d.getTime() / 1000);
}

/**
 * Format currency amount from cents to decimal
 */
export function formatCurrencyAmount(
  amount: number | null | undefined,
  currency?: string,
): number | null {
  if (amount == null) {
    return null;
  }

  // Zero-decimal currencies (amount is already in whole units)
  if (currency && ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase())) {
    return amount;
  }

  return amount / 100;
}

/**
 * Convert decimal amount to cents
 */
export function toCurrencyAmount(
  amount: number | null | undefined,
  currency?: string,
): number | null {
  if (amount == null) {
    return null;
  }

  if (currency && ZERO_DECIMAL_CURRENCIES.includes(currency.toLowerCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}

/**
 * List of timestamp fields that need conversion
 */
export const TIMESTAMP_FIELDS = [
  'created',
  'updated',
  'current_period_start',
  'current_period_end',
  'start_date',
  'ended_at',
  'canceled_at',
  'trial_start',
  'trial_end',
  'billing_cycle_anchor',
  'due_date',
  'period_start',
  'period_end',
  'available_on',
];

/**
 * List of amount fields that need conversion
 */
export const AMOUNT_FIELDS = [
  'amount',
  'amount_due',
  'amount_paid',
  'amount_remaining',
  'amount_captured',
  'amount_refunded',
  'amount_received',
  'amount_capturable',
  'subtotal',
  'total',
  'tax',
  'unit_amount',
  'balance',
  'fee',
  'net',
];
