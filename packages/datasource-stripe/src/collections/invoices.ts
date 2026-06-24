/**
 * InvoicesCollection - Stripe Invoices resource
 */

import { Caller, Logger, PaginatedFilter, Projection, RecordData } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeCollection from '../collection';
import StripeDataSource from '../datasource';
import { getFilterOperators, withRetry } from '../utils';

/**
 * Collection for Stripe Invoices
 * https://stripe.com/docs/api/invoices
 */
export default class InvoicesCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) {
    super('Stripe Invoices', dataSource, stripe, 'invoices', logger);

    this.registerFields();
  }

  /**
   * Register all fields for the Invoices collection
   */
  private registerFields(): void {
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

    // Amounts (stored as formatted strings like "200.00")
    this.addField('amount_due', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('amount_paid', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('amount_remaining', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('subtotal', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('total', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('tax', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
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
      filterOperators: new Set(['Contains', 'NotContains', 'Present', 'Blank']),
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
   * Override transformToStripe to handle invoice-specific fields
   */
  protected override transformToStripe(record: RecordData): Record<string, unknown> {
    const data = super.transformToStripe(record);

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
  override async delete(caller: Caller, filter: PaginatedFilter): Promise<void> {
    const records = await this.list(caller, filter, new Projection('id', 'status'));

    if (records.length === 0) {
      return;
    }

    try {
      for (const record of records) {
        if (record.status === 'draft') {
          // Draft invoices can be deleted
           
          await withRetry(() => this.stripe.invoices.del(record.id as string));
        } else if (record.status === 'open') {
          // Open invoices must be voided
           
          await withRetry(() => this.stripe.invoices.voidInvoice(record.id as string));
        }
        // Paid/void/uncollectible invoices cannot be deleted or voided
      }
    } catch (error) {
      this.log('Error', `Stripe invoice delete/void error: ${(error as Error).message}`);
      throw error;
    }
  }
}
