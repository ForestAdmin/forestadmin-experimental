/**
 * SubscriptionsCollection - Stripe Subscriptions resource
 */

const StripeCollection = require('../stripe-collection');
const { getFilterOperators } = require('../field-mapper');

/**
 * Collection for Stripe Subscriptions
 * https://stripe.com/docs/api/subscriptions
 */
class SubscriptionsCollection extends StripeCollection {
  constructor(dataSource, stripe) {
    super('Stripe Subscriptions', dataSource, stripe, 'subscriptions');

    this._registerFields();
  }

  /**
   * Register all fields for the Subscriptions collection
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

    // Status
    this.addField('status', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'],
      isReadOnly: true,
      filterOperators: getFilterOperators('enum'),
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

    this.addField('currency', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Period dates
    this.addField('current_period_start', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: true,
    });

    this.addField('current_period_end', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: true,
    });

    // Trial
    this.addField('trial_start', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    this.addField('trial_end', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: false,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    // Lifecycle dates
    this.addField('start_date', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: true,
    });

    this.addField('ended_at', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    this.addField('canceled_at', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    this.addField('cancel_at', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: false,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    this.addField('cancel_at_period_end', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: false,
      filterOperators: getFilterOperators('boolean'),
      isSortable: false,
    });

    // Billing anchor
    this.addField('billing_cycle_anchor', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: false,
      filterOperators: getFilterOperators('timestamp'),
      isSortable: false,
    });

    // Related resources
    this.addField('default_payment_method', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: false,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    this.addField('latest_invoice', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: getFilterOperators('string'),
      isSortable: false,
    });

    // Items (as JSON)
    this.addField('items', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: false,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Discounts
    this.addField('discount', {
      type: 'Column',
      columnType: 'Json',
      isReadOnly: true,
      filterOperators: new Set([]),
      isSortable: false,
    });

    // Proration behavior
    this.addField('proration_behavior', {
      type: 'Column',
      columnType: 'Enum',
      enumValues: ['create_prorations', 'none', 'always_invoice'],
      isReadOnly: false,
      filterOperators: getFilterOperators('enum'),
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
   * Override _transformToStripe to handle subscription-specific fields
   */
  _transformToStripe(record) {
    const data = super._transformToStripe(record);

    // Remove read-only fields specific to subscriptions
    delete data.status;
    delete data.current_period_start;
    delete data.current_period_end;
    delete data.start_date;
    delete data.ended_at;
    delete data.canceled_at;
    delete data.trial_start;
    delete data.latest_invoice;
    delete data.discount;
    delete data.currency;

    return data;
  }

  /**
   * Override delete - Cancels the subscription instead of deleting
   */
  async delete(caller, filter) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    try {
      for (const record of records) {
        await this.stripe.subscriptions.cancel(record.id);
      }
    } catch (error) {
      console.error('Stripe subscription cancel error:', error.message);
      throw error;
    }
  }
}

module.exports = SubscriptionsCollection;
