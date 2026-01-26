/**
 * BalanceTransactionsCollection - Stripe Balance Transactions resource
 */

import StripeCollection from '../stripe-collection';
import { getFilterOperators } from '../field-mapper';

/**
 * Collection for Stripe Balance Transactions
 * https://stripe.com/docs/api/balance_transactions
 *
 * Note: Balance transactions are read-only in Stripe.
 * They are created automatically when money moves in or out of your Stripe account.
 */
class BalanceTransactionsCollection extends StripeCollection {
  constructor(dataSource, stripe) {
    super('Stripe Balance Transactions', dataSource, stripe, 'balance_transactions');

    this._registerFields();
  }

  /**
   * Register all fields for the Balance Transactions collection
   */
  _registerFields() {
    // Primary key
    this.addField('id', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: true,
      isReadOnly: true,
      filterOperators: new Set(['Equal', 'NotEqual', 'In', 'NotIn']),
      isSortable: false,
    });

    // Amount and currency
    this.addField('amount', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('currency', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('net', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('fee', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    // Fee details (as JSON)
    this.addField('fee_details', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Type of transaction
    this.addField('type', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: [
        'adjustment',
        'advance',
        'advance_funding',
        'anticipation_repayment',
        'application_fee',
        'application_fee_refund',
        'charge',
        'connect_collection_transfer',
        'contribution',
        'issuing_authorization_hold',
        'issuing_authorization_release',
        'issuing_dispute',
        'issuing_transaction',
        'obligation_inbound',
        'obligation_outbound',
        'obligation_reversal_inbound',
        'obligation_reversal_outbound',
        'obligation_payout',
        'obligation_payout_failure',
        'payment',
        'payment_failure_refund',
        'payment_refund',
        'payment_reversal',
        'payout',
        'payout_cancel',
        'payout_failure',
        'refund',
        'refund_failure',
        'reserve_transaction',
        'reserved_funds',
        'stripe_fee',
        'stripe_fx_fee',
        'tax_fee',
        'topup',
        'topup_reversal',
        'transfer',
        'transfer_cancel',
        'transfer_failure',
        'transfer_refund',
      ],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Status
    this.addField('status', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['available', 'pending'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Description
    this.addField('description', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Source and reporting
    this.addField('source', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('reporting_category', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Availability
    this.addField('available_on', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: true,
    });

    // Exchange rate (for multi-currency)
    this.addField('exchange_rate', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: false,
    });

    // Timestamps
    this.addField('created', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: true,
    });

    // System fields
    this.addField('object', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });
  }

  /**
   * Override create - Balance transactions cannot be created directly
   */
  async create() {
    throw new Error(
      'Balance transactions cannot be created directly. ' +
      'They are created automatically when money moves in your Stripe account.'
    );
  }

  /**
   * Override update - Balance transactions cannot be modified
   */
  async update() {
    throw new Error('Balance transactions are read-only and cannot be modified.');
  }

  /**
   * Override delete - Balance transactions cannot be deleted
   */
  async delete() {
    throw new Error('Balance transactions cannot be deleted.');
  }
}

export default BalanceTransactionsCollection;
