/**
 * RefundsCollection - Stripe Refunds resource
 */

import StripeCollection from '../stripe-collection';
import { getFilterOperators } from '../field-mapper';

/**
 * Collection for Stripe Refunds
 * https://stripe.com/docs/api/refunds
 */
class RefundsCollection extends StripeCollection {
  constructor(dataSource, stripe) {
    super('Stripe Refunds', dataSource, stripe, 'refunds');

    this._registerFields();
  }

  /**
   * Register all fields for the Refunds collection
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
      isReadOnly: false,
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

    // Status
    this.addField('status', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['pending', 'requires_action', 'succeeded', 'failed', 'canceled'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Reason
    this.addField('reason', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['duplicate', 'fraudulent', 'requested_by_customer', 'expired_uncaptured_charge'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Related charge
    this.addField('charge', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('payment_intent', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Balance transaction
    this.addField('balance_transaction', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Receipt
    this.addField('receipt_number', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Failure info
    this.addField('failure_reason', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['lost_or_stolen_card', 'expired_or_canceled_card', 'unknown'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    this.addField('failure_balance_transaction', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Instructions email
    this.addField('instructions_email', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
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

    // Metadata
    this.addField('metadata', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
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
   * Override _transformToStripe for refund creation
   */
  _transformToStripe(record) {
    const data = super._transformToStripe(record);

    // Remove read-only fields
    delete data.status;
    delete data.currency;
    delete data.balance_transaction;
    delete data.receipt_number;
    delete data.failure_reason;
    delete data.failure_balance_transaction;

    return data;
  }

  /**
   * Override delete - Cancel the refund
   */
  async delete(caller, filter) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    for (const record of records) {
      // Only pending refunds can be canceled
      if (record.status === 'pending' || record.status === 'requires_action') {
        // eslint-disable-next-line no-await-in-loop
        await this.stripe.refunds.cancel(record.id);
      }
    }
  }
}

export default RefundsCollection;
