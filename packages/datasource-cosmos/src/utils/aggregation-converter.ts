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
   * Convert Forest Admin field notation (arrow ->) to Cosmos DB notation (dot .)
   */
  private static toCosmosField(field: string): string {
    return field.replace(/->/g, '.');
  }

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
      const query = `SELECT ${selectClause} as aggregateValue FROM c ${whereFragment}`;

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
    const cosmosField = this.toCosmosField(aggregation.field);
    const fieldPath = `c.${cosmosField}`;

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
      const cosmosGroupField = this.toCosmosField(groups[0].field);
      const groupField = `c.${cosmosGroupField}`;

      // For Count operation without field, we need a different approach
      if (aggregation.operation === 'Count' && !aggregation.field) {
        const query = `
          SELECT ${groupField} as groupKey, COUNT(1) as aggregateValue
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
        SELECT ${groupField} as groupKey, ${aggregateExpr} as aggregateValue
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
    const cosmosField = this.toCosmosField(field);
    const fieldPath = `c.${cosmosField}`;

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
    rawResults: Array<Record<string, unknown>>,
    aggregation: Aggregation,
  ): AggregateResult[] {
    // Handle simple aggregation without grouping
    if (!aggregation.groups || aggregation.groups.length === 0) {
      if (rawResults.length === 0) {
        return [{ value: 0, group: {} }];
      }

      const firstResult = rawResults[0];
      const resultValue = (firstResult.aggregateValue ?? firstResult.value) as unknown;

      return [
        {
          value: Serializer.serializeValue(resultValue),
          group: {},
        },
      ];
    }

    // Handle grouped aggregation
    return rawResults.map(result => {
      const group: Record<string, unknown> = {};

      if (aggregation.groups) {
        aggregation.groups.forEach((groupDef, index) => {
          const groupKey = result.groupKey || result[`group${index}`];
          group[groupDef.field] = Serializer.serializeValue(groupKey);
        });
      }

      return {
        value: Serializer.serializeValue(result.aggregateValue ?? result.value),
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

    const cosmosField = field ? this.toCosmosField(field) : null;
    const cosmosGroupByField = groupByField ? this.toCosmosField(groupByField) : null;

    if (!cosmosField) {
      // COUNT(*) case
      selectClause = cosmosGroupByField
        ? `c.${cosmosGroupByField} as groupKey, COUNT(1) as aggregateValue`
        : 'COUNT(1) as aggregateValue';
    } else {
      const op = this.AGGREGATION_OPERATION[operation];
      const fieldPath = `c.${cosmosField}`;
      selectClause = cosmosGroupByField
        ? `c.${cosmosGroupByField} as groupKey, ${op}(${fieldPath}) as aggregateValue`
        : `${op}(${fieldPath}) as aggregateValue`;
    }

    if (cosmosGroupByField) {
      groupByClause = `GROUP BY c.${cosmosGroupByField}`;
      orderByClause = `ORDER BY c.${cosmosGroupByField}`;
    }

    const limitClause = limit && groupByField ? `OFFSET 0 LIMIT ${limit}` : '';

    const queryString =
      `SELECT ${selectClause} FROM c ${whereFragment} ${groupByClause} ` +
      `${orderByClause} ${limitClause}`;
    const query = queryString.trim().replace(/\s+/g, ' ');

    return { query, parameters };
  }
}
