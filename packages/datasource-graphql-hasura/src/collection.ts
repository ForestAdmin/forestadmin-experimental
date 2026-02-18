import type { IntrospectedTable } from './types';
import type { GroupRelationInfo } from './utils/aggregation';
import type {
  AggregateResult,
  Aggregation,
  Caller,
  ColumnSchema,
  DataSource,
  Filter,
  PaginatedFilter,
  RecordData,
} from '@forestadmin/datasource-toolkit';
import type { GraphQLClient } from 'graphql-request';

import { BaseCollection, Projection } from '@forestadmin/datasource-toolkit';

import { buildFields } from './introspection';
import { executeGroupedAggregate, extractAggregateValue } from './utils/aggregation';
import {
  buildAggregateQuery,
  buildCreateMutation,
  buildDeleteMutation,
  buildGroupedAggregateQuery,
  buildListQuery,
  buildUpdateMutation,
} from './utils/query-builder';

export class GraphqlCollection extends BaseCollection {
  private readonly client: GraphQLClient;

  constructor(datasource: DataSource, table: IntrospectedTable, client: GraphQLClient) {
    super(table.name, datasource);

    this.client = client;

    this.enableCount();
    this.addFields(buildFields(table));
    table.relationships.forEach(rel => {
      if (rel.type !== 'object') return;

      const fk = Object.keys(rel.mapping)[0];
      (this.schema.fields[fk] as ColumnSchema).isGroupable = true;
    });
    this.setAggregationCapabilities({ supportGroups: true, supportedDateOperations: new Set() });
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
    _caller: Caller,
    filter: Filter,
    aggregation: Aggregation,
    limit?: number,
  ): Promise<AggregateResult[]> {
    try {
      if (!aggregation.groups?.length) {
        return await this.executeSimpleAggregate(filter as PaginatedFilter, aggregation);
      }

      return await this.executeGroupedAggregate(filter as PaginatedFilter, aggregation, limit);
    } catch (error) {
      throw this.wrapError('aggregate', error);
    }
  }

  /**
   * Simple aggregation (no groups) — query <table>_aggregate directly
   */
  private async executeSimpleAggregate(
    filter: PaginatedFilter,
    aggregation: Aggregation,
  ): Promise<AggregateResult[]> {
    const { query, variables } = buildAggregateQuery(this.name, filter, aggregation);
    const result = await this.client.request(query, variables);
    const data = result[`${this.name}_aggregate`];
    const value = extractAggregateValue(data.aggregate, aggregation);

    if (value === null || value === undefined) return [];

    return [{ value, group: {} }];
  }

  /**
   * Grouped aggregation on FK — query parent collection with nested _aggregate.
   * Hasura handles the GROUP BY natively through the relationship.
   */
  private async executeGroupedAggregate(
    filter: PaginatedFilter,
    aggregation: Aggregation,
    limit?: number,
  ): Promise<AggregateResult[]> {
    const groupField = aggregation.groups?.[0].field;

    if (!groupField) return [];

    const relInfo = this.findGroupRelationInfo(groupField);
    const { query, variables } = buildGroupedAggregateQuery(
      this.name,
      relInfo,
      filter,
      aggregation,
    );

    const result = await this.client.request(query, variables);

    return executeGroupedAggregate(result, relInfo, groupField, aggregation, limit);
  }

  /**
   * Find the parent table relationship info for a FK field used in grouping.
   * Looks up the ManyToOne on this collection, then finds the reverse OneToMany on the parent.
   */
  private findGroupRelationInfo(fkField: string): GroupRelationInfo {
    for (const field of Object.values(this.schema.fields)) {
      if (field.type !== 'ManyToOne' || field.foreignKey !== fkField) {
        // eslint-disable-next-line no-continue
        continue;
      }

      const parentCollection = this.dataSource.getCollection(field.foreignCollection);

      for (const [relName, relField] of Object.entries(parentCollection.schema.fields)) {
        if (
          relField.type === 'OneToMany' &&
          relField.foreignCollection === this.name &&
          relField.originKey === fkField
        ) {
          return {
            parentTable: field.foreignCollection,
            parentPkField: field.foreignKeyTarget,
            relationshipName: relName,
            fkField,
          };
        }
      }
    }

    throw new Error(`No relationship found for FK field '${fkField}' on collection '${this.name}'`);
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
