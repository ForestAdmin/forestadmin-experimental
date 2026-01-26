/**
 * ChargesCollection - Stripe Charges resource
 */

const StripeCollection = require('../stripe-collection');
const { getFilterOperators } = require('../field-mapper');

/**
 * Collection for Stripe Charges
 * https://stripe.com/docs/api/charges
 */
class ChargesCollection extends StripeCollection {
  constructor(dataSource, stripe) {
    super('Stripe Charges', dataSource, stripe, 'charges');

    this._registerFields();
  }

  /**
   * Register all fields for the Charges collection
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

    this.addField('amount_captured', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: false,
    });

    this.addField('amount_refunded', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: false,
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
      enumValues: ['succeeded', 'pending', 'failed'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    this.addField('paid', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    this.addField('captured', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    this.addField('refunded', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    this.addField('disputed', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    // Customer
    this.addField('customer', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
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

    // Payment method details
    this.addField('payment_method', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('payment_method_details', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Related resources
    this.addField('payment_intent', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('invoice', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('balance_transaction', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
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

    this.addField('receipt_number', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('receipt_url', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Statement descriptor
    this.addField('statement_descriptor', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Failure info
    this.addField('failure_code', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('failure_message', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Fraud details
    this.addField('fraud_details', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Outcome
    this.addField('outcome', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Billing details
    this.addField('billing_details', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Shipping
    this.addField('shipping', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: true,
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
   * Charges are mostly read-only in Stripe (created via PaymentIntents)
   * Only certain fields can be updated after creation
   */
  _transformToStripe(record) {
    // Only metadata, description, receipt_email, fraud_details can be updated
    return {
      description: record.description,
      metadata: record.metadata,
      receipt_email: record.receipt_email,
      fraud_details: record.fraud_details,
    };
  }

  /**
   * Override create - Charges should be created via PaymentIntents in modern Stripe
   */
  async create(caller, data) {
    throw new Error('Charges cannot be created directly. Use Payment Intents instead.');
  }

  /**
   * Override delete - Charges cannot be deleted, only refunded
   */
  async delete(caller, filter) {
    throw new Error('Charges cannot be deleted. Create a refund instead.');
  }
}

module.exports = ChargesCollection;
