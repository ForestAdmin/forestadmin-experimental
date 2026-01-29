/**
 * RefundsCollection - Stripe Refunds resource
 */

import { Caller, Logger, PaginatedFilter, Projection, RecordData } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeCollection from '../collection';
import StripeDataSource from '../datasource';
import { getFilterOperators, withRetry } from '../utils';

/**
 * Collection for Stripe Refunds
 * https://stripe.com/docs/api/refunds
 */
export default class RefundsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) {
    super('Stripe Refunds', dataSource, stripe, 'refunds', logger);

    this.registerFields();
  }

  /**
   * Register all fields for the Refunds collection
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
   * Override transformToStripe for refund creation
   */
  protected override transformToStripe(record: RecordData): Record<string, unknown> {
    const data = super.transformToStripe(record);

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
  override async delete(caller: Caller, filter: PaginatedFilter): Promise<void> {
    const records = await this.list(caller, filter, new Projection('id', 'status'));

    if (records.length === 0) {
      return;
    }

    try {
      for (const record of records) {
        // Only pending refunds can be canceled
        if (record.status === 'pending' || record.status === 'requires_action') {
           
          await withRetry(() => this.stripe.refunds.cancel(record.id as string));
        }
      }
    } catch (error) {
      this.log('Error', `Stripe refund cancel error: ${(error as Error).message}`);
      throw error;
    }
  }
}
