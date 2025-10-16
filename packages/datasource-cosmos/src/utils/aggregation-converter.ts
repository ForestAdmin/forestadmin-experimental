import { SqlParameter, SqlQuerySpec } from '@azure/cosmos';
import {
  AggregateResult,
  Aggregation,
  AggregationOperation,
  ConditionTree,
  DateOperation,
} from '@forestadmin/datasource-toolkit';

import QueryConverter from './query-converter';
import Serializer from './serializer';

export default class AggregationConverter {
  private static AGGREGATION_OPERATION: Record<AggregationOperation, string> = {
    Sum: 'SUM',
    Avg: 'AVG',
    Count: 'COUNT',
    Max: 'MAX',
    Min: 'MIN',
  };

  /**
   * Build SQL aggregation query for Cosmos DB
   */
  static buildAggregationQuery(
    aggregation: Aggregation,
    conditionTree?: ConditionTree,
    limit?: number,
  ): SqlQuerySpec {
    const queryConverter = new QueryConverter();
    const { where, parameters } = queryConverter.getWhereClause(conditionTree);
    const whereFragment = where ? `WHERE ${where}` : '';

    // Handle simple aggregation without grouping
    if (!aggregation.groups || aggregation.groups.length === 0) {
      const selectClause = this.buildAggregateExpression(aggregation);
      const query = `SELECT ${selectClause} as value FROM c ${whereFragment}`;

      return { query, parameters };
    }

    // Handle aggregation with grouping
    return this.buildGroupedAggregationQuery(aggregation, whereFragment, parameters, limit);
  }

  /**
   * Build SELECT clause for aggregation expression
   */
  private static buildAggregateExpression(aggregation: Aggregation): string {
    if (!aggregation.field) {
      // COUNT(*) case
      return 'COUNT(1)';
    }

    const operation = this.AGGREGATION_OPERATION[aggregation.operation];
    const fieldPath = `c.${aggregation.field}`;

    return `${operation}(${fieldPath})`;
  }

  /**
   * Build aggregation query with grouping
   */
  private static buildGroupedAggregationQuery(
    aggregation: Aggregation,
    whereFragment: string,
    parameters: SqlParameter[],
    limit?: number,
  ): SqlQuerySpec {
    const groups = aggregation.groups || [];

    // Build the aggregate expression
    const aggregateExpr = this.buildAggregateExpression(aggregation);

    // Build the full query
    // Note: Cosmos DB doesn't support GROUP BY directly in SQL API
    // We need to use a different approach with subqueries or application-level grouping
    // For now, we'll use VALUE syntax with DISTINCT for simple grouping

    if (groups.length === 1 && !groups[0].operation) {
      // Simple single field grouping
      const groupField = `c.${groups[0].field}`;

      // For Count operation without field, we need a different approach
      if (aggregation.operation === 'Count' && !aggregation.field) {
        const query = `
          SELECT ${groupField} as groupKey, COUNT(1) as value
          FROM c
          ${whereFragment}
          GROUP BY ${groupField}
          ORDER BY ${groupField}
          ${limit ? `OFFSET 0 LIMIT ${limit}` : ''}
        `
          .trim()
          .replace(/\s+/g, ' ');

        return { query, parameters };
      }

      // For other aggregations
      const query = `
        SELECT ${groupField} as groupKey, ${aggregateExpr} as value
        FROM c
        ${whereFragment}
        GROUP BY ${groupField}
        ORDER BY ${groupField}
        ${limit ? `OFFSET 0 LIMIT ${limit}` : ''}
      `
        .trim()
        .replace(/\s+/g, ' ');

      return { query, parameters };
    }

    // Multiple groups or date operations - more complex, needs special handling
    // For now, throw an error as this requires more complex implementation
    const errorMessage =
      'Complex grouping with multiple fields or date operations requires ' +
      'application-level processing. Please implement this using the raw query ' +
      'results and post-processing.';

    throw new Error(errorMessage);
  }

  /**
   * Build date grouping expression
   */
  private static buildDateGroupExpression(
    field: string,
    operation: DateOperation,
    alias: string,
  ): string {
    const fieldPath = `c.${field}`;

    switch (operation) {
      case 'Year':
        return `DateTimeYear(${fieldPath}) as ${alias}`;
      case 'Month':
        return `CONCAT(DateTimeYear(${fieldPath}), '-', DateTimeMonth(${fieldPath})) as ${alias}`;
      case 'Week':
        // Cosmos DB doesn't have built-in week function, we'll approximate
        return `DateTimeDay(${fieldPath}) as ${alias}`;
      case 'Day':
        return (
          `CONCAT(DateTimeYear(${fieldPath}), '-', DateTimeMonth(${fieldPath}), '-', ` +
          `DateTimeDay(${fieldPath})) as ${alias}`
        );
      default:
        throw new Error(`Unsupported date operation: ${operation}`);
    }
  }

  /**
   * Process raw aggregation results into Forest Admin format
   */
  static processAggregationResults(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rawResults: any[],
    aggregation: Aggregation,
  ): AggregateResult[] {
    // Handle simple aggregation without grouping
    if (!aggregation.groups || aggregation.groups.length === 0) {
      if (rawResults.length === 0) {
        return [{ value: 0, group: {} }];
      }

      return [
        {
          value: Serializer.serializeValue(rawResults[0].value),
          group: {},
        },
      ];
    }

    // Handle grouped aggregation
    return rawResults.map(result => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const group: Record<string, any> = {};

      if (aggregation.groups) {
        aggregation.groups.forEach((groupDef, index) => {
          const groupKey = result.groupKey || result[`group${index}`];
          group[groupDef.field] = Serializer.serializeValue(groupKey);
        });
      }

      return {
        value: Serializer.serializeValue(result.value),
        group,
      };
    });
  }

  /**
   * Build a simpler aggregation query for single-group scenarios
   */
  static buildSimpleAggregationQuery(
    operation: AggregationOperation,
    field: string | null,
    groupByField: string | null,
    conditionTree?: ConditionTree,
    limit?: number,
  ): SqlQuerySpec {
    const queryConverter = new QueryConverter();
    const { where, parameters } = queryConverter.getWhereClause(conditionTree);
    const whereFragment = where ? `WHERE ${where}` : '';

    let selectClause: string;
    let groupByClause = '';
    let orderByClause = '';

    if (!field) {
      // COUNT(*) case
      selectClause = groupByField
        ? `c.${groupByField} as groupKey, COUNT(1) as value`
        : 'COUNT(1) as value';
    } else {
      const op = this.AGGREGATION_OPERATION[operation];
      const fieldPath = `c.${field}`;
      selectClause = groupByField
        ? `c.${groupByField} as groupKey, ${op}(${fieldPath}) as value`
        : `${op}(${fieldPath}) as value`;
    }

    if (groupByField) {
      groupByClause = `GROUP BY c.${groupByField}`;
      orderByClause = `ORDER BY c.${groupByField}`;
    }

    const limitClause = limit && groupByField ? `OFFSET 0 LIMIT ${limit}` : '';

    const queryString =
      `SELECT ${selectClause} FROM c ${whereFragment} ${groupByClause} ` +
      `${orderByClause} ${limitClause}`;
    const query = queryString.trim().replace(/\s+/g, ' ');

    return { query, parameters };
  }
}
