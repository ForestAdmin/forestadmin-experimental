/**
 * Field type mapping utilities for Stripe to Forest Admin
 */

/**
 * Common filter operators for different field types
 */
export const FILTER_OPERATORS = {
  string: new Set(['Equal', 'NotEqual', 'In', 'NotIn', 'Contains', 'StartsWith', 'EndsWith']),
  number: new Set([
    'Equal',
    'NotEqual',
    'GreaterThan',
    'LessThan',
    'GreaterThanOrEqual',
    'LessThanOrEqual',
    'In',
    'NotIn',
  ]),
  boolean: new Set(['Equal', 'NotEqual']),
  date: new Set([
    'Equal',
    'NotEqual',
    'GreaterThan',
    'LessThan',
    'GreaterThanOrEqual',
    'LessThanOrEqual',
  ]),
  enum: new Set(['Equal', 'NotEqual', 'In', 'NotIn']),
  json: new Set([]),
};

/**
 * Map Stripe field type to Forest Admin column type
 * @param {string} stripeType - Stripe field type
 * @returns {string} Forest Admin column type
 */
export function mapFieldType(stripeType) {
  const typeMap = {
    string: 'String',
    number: 'Number',
    integer: 'Number',
    boolean: 'Boolean',
    timestamp: 'Date',
    enum: 'Enum',
    json: 'Json',
    array: 'Json',
    object: 'Json',
  };

  return typeMap[stripeType] || 'String';
}

/**
 * Get filter operators for a field type
 * @param {string} stripeType - Stripe field type
 * @returns {Set<string>} Set of supported filter operators
 */
export function getFilterOperators(stripeType) {
  const operatorMap = {
    string: FILTER_OPERATORS.string,
    number: FILTER_OPERATORS.number,
    integer: FILTER_OPERATORS.number,
    boolean: FILTER_OPERATORS.boolean,
    timestamp: FILTER_OPERATORS.date,
    enum: FILTER_OPERATORS.enum,
    json: FILTER_OPERATORS.json,
    array: FILTER_OPERATORS.json,
    object: FILTER_OPERATORS.json,
  };

  return operatorMap[stripeType] || FILTER_OPERATORS.string;
}

/**
 * Check if a field is read-only
 * @param {string} fieldName - Field name
 * @param {string} resourceType - Stripe resource type
 * @returns {boolean} Whether the field is read-only
 */
export function isReadOnlyField(fieldName, resourceType) {
  // Common read-only fields across all resources
  const commonReadOnly = ['id', 'object', 'created', 'updated', 'livemode'];

  if (commonReadOnly.includes(fieldName)) {
    return true;
  }

  // Resource-specific read-only fields
  const resourceReadOnlyFields = {
    customers: ['balance', 'delinquent', 'invoice_prefix', 'next_invoice_sequence'],
    subscriptions: [
      'latest_invoice',
      'current_period_start',
      'current_period_end',
      'status',
      'start_date',
      'ended_at',
    ],
    invoices: [
      'amount_due',
      'amount_paid',
      'amount_remaining',
      'status',
      'number',
      'hosted_invoice_url',
      'invoice_pdf',
    ],
    payment_intents: ['amount_received', 'status', 'client_secret'],
    charges: ['amount_captured', 'amount_refunded', 'status', 'receipt_url'],
    products: [],
    prices: ['type'],
  };

  const readOnlyFields = resourceReadOnlyFields[resourceType] || [];

  return readOnlyFields.includes(fieldName);
}

/**
 * Convert Unix timestamp to Date
 * @param {number} timestamp - Unix timestamp in seconds
 * @returns {Date|null} JavaScript Date object or null
 */
export function timestampToDate(timestamp) {
  if (timestamp == null) return null;

  return new Date(timestamp * 1000);
}

/**
 * Convert Date to Unix timestamp
 * @param {Date|string} date - Date object or ISO string
 * @returns {number|null} Unix timestamp in seconds or null
 */
export function dateToTimestamp(date) {
  if (date == null) return null;

  const d = date instanceof Date ? date : new Date(date);

  return Math.floor(d.getTime() / 1000);
}

/**
 * Format currency amount from cents to decimal
 * @param {number} amount - Amount in cents
 * @param {string} currency - Currency code (e.g., 'usd')
 * @returns {number} Amount in decimal format
 */
export function formatCurrencyAmount(amount, currency) {
  // Zero-decimal currencies (amount is already in whole units)
  const zeroDecimalCurrencies = [
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
  ];

  if (zeroDecimalCurrencies.includes(currency?.toLowerCase())) {
    return amount;
  }

  return amount / 100;
}

/**
 * Convert decimal amount to cents
 * @param {number} amount - Amount in decimal format
 * @param {string} currency - Currency code (e.g., 'usd')
 * @returns {number} Amount in cents
 */
export function toCurrencyAmount(amount, currency) {
  const zeroDecimalCurrencies = [
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
  ];

  if (zeroDecimalCurrencies.includes(currency?.toLowerCase())) {
    return Math.round(amount);
  }

  return Math.round(amount * 100);
}
