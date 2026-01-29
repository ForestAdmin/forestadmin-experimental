/**
 * CustomersCollection - Stripe Customers resource
 */

import { Logger, RecordData } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeCollection from '../collection';
import StripeDataSource from '../datasource';
import { getFilterOperators } from '../utils';

/**
 * Collection for Stripe Customers
 * https://stripe.com/docs/api/customers
 */
export default class CustomersCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) {
    super('Stripe Customers', dataSource, stripe, 'customers', logger);

    this.registerFields();
  }

  /**
   * Register all fields for the Customers collection
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

    // Core fields
    this.addField('email', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('name', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('phone', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
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

    // Balance and billing
    this.addField('balance', {
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

    this.addField('delinquent', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
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

    // Address fields (as JSON)
    this.addField('address', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    this.addField('shipping', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Related resources
    this.addField('default_source', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('invoice_prefix', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Tax info
    this.addField('tax_exempt', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['none', 'exempt', 'reverse'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
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
   * Override transformToStripe to handle customer-specific fields
   */
  protected override transformToStripe(record: RecordData): Record<string, unknown> {
    const data = super.transformToStripe(record);

    // Remove additional read-only fields specific to customers
    delete data.balance;
    delete data.delinquent;
    delete data.invoice_prefix;
    delete data.next_invoice_sequence;

    return data;
  }
}
