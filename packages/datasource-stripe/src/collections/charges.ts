/**
 * ChargesCollection - Stripe Charges resource
 */

import { Caller, Filter, Logger, PaginatedFilter, Projection, RecordData } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeCollection from '../collection';
import StripeDataSource from '../datasource';
import { StripeRecord } from '../types';
import { getFilterOperators, withRetry } from '../utils';

/**
 * Collection for Stripe Charges
 * https://stripe.com/docs/api/charges
 */
export default class ChargesCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) {
    super('Stripe Charges', dataSource, stripe, 'charges', logger);

    this.registerFields();
  }

  /**
   * Register all fields for the Charges collection
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
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('amount_captured', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('amount_refunded', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
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
   * Since Stripe's charges.list and Search API don't support invoice filter,
   * we fetch the invoice first to get its charge ID, then retrieve that charge
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
        // Fetch the invoice to get its charge field
        const invoice = await withRetry(() => this.stripe.invoices.retrieve(invoiceId));

        // Invoice has a single charge field
        const chargeId = invoice.charge;

        if (!chargeId || typeof chargeId !== 'string') {
          // No charge associated with this invoice
          return [];
        }

        // Fetch the charge by ID
        const charge = await withRetry(() => this.stripe.charges.retrieve(chargeId));

        return [this.transformRecord(charge as unknown as StripeRecord)];
      } catch (error) {
        const stripeError = error as { code?: string };

        if (stripeError.code === 'resource_missing') {
          return [];
        }

        this.log('Error', `Stripe charge fetch error: ${(error as Error).message}`);
        throw error;
      }
    }

    // Otherwise use default list behavior
    return super.list(caller, filter, projection);
  }

  /**
   * Charges are mostly read-only in Stripe (created via PaymentIntents)
   * Only certain fields can be updated after creation
   */
  protected override transformToStripe(record: RecordData): Record<string, unknown> {
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
  override async create(_caller: Caller, _data: RecordData[]): Promise<RecordData[]> {
    throw new Error('Charges cannot be created directly. Use Payment Intents instead.');
  }

  /**
   * Override delete - Charges cannot be deleted, only refunded
   */
  override async delete(_caller: Caller, _filter: PaginatedFilter): Promise<void> {
    throw new Error('Charges cannot be deleted. Create a refund instead.');
  }
}
