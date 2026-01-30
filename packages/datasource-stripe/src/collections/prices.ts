/**
 * PricesCollection - Stripe Prices resource
 */

import { Caller, Logger, PaginatedFilter, RecordData } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeCollection from '../collection';
import StripeDataSource from '../datasource';
import { getFilterOperators } from '../utils';

/**
 * Collection for Stripe Prices
 * https://stripe.com/docs/api/prices
 */
export default class PricesCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) {
    super('Stripe Prices', dataSource, stripe, 'prices', logger);

    this.registerFields();
  }

  /**
   * Register all fields for the Prices collection
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
    this.addField('active', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: false,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    this.addField('currency', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('nickname', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Pricing (stored as formatted strings like "200.00")
    this.addField('unit_amount', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: true,
    });

    this.addField('unit_amount_decimal', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Price type
    this.addField('type', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['one_time', 'recurring'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    this.addField('billing_scheme', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['per_unit', 'tiered'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Related product
    this.addField('product', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Recurring pricing details (as JSON)
    this.addField('recurring', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Tax behavior
    this.addField('tax_behavior', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['exclusive', 'inclusive', 'unspecified'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Tiered pricing
    this.addField('tiers_mode', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['graduated', 'volume'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    this.addField('tiers', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Transformations
    this.addField('transform_quantity', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Lookup key
    this.addField('lookup_key', {
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

    this.addField('livemode', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });
  }

  /**
   * Override transformToStripe to handle price-specific fields
   */
  protected override transformToStripe(record: RecordData): Record<string, unknown> {
    const data = super.transformToStripe(record);

    // Remove read-only field
    delete data.type;

    return data;
  }

  /**
   * Override delete - Prices cannot be deleted in Stripe, only archived
   */
  override async delete(caller: Caller, filter: PaginatedFilter): Promise<void> {
    // Instead of deleting, we set active to false
    await this.update(caller, filter, { active: false });
  }
}
