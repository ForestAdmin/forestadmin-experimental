/**
 * PaymentIntentsCollection - Stripe PaymentIntents resource
 */

import { Caller, Filter, Logger, PaginatedFilter, Projection, RecordData } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeCollection from '../collection';
import StripeDataSource from '../datasource';
import { StripeRecord } from '../types';
import { getFilterOperators, withRetry } from '../utils';

/**
 * Collection for Stripe Payment Intents
 * https://stripe.com/docs/api/payment_intents
 */
export default class PaymentIntentsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) {
    super('Stripe Payment Intents', dataSource, stripe, 'payment_intents', logger);

    this.registerFields();
  }

  /**
   * Register all fields for the PaymentIntents collection
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

    // Amount and currency (stored as formatted strings like "200.00")
    this.addField('amount', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('amount_received', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
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
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
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

    // Client secret
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
   * Extract a specific filter value from condition tree
   */
  private extractFilterValue(condition: Filter['conditionTree'], fieldName: string): string | null {
    if (!condition) {
      return null;
    }

    // Check for simple field = value condition
    if (
      'field' in condition &&
      condition.field === fieldName &&
      'operator' in condition &&
      condition.operator === 'Equal' &&
      'value' in condition &&
      condition.value
    ) {
      return condition.value as string;
    }

    // Check for AND with the field condition
    if ('aggregator' in condition && condition.aggregator === 'And') {
      const branchCondition = condition as unknown as { aggregator: string; conditions: Filter['conditionTree'][] };

      if (branchCondition.conditions) {
        for (const cond of branchCondition.conditions) {
          if (
            cond &&
            'field' in cond &&
            (cond as { field: string }).field === fieldName &&
            'operator' in cond &&
            (cond as { operator: string }).operator === 'Equal' &&
            'value' in cond &&
            (cond as { value: unknown }).value
          ) {
            return (cond as { value: unknown }).value as string;
          }
        }
      }
    }

    return null;
  }

  /**
   * Override list to handle invoice filter
   * Since Stripe's paymentIntents.list and Search API don't support invoice filter,
   * we fetch the invoice first to get its payment_intent ID, then retrieve that payment intent
   */
  override async list(
    caller: Caller,
    filter: PaginatedFilter,
    projection: Projection,
  ): Promise<RecordData[]> {
    // Check if filtering by invoice
    const invoiceId = this.extractFilterValue(filter?.conditionTree, 'invoice');

    if (invoiceId) {
      try {
        // Fetch the invoice to get its payment_intent field
        const invoice = await withRetry(() => this.stripe.invoices.retrieve(invoiceId));

        // Invoice has a single payment_intent field
        const paymentIntentId = invoice.payment_intent;

        if (!paymentIntentId || typeof paymentIntentId !== 'string') {
          // No payment intent associated with this invoice
          return [];
        }

        // Fetch the payment intent by ID
        const paymentIntent = await withRetry(
          () => this.stripe.paymentIntents.retrieve(paymentIntentId),
        );

        return [this.transformRecord(paymentIntent as unknown as StripeRecord)];
      } catch (error) {
        const stripeError = error as { code?: string };

        if (stripeError.code === 'resource_missing') {
          return [];
        }

        this.log('Error', `Stripe payment intent fetch error: ${(error as Error).message}`);
        throw error;
      }
    }

    // Otherwise use default list behavior
    return super.list(caller, filter, projection);
  }

  /**
   * Override transformToStripe to handle payment intent-specific fields
   */
  protected override transformToStripe(record: RecordData): Record<string, unknown> {
    const data = super.transformToStripe(record);

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
  override async delete(caller: Caller, filter: PaginatedFilter): Promise<void> {
    const records = await this.list(caller, filter, new Projection('id', 'status'));

    if (records.length === 0) {
      return;
    }

    try {
      for (const record of records) {
        // Only cancel if not already in a terminal state
        if (!['succeeded', 'canceled'].includes(record.status as string)) {
           
          await withRetry(() => this.stripe.paymentIntents.cancel(record.id as string));
        }
      }
    } catch (error) {
      this.log('Error', `Stripe payment intent cancel error: ${(error as Error).message}`);
      throw error;
    }
  }
}
