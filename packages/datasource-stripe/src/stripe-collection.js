/**
 * StripeCollection - Base class for Stripe resource collections
 */

import { BaseCollection } from '@forestadmin/datasource-toolkit';

import { DEFAULT_PAGE_SIZE } from './constants';
import { dateToTimestamp, timestampToDate } from './field-mapper';

/**
 * Base collection class for Stripe resources
 * Provides common functionality for all Stripe collections
 */
class StripeCollection extends BaseCollection {
  /**
   * @param {string} name - Collection name
   * @param {Object} dataSource - Parent datasource instance
   * @param {Object} stripe - Stripe client instance
   * @param {string} resourceName - Stripe resource name (e.g., 'customers', 'products')
   */
  constructor(name, dataSource, stripe, resourceName) {
    super(name, dataSource);

    this.stripe = stripe;
    this.resourceName = resourceName;
    this.stripeResource = this._getStripeResource(resourceName);
  }

  /**
   * Get the Stripe resource object from the client
   * @param {string} resourceName - Resource name
   * @returns {Object} Stripe resource object
   */
  _getStripeResource(resourceName) {
    const resourceMap = {
      customers: this.stripe.customers,
      products: this.stripe.products,
      prices: this.stripe.prices,
      subscriptions: this.stripe.subscriptions,
      invoices: this.stripe.invoices,
      payment_intents: this.stripe.paymentIntents,
      charges: this.stripe.charges,
      refunds: this.stripe.refunds,
      payment_methods: this.stripe.paymentMethods,
      balance_transactions: this.stripe.balanceTransactions,
    };

    return resourceMap[resourceName];
  }

  /**
   * Transform Stripe object to Forest Admin record format
   * Only includes fields that are registered in the collection schema
   * @param {Object} stripeObject - Stripe API object
   * @returns {Object} Forest Admin record
   */
  _transformRecord(stripeObject) {
    // Get list of registered field names
    const registeredFields = new Set(Object.keys(this.schema.fields));

    // Only keep fields that are registered in the schema
    const record = {};

    for (const [key, value] of Object.entries(stripeObject)) {
      if (registeredFields.has(key)) {
        record[key] = value;
      }
    }

    // Convert timestamps to dates
    if (record.created) {
      record.created = timestampToDate(record.created);
    }

    if (record.updated) {
      record.updated = timestampToDate(record.updated);
    }

    // Resource-specific timestamp conversions
    const timestampFields = [
      'current_period_start',
      'current_period_end',
      'start_date',
      'ended_at',
      'canceled_at',
      'trial_start',
      'trial_end',
      'billing_cycle_anchor',
      'due_date',
      'period_start',
      'period_end',
      'available_on',
    ];

    for (const field of timestampFields) {
      if (record[field]) {
        record[field] = timestampToDate(record[field]);
      }
    }

    return record;
  }

  /**
   * Transform Forest Admin record back to Stripe format
   * @param {Object} record - Forest Admin record
   * @returns {Object} Stripe API format
   */
  _transformToStripe(record) {
    const data = { ...record };

    // Remove read-only fields
    delete data.id;
    delete data.object;
    delete data.created;
    delete data.updated;
    delete data.livemode;

    // Convert dates back to timestamps where needed
    const timestampFields = ['trial_end', 'billing_cycle_anchor', 'cancel_at'];

    for (const field of timestampFields) {
      if (data[field] instanceof Date) {
        data[field] = dateToTimestamp(data[field]);
      }
    }

    return data;
  }

  /**
   * Build Stripe list parameters from Forest Admin filter
   * @param {Object} filter - Forest Admin filter object
   * @returns {Object} Stripe list parameters
   */
  _buildListParams(filter) {
    const params = {
      limit: filter?.page?.limit || DEFAULT_PAGE_SIZE,
    };

    // Handle pagination cursor
    if (filter?.page?.afterCursor) {
      params.starting_after = filter.page.afterCursor;
    }

    // Handle common filter conditions
    if (filter?.conditionTree) {
      this._applyConditionToParams(params, filter.conditionTree);
    }

    return params;
  }

  /**
   * Apply condition tree to Stripe params
   * @param {Object} params - Stripe params object to modify
   * @param {Object} condition - Condition tree node
   */
  _applyConditionToParams(params, condition) {
    if (!condition) return;

    // Handle single condition
    if (condition.field && condition.operator && condition.value !== undefined) {
      this._applySingleCondition(params, condition);

      return;
    }

    // Handle AND aggregator
    if (condition.aggregator === 'And' && condition.conditions) {
      for (const cond of condition.conditions) {
        this._applyConditionToParams(params, cond);
      }
    }
  }

  /**
   * Apply a single condition to params
   * @param {Object} params - Stripe params object
   * @param {Object} condition - Single condition
   */
  _applySingleCondition(params, condition) {
    const { field, operator, value } = condition;

    // Stripe supports limited filtering, mainly on specific fields
    switch (field) {
      case 'email':
        if (operator === 'Equal') {
          params.email = value;
        }

        break;

      case 'created':
        if (operator === 'GreaterThan') {
          params.created = { ...params.created, gt: dateToTimestamp(value) };
        } else if (operator === 'GreaterThanOrEqual') {
          params.created = { ...params.created, gte: dateToTimestamp(value) };
        } else if (operator === 'LessThan') {
          params.created = { ...params.created, lt: dateToTimestamp(value) };
        } else if (operator === 'LessThanOrEqual') {
          params.created = { ...params.created, lte: dateToTimestamp(value) };
        }

        break;

      case 'status':
        if (operator === 'Equal') {
          params.status = value;
        }

        break;

      case 'customer':
        if (operator === 'Equal') {
          params.customer = value;
        }

        break;

      case 'active':
        if (operator === 'Equal' && this.resourceName === 'products') {
          params.active = value;
        }

        break;

      case 'type':
        if (operator === 'Equal') {
          params.type = value;
        }

        break;

      default:
        break;
    }
  }

  /**
   * Extract single record ID from filter if this is a single record request
   * @param {Object} filter - Forest Admin filter
   * @returns {string|null} Record ID or null
   */
  _extractSingleRecordId(filter) {
    const condition = filter?.conditionTree;

    if (!condition) return null;

    // Check for simple id = value condition
    if (condition.field === 'id' && condition.operator === 'Equal' && condition.value) {
      return condition.value;
    }

    // Check for AND with id condition
    if (condition.aggregator === 'And' && condition.conditions) {
      for (const cond of condition.conditions) {
        if (cond.field === 'id' && cond.operator === 'Equal' && cond.value) {
          return cond.value;
        }
      }
    }

    return null;
  }

  /**
   * LIST - Retrieve records
   */
  async list(caller, filter, projection) {
    // Handle single record retrieval by ID
    const singleRecordId = this._extractSingleRecordId(filter);

    if (singleRecordId) {
      try {
        const record = await this.stripeResource.retrieve(singleRecordId);

        return [this._transformRecord(record)];
      } catch (error) {
        if (error.code === 'resource_missing') {
          return [];
        }

        throw error;
      }
    }

    // Build list parameters
    const params = this._buildListParams(filter);

    const response = await this.stripeResource.list(params);

    return response.data.map(item => this._transformRecord(item));
  }

  /**
   * AGGREGATE - Perform aggregation operations
   */
  async aggregate(caller, filter, aggregation) {
    // Stripe doesn't support aggregations natively, so we fetch and compute
    const records = await this.list(caller, { ...filter, page: { limit: 100 } }, null);

    if (aggregation.operation === 'Count') {
      // Note: This count is limited by the page size
      // For accurate counts, you'd need to iterate through all pages
      return [{ value: records.length, group: {} }];
    }

    const { field } = aggregation;
    const values = records.map(r => r[field]).filter(v => v != null && typeof v === 'number');

    let result;

    switch (aggregation.operation) {
      case 'Sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'Avg':
        result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case 'Max':
        result = values.length > 0 ? Math.max(...values) : null;
        break;
      case 'Min':
        result = values.length > 0 ? Math.min(...values) : null;
        break;
      default:
        result = null;
    }

    return [{ value: result, group: {} }];
  }

  /**
   * CREATE - Create new records
   * Override in subclasses to customize creation behavior
   */
  async create(caller, data) {
    const results = [];

    for (const item of data) {
      const stripeData = this._transformToStripe(item);
      // eslint-disable-next-line no-await-in-loop
      const created = await this.stripeResource.create(stripeData);
      results.push(this._transformRecord(created));
    }

    return results;
  }

  /**
   * UPDATE - Update existing records
   */
  async update(caller, filter, patch) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    const stripeData = this._transformToStripe(patch);

    for (const record of records) {
      // eslint-disable-next-line no-await-in-loop
      await this.stripeResource.update(record.id, stripeData);
    }
  }

  /**
   * DELETE - Delete records
   * Note: Not all Stripe resources support deletion
   */
  async delete(caller, filter) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    for (const record of records) {
      // eslint-disable-next-line no-await-in-loop
      await this.stripeResource.del(record.id);
    }
  }
}

export default StripeCollection;
