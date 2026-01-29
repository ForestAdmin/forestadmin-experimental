/**
 * StripeCollection - Base class for Stripe resource collections
 */

import {
  Aggregation,
  AggregateResult,
  BaseCollection,
  Caller,
  Filter,
  Logger,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';
import Stripe from 'stripe';

import StripeDataSource from './datasource';
import { StripeDataSourceError, StripeRecord, StripeResourceType, StripeResourceUnion } from './types';
import {
  AMOUNT_FIELDS,
  dateToTimestamp,
  DEFAULT_PAGE_SIZE,
  TIMESTAMP_FIELDS,
  timestampToDate,
  withRetry,
} from './utils';

/**
 * Base collection class for Stripe resources
 * Provides common functionality for all Stripe collections
 */
export default class StripeCollection extends BaseCollection {
  protected readonly stripe: Stripe;
  protected readonly resourceName: StripeResourceType;
  protected readonly stripeResource: StripeResourceUnion;
  protected readonly logger?: Logger;

  constructor(
    name: string,
    dataSource: StripeDataSource,
    stripe: Stripe,
    resourceName: StripeResourceType,
    logger?: Logger,
  ) {
    super(name, dataSource);

    this.stripe = stripe;
    this.resourceName = resourceName;
    this.stripeResource = this.getStripeResource(resourceName);
    this.logger = logger;
  }

  /**
   * Get the Stripe resource object from the client
   */
  protected getStripeResource(resourceName: StripeResourceType): StripeResourceUnion {
    const resourceMap: Record<StripeResourceType, StripeResourceUnion> = {
      customers: this.stripe.customers,
      products: this.stripe.products,
      prices: this.stripe.prices,
      subscriptions: this.stripe.subscriptions,
      invoices: this.stripe.invoices,
      payment_intents: this.stripe.paymentIntents,
      charges: this.stripe.charges,
      refunds: this.stripe.refunds,
      balance_transactions: this.stripe.balanceTransactions,
    };

    return resourceMap[resourceName];
  }

  /**
   * Transform Stripe object to Forest Admin record format
   */
  protected transformRecord(stripeObject: StripeRecord): RecordData {
    // Get list of registered field names
    const registeredFields = new Set(Object.keys(this.schema.fields));

    // Only keep fields that are registered in the schema
    const record: RecordData = {};

    for (const [key, value] of Object.entries(stripeObject)) {
      if (registeredFields.has(key)) {
        record[key] = value;
      }
    }

    // Convert timestamps to dates
    for (const field of TIMESTAMP_FIELDS) {
      if (record[field] != null && typeof record[field] === 'number') {
        record[field] = timestampToDate(record[field] as number);
      }
    }

    // Convert amount fields from cents to decimal string
    for (const field of AMOUNT_FIELDS) {
      if (record[field] != null && typeof record[field] === 'number') {
        record[field] = ((record[field] as number) / 100).toFixed(2);
      }
    }

    return record;
  }

  /**
   * Transform Forest Admin record back to Stripe format
   */
  protected transformToStripe(record: RecordData): Record<string, unknown> {
    const data: Record<string, unknown> = { ...record };

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
        data[field] = dateToTimestamp(data[field] as Date);
      }
    }

    // Convert amount fields from decimal string back to cents
    for (const field of AMOUNT_FIELDS) {
      if (data[field] != null) {
        const value = typeof data[field] === 'string' ? parseFloat(data[field]) : data[field];

        if (typeof value === 'number' && !isNaN(value)) {
          data[field] = Math.round(value * 100);
        }
      }
    }

    return data;
  }

  /**
   * Build Stripe list parameters from Forest Admin filter
   */
  protected buildListParams(filter?: PaginatedFilter): Stripe.PaginationParams {
    const params: Stripe.PaginationParams & Record<string, unknown> = {
      limit: filter?.page?.limit || DEFAULT_PAGE_SIZE,
    };

    // Handle pagination cursor
    if (filter?.page && 'afterCursor' in filter.page && filter.page.afterCursor) {
      params.starting_after = filter.page.afterCursor as string;
    }

    // Handle common filter conditions
    if (filter?.conditionTree) {
      this.applyConditionToParams(params, filter.conditionTree);
    }

    return params;
  }

  /**
   * Apply condition tree to Stripe params
   * Note: Stripe API has limited filter support. OR conditions and unsupported
   * filters will be handled by client-side filtering after data is retrieved.
   */
  protected applyConditionToParams(
    params: Stripe.PaginationParams & Record<string, unknown>,
    condition: Filter['conditionTree'],
  ): void {
    if (!condition) {
      return;
    }

    // Handle single condition (leaf node)
    if ('field' in condition && 'operator' in condition && 'value' in condition) {
      const leafCondition = condition as { field: string; operator: string; value: unknown };
      this.applySingleCondition(params, leafCondition);

      return;
    }

    // Handle AND aggregator (branch node)
    if ('aggregator' in condition && condition.aggregator === 'And') {
      const branchCondition = condition as unknown as { aggregator: string; conditions: Filter['conditionTree'][] };

      if (branchCondition.conditions) {
        for (const cond of branchCondition.conditions) {
          this.applyConditionToParams(params, cond);
        }
      }

      return;
    }

    // Handle OR aggregator - Stripe doesn't support OR natively
    // Log a warning as client-side filtering may be needed
    if ('aggregator' in condition && condition.aggregator === 'Or') {
      this.log(
        'Warn',
        `OR filter conditions are not natively supported by Stripe API for ${this.resourceName}. ` +
          'Results may be filtered client-side which could impact performance.',
      );
    }
  }

  /**
   * Apply a single condition to params
   */
  protected applySingleCondition(
    params: Stripe.PaginationParams & Record<string, unknown>,
    condition: { field: string; operator: string; value: unknown },
  ): void {
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
          params.created = { ...(params.created as object), gt: dateToTimestamp(value as Date) };
        } else if (operator === 'GreaterThanOrEqual') {
          params.created = { ...(params.created as object), gte: dateToTimestamp(value as Date) };
        } else if (operator === 'LessThan') {
          params.created = { ...(params.created as object), lt: dateToTimestamp(value as Date) };
        } else if (operator === 'LessThanOrEqual') {
          params.created = { ...(params.created as object), lte: dateToTimestamp(value as Date) };
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
    }
  }

  /**
   * Extract single record ID from filter if this is a single record request
   */
  protected extractSingleRecordId(filter?: PaginatedFilter): string | null {
    const condition = filter?.conditionTree;

    if (!condition) {
      return null;
    }

    // Check for simple id = value condition
    if (
      'field' in condition &&
      condition.field === 'id' &&
      'operator' in condition &&
      condition.operator === 'Equal' &&
      'value' in condition &&
      condition.value
    ) {
      return condition.value as string;
    }

    // Check for AND with id condition
    if ('aggregator' in condition && condition.aggregator === 'And') {
      const branchCondition = condition as unknown as { aggregator: string; conditions: Filter['conditionTree'][] };

      if (branchCondition.conditions) {
        for (const cond of branchCondition.conditions) {
          if (
            cond &&
            'field' in cond &&
            (cond as { field: string }).field === 'id' &&
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
   * LIST - Retrieve records
   */
  override async list(
    _caller: Caller,
    filter: PaginatedFilter,
    _projection: Projection,
  ): Promise<RecordData[]> {
    // Handle single record retrieval by ID
    const singleRecordId = this.extractSingleRecordId(filter);

    if (singleRecordId) {
      try {
        const record = await withRetry(() =>
          (this.stripeResource as Stripe.CustomersResource).retrieve(singleRecordId),
        );

        return [this.transformRecord(record as unknown as StripeRecord)];
      } catch (error) {
        const stripeError = error as { code?: string; type?: string; message?: string };

        // Resource not found - return empty array
        if (stripeError.code === 'resource_missing') {
          return [];
        }

        this.log('Error', `Stripe retrieve error (${this.resourceName}/${singleRecordId}): ${stripeError.message}`);
        throw StripeDataSourceError.fromStripeError({
          type: stripeError.type ?? 'api_error',
          code: stripeError.code,
          message: stripeError.message ?? 'Unknown error',
        });
      }
    }

    // Build list parameters
    const params = this.buildListParams(filter);

    try {
      const response = await withRetry(() =>
        (this.stripeResource as Stripe.CustomersResource).list(params as Stripe.CustomerListParams),
      );

      return response.data.map(item => this.transformRecord(item as unknown as StripeRecord));
    } catch (error) {
      const stripeError = error as { type?: string; code?: string; message?: string };
      this.log('Error', `Stripe list error (${this.resourceName}): ${stripeError.message}`);
      throw StripeDataSourceError.fromStripeError({
        type: stripeError.type ?? 'api_error',
        code: stripeError.code,
        message: stripeError.message ?? 'Unknown error',
      });
    }
  }

  /**
   * AGGREGATE - Perform aggregation operations
   */
  override async aggregate(
    _caller: Caller,
    filter: PaginatedFilter,
    aggregation: Aggregation,
    _limit?: number,
  ): Promise<AggregateResult[]> {
    // Stripe doesn't support aggregations natively, so we fetch and compute
    // Use the original filter for aggregation
    const records = await this.list(
      _caller,
      filter,
      new Projection(),
    );

    if (aggregation.operation === 'Count') {
      return [{ value: records.length, group: {} }];
    }

    const field = aggregation.field;

    if (!field) {
      return [{ value: null, group: {} }];
    }

    const values = records
      .map(r => {
        const val = r[field];

        // Handle both numbers and numeric strings (for amount fields)
        if (typeof val === 'number') {
          return val;
        }

        if (typeof val === 'string') {
          const parsed = parseFloat(val);

          return isNaN(parsed) ? null : parsed;
        }

        return null;
      })
      .filter((v): v is number => v != null);

    let result: number | null;

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
   */
  override async create(caller: Caller, data: RecordData[]): Promise<RecordData[]> {
    try {
      const results: RecordData[] = [];

      for (const item of data) {
        const stripeData = this.transformToStripe(item);
        const resource = this.stripeResource as Stripe.CustomersResource;
        const params = stripeData as Stripe.CustomerCreateParams;
        const created = await withRetry(() => resource.create(params));
        results.push(this.transformRecord(created as unknown as StripeRecord));
      }

      return results;
    } catch (error) {
      this.log('Error', `Stripe create error (${this.resourceName}): ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * UPDATE - Update existing records
   */
  override async update(caller: Caller, filter: PaginatedFilter, patch: RecordData): Promise<void> {
    const records = await this.list(caller, filter, new Projection('id'));

    if (records.length === 0) {
      return;
    }

    const stripeData = this.transformToStripe(patch);

    try {
      for (const record of records) {
        const resource = this.stripeResource as Stripe.CustomersResource;
        const params = stripeData as Stripe.CustomerUpdateParams;
        await withRetry(() => resource.update(record.id as string, params));
      }
    } catch (error) {
      this.log('Error', `Stripe update error (${this.resourceName}): ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * DELETE - Delete records
   */
  override async delete(caller: Caller, filter: PaginatedFilter): Promise<void> {
    const records = await this.list(caller, filter, new Projection('id'));

    if (records.length === 0) {
      return;
    }

    try {
      for (const record of records) {
         
        await withRetry(() =>
          (this.stripeResource as Stripe.CustomersResource).del(record.id as string),
        );
      }
    } catch (error) {
      this.log('Error', `Stripe delete error (${this.resourceName}): ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * Log a message using the logger or console
   */
  protected log(level: 'Info' | 'Warn' | 'Error', message: string): void {
    if (this.logger) {
      this.logger(level, message);
    } else {
      const logFn = level === 'Error' ? console.error : level === 'Warn' ? console.warn : console.info;
      logFn(`[StripeDataSource] ${message}`);
    }
  }
}
