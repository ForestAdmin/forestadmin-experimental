/**
 * Type conversion utilities for Stripe to Forest Admin
 */

import { ColumnType, Operator } from '@forestadmin/datasource-toolkit';

import { StripeFieldType } from '../types';

/**
 * Common filter operators for different field types
 */
export const FILTER_OPERATORS: Record<string, Set<Operator>> = {
  string: new Set<Operator>([
    'Equal',
    'NotEqual',
    'In',
    'NotIn',
    'Contains',
    'StartsWith',
    'EndsWith',
  ]),
  number: new Set<Operator>([
    'Equal',
    'NotEqual',
    'GreaterThan',
    'LessThan',
    'GreaterThanOrEqual',
    'LessThanOrEqual',
    'In',
    'NotIn',
  ]),
  boolean: new Set<Operator>(['Equal', 'NotEqual']),
  date: new Set<Operator>([
    'Equal',
    'NotEqual',
    'GreaterThan',
    'LessThan',
    'GreaterThanOrEqual',
    'LessThanOrEqual',
  ]),
  enum: new Set<Operator>(['Equal', 'NotEqual', 'In', 'NotIn']),
  json: new Set<Operator>([]),
};

/**
 * Map Stripe field type to Forest Admin column type
 */
export function mapFieldType(stripeType: StripeFieldType): ColumnType {
  const typeMap: Record<StripeFieldType, ColumnType> = {
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
 */
export function getFilterOperators(stripeType: StripeFieldType): Set<Operator> {
  const operatorMap: Record<StripeFieldType, Set<Operator>> = {
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
 */
export function isReadOnlyField(fieldName: string, resourceType: string): boolean {
  // Common read-only fields across all resources
  const commonReadOnly = ['id', 'object', 'created', 'updated', 'livemode'];

  if (commonReadOnly.includes(fieldName)) {
    return true;
  }

  // Resource-specific read-only fields
  const resourceReadOnlyFields: Record<string, string[]> = {
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
