/**
 * ProductsCollection - Stripe Products resource
 */

import { Logger, RecordData } from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeCollection from '../collection';
import StripeDataSource from '../datasource';
import { getFilterOperators } from '../utils';

/**
 * Collection for Stripe Products
 * https://stripe.com/docs/api/products
 */
export default class ProductsCollection extends StripeCollection {
  constructor(dataSource: StripeDataSource, stripe: Stripe, logger?: Logger) {
    super('Stripe Products', dataSource, stripe, 'products', logger);

    this.registerFields();
  }

  /**
   * Register all fields for the Products collection
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
    this.addField('name', {
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

    this.addField('active', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: false,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    // Pricing
    this.addField('default_price', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Product type
    this.addField('type', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['good', 'service'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
      isSortable: false,
    });

    // Images and marketing
    this.addField('images', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    this.addField('url', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Physical product fields
    this.addField('shippable', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: false,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    this.addField('unit_label', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Categorization
    this.addField('statement_descriptor', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('tax_code', {
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

    this.addField('updated', {
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
   * Override transformToStripe to handle product-specific fields
   */
  protected override transformToStripe(record: RecordData): Record<string, unknown> {
    const data = super.transformToStripe(record);

    // Remove read-only field
    delete data.type;

    return data;
  }
}
