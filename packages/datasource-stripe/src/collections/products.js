/**
 * ProductsCollection - Stripe Products resource
 */

import { getFilterOperators } from '../field-mapper';
import StripeCollection from '../stripe-collection';

/**
 * Collection for Stripe Products
 * https://stripe.com/docs/api/products
 */
class ProductsCollection extends StripeCollection {
  constructor(dataSource, stripe) {
    super('Stripe Products', dataSource, stripe, 'products');

    this._registerFields();
  }

  /**
   * Register all fields for the Products collection
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
   * Override _transformToStripe to handle product-specific fields
   */
  _transformToStripe(record) {
    // eslint-disable-next-line no-underscore-dangle
    const data = super._transformToStripe(record);

    // Remove read-only field
    delete data.type;

    return data;
  }
}

export default ProductsCollection;
