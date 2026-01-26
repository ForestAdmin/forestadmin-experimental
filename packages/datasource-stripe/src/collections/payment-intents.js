/**
 * PaymentIntentsCollection - Stripe PaymentIntents resource
 */

import { getFilterOperators } from '../field-mapper';
import StripeCollection from '../stripe-collection';

/**
 * Collection for Stripe Payment Intents
 * https://stripe.com/docs/api/payment_intents
 */
class PaymentIntentsCollection extends StripeCollection {
  constructor(dataSource, stripe) {
    super('Stripe Payment Intents', dataSource, stripe, 'payment_intents');

    this._registerFields();
  }

  /**
   * Register all fields for the PaymentIntents collection
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

    this.addField('amount_received', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('currency', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Status
    this.addField('status', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: [
        'requires_payment_method',
        'requires_confirmation',
        'requires_action',
        'processing',
        'requires_capture',
        'canceled',
        'succeeded',
      ],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Customer
    this.addField('customer', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Description
    this.addField('description', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Payment method
    this.addField('payment_method', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('payment_method_types', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Capture
    this.addField('capture_method', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['automatic', 'automatic_async', 'manual'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    this.addField('amount_capturable', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: false,
    });

    // Confirmation
    this.addField('confirmation_method', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['automatic', 'manual'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Cancellation
    this.addField('canceled_at', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    this.addField('cancellation_reason', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: [
        'duplicate',
        'fraudulent',
        'requested_by_customer',
        'abandoned',
        'failed_invoice',
        'void_invoice',
        'automatic',
      ],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Client secret (partially masked for security)
    this.addField('client_secret', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Receipt
    this.addField('receipt_email', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('statement_descriptor', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Related resources
    this.addField('invoice', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('latest_charge', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Shipping (as JSON)
    this.addField('shipping', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
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

    this.addField('livemode', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });
  }

  /**
   * Override _transformToStripe to handle payment intent-specific fields
   */
  // eslint-disable-next-line no-underscore-dangle
  _transformToStripe(record) {
    const data = super._transformToStripe(record);

    // Remove read-only fields
    delete data.status;
    delete data.amount_received;
    delete data.amount_capturable;
    delete data.canceled_at;
    delete data.cancellation_reason;
    delete data.client_secret;
    delete data.invoice;
    delete data.latest_charge;

    return data;
  }

  /**
   * Override delete - Cancels the payment intent instead of deleting
   */
  async delete(caller, filter) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    for (const record of records) {
      // Only cancel if not already in a terminal state
      if (!['succeeded', 'canceled'].includes(record.status)) {
        // eslint-disable-next-line no-await-in-loop
        await this.stripe.paymentIntents.cancel(record.id);
      }
    }
  }
}

export default PaymentIntentsCollection;
