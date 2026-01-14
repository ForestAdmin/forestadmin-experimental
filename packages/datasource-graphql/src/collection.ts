import type { IntrospectedTable } from './types';
import type {
  AggregateResult,
  Aggregation,
  Caller,
  DataSource,
  Filter,
  PaginatedFilter,
  RecordData,
} from '@forestadmin/datasource-toolkit';
import type { GraphQLClient } from 'graphql-request';

import { BaseCollection, Projection } from '@forestadmin/datasource-toolkit';

import { buildFields } from './introspection';
import {
  buildAggregateQuery,
  buildCreateMutation,
  buildDeleteMutation,
  buildListQuery,
  buildUpdateMutation,
} from './utils/query-builder';
import convertAggregateResults from './utils/result-converter';

export class GraphqlCollection extends BaseCollection {
  private readonly client: GraphQLClient;

  constructor(datasource: DataSource, table: IntrospectedTable, client: GraphQLClient) {
    super(table.name, datasource);

    this.client = client;

    this.enableCount();
    this.addFields(buildFields(table));
  }

  /**
   * Create new records
   */
  async create(caller: Caller, data: RecordData[]): Promise<RecordData[]> {
    if (data.length === 0) {
      return [];
    }

    // Get all column fields for the returning projection
    const columnFields = Object.entries(this.schema.fields)
      .filter(([, field]) => field.type === 'Column')
      .map(([name]) => name);

    const projection = new Projection(...columnFields);
    const { query, variables } = buildCreateMutation(this.name, data, projection);

    try {
      const result = await this.client.request<Record<string, { returning: RecordData[] }>>(
        query,
        variables,
      );

      const returning = result[`insert_${this.name}`]?.returning;

      if (!returning) {
        throw new Error('No records returned from insert mutation');
      }

      return returning;
    } catch (error) {
      throw this.wrapError('create', error);
    }
  }

  /**
   * List records with filtering, sorting and pagination
   */
  async list(
    caller: Caller,
    filter: PaginatedFilter,
    projection: Projection,
  ): Promise<RecordData[]> {
    const { query, variables } = buildListQuery(this.name, filter, projection);

    try {
      const result = await this.client.request<Record<string, RecordData[]>>(query, variables);
      const records = result[this.name];

      return records || [];
    } catch (error) {
      throw this.wrapError('list', error);
    }
  }

  /**
   * Update records matching a filter
   */
  async update(caller: Caller, filter: Filter, patch: RecordData): Promise<void> {
    const { query, variables } = buildUpdateMutation(this.name, filter as PaginatedFilter, patch);

    try {
      await this.client.request(query, variables);
    } catch (error) {
      throw this.wrapError('update', error);
    }
  }

  /**
   * Delete records matching a filter
   */
  async delete(caller: Caller, filter: Filter): Promise<void> {
    const { query, variables } = buildDeleteMutation(this.name, filter as PaginatedFilter);

    try {
      await this.client.request(query, variables);
    } catch (error) {
      throw this.wrapError('delete', error);
    }
  }

  /**
   * Aggregate records
   */
  async aggregate(
    caller: Caller,
    filter: Filter,
    aggregation: Aggregation,
    limit?: number,
  ): Promise<AggregateResult[]> {
    const { query, variables } = buildAggregateQuery(
      this.name,
      filter as PaginatedFilter,
      aggregation,
    );

    try {
      const result = await this.client.request(query, variables);

      const aggregateResult = result[`${this.name}_aggregate`];

      if (!aggregateResult) {
        return [{ value: 0, group: {} }];
      }

      const results = convertAggregateResults(
        aggregateResult,
        aggregation.operation,
        aggregation.field ?? undefined,
        aggregation.groups,
      );

      // Apply limit if specified
      if (limit && results.length > limit) {
        return results.slice(0, limit);
      }

      return results;
    } catch (error) {
      throw this.wrapError('aggregate', error);
    }
  }

  /**
   * Wrap GraphQL errors with context
   */
  private wrapError(operation: string, error: unknown): Error {
    if (error instanceof Error) {
      const message = this.extractErrorMessage(error);

      return new Error(`GraphQL ${operation} failed on '${this.name}': ${message}`);
    }

    return new Error(`GraphQL ${operation} failed on '${this.name}': Unknown error`);
  }

  /**
   * Extract a meaningful error message from a GraphQL error
   */
  private extractErrorMessage(error: Error): string {
    // GraphQL request library wraps errors in a specific way
    const errorAny = error as {
      response?: {
        errors?: { message: string; extensions?: { code?: string } }[];
      };
    };

    if (errorAny.response?.errors?.length) {
      return errorAny.response.errors.map(e => e.message).join('; ');
    }

    return error.message;
  }
}

export default GraphqlCollection;
