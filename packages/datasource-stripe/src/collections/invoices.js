/**
 * InvoicesCollection - Stripe Invoices resource
 */

const StripeCollection = require('../stripe-collection');
const { getFilterOperators } = require('../field-mapper');

/**
 * Collection for Stripe Invoices
 * https://stripe.com/docs/api/invoices
 */
class InvoicesCollection extends StripeCollection {
  constructor(dataSource, stripe) {
    super('Stripe Invoices', dataSource, stripe, 'invoices');

    this._registerFields();
  }

  /**
   * Register all fields for the Invoices collection
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

    // Customer relationship
    this.addField('customer', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('customer_email', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('customer_name', {
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
      enumValues: ['draft', 'open', 'paid', 'uncollectible', 'void'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Invoice number and details
    this.addField('number', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('description', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Amounts
    this.addField('amount_due', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('amount_paid', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('amount_remaining', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('subtotal', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('total', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: true,
    });

    this.addField('tax', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: false,
    });

    this.addField('currency', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Billing
    this.addField('collection_method', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['charge_automatically', 'send_invoice'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Period
    this.addField('period_start', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    this.addField('period_end', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    this.addField('due_date', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: false,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: true,
    });

    // Payment
    this.addField('paid', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    this.addField('attempted', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    this.addField('attempt_count', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: getFilterOperators('number'),
      isSortable: false,
    });

    // Related resources
    this.addField('subscription', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('payment_intent', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('charge', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // URLs
    this.addField('hosted_invoice_url', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    this.addField('invoice_pdf', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Line items (as JSON)
    this.addField('lines', {
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
   * Override _transformToStripe to handle invoice-specific fields
   */
  _transformToStripe(record) {
    const data = super._transformToStripe(record);

    // Remove read-only fields specific to invoices
    delete data.status;
    delete data.number;
    delete data.amount_due;
    delete data.amount_paid;
    delete data.amount_remaining;
    delete data.subtotal;
    delete data.total;
    delete data.tax;
    delete data.period_start;
    delete data.period_end;
    delete data.paid;
    delete data.attempted;
    delete data.attempt_count;
    delete data.payment_intent;
    delete data.charge;
    delete data.hosted_invoice_url;
    delete data.invoice_pdf;
    delete data.lines;
    delete data.customer_email;
    delete data.customer_name;

    return data;
  }

  /**
   * Override delete - Voids the invoice instead of deleting
   * Only draft invoices can be deleted; others must be voided
   */
  async delete(caller, filter) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    try {
      for (const record of records) {
        if (record.status === 'draft') {
          // Draft invoices can be deleted
          await this.stripe.invoices.del(record.id);
        } else if (record.status === 'open') {
          // Open invoices must be voided
          await this.stripe.invoices.voidInvoice(record.id);
        }
        // Paid/void/uncollectible invoices cannot be deleted or voided
      }
    } catch (error) {
      console.error('Stripe invoice delete/void error:', error.message);
      throw error;
    }
  }
}

module.exports = InvoicesCollection;
