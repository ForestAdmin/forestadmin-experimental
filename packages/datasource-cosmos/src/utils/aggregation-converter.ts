import { SqlParameter, SqlQuerySpec } from '@azure/cosmos';
import {
  AggregateResult,
  Aggregation,
  AggregationOperation,
  ConditionTree,
} from '@forestadmin/datasource-toolkit';

import QueryConverter from './query-converter';
import QueryValidator from './query-validator';
import Serializer from './serializer';

export default class AggregationConverter {
  /**
   * Shared validator instance for field name validation
   * Using permissive options since aggregation fields come from Forest Admin SDK
   */
  private static validator = new QueryValidator(undefined, {
    allowUnknownFields: true,
    maxFieldDepth: 10,
  });

  private static AGGREGATION_OPERATION: Record<AggregationOperation, string> = {
    Sum: 'SUM',
    Avg: 'AVG',
    Count: 'COUNT',
    Max: 'MAX',
    Min: 'MIN',
  };

  /**
   * Convert Forest Admin field notation (arrow ->) to Cosmos DB bracket notation.
   * Validates the field name to prevent SQL injection.
   * Uses bracket notation to avoid reserved keyword issues (e.g. "value", "type").
   */
  private static toCosmosField(field: string, context = 'Aggregation field'): string {
    this.validator.validateFieldName(field, context);

    return field
      .split('->')
      .map((part, i) => (i === 0 ? part : `["${part}"]`))
      .join('');
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
      return 'COUNT(1)';
    }

    const operation = this.AGGREGATION_OPERATION[aggregation.operation];

    return `${operation}(c.${this.toCosmosField(aggregation.field, 'Aggregation target field')})`;
  }

  /**
   * Mapping from Forest Admin DateOperation to Cosmos DB DateTimeBin parameters.
   * DateTimeBin(datetime, datePart, binSize) truncates a datetime to the nearest boundary.
   */
  private static DATE_OPERATION_TO_BIN: Record<string, { part: string; size: number }> = {
    Year: { part: 'year', size: 1 },
    Quarter: { part: 'month', size: 3 },
    Month: { part: 'month', size: 1 },
    Week: { part: 'week', size: 1 },
    Day: { part: 'day', size: 1 },
  };

  /**
   * Build a Cosmos DB expression that truncates a date field to the given granularity.
   * Uses DateTimeBin for truncation and LEFT(ToString(...), 10) to get YYYY-MM-DD format.
   */
  private static buildDateGroupExpression(field: string, operation: string): string {
    const bin = this.DATE_OPERATION_TO_BIN[operation];

    if (!bin) {
      throw new Error(`Unsupported date operation: "${operation}"`);
    }

    return `LEFT(ToString(DateTimeBin(${field}, '${bin.part}', ${bin.size})), 10)`;
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

    if (groups.length !== 1) {
      throw new Error(
        'Complex grouping with multiple fields requires ' +
          'application-level processing. Please implement this using the raw query ' +
          'results and post-processing.',
      );
    }

    const group = groups[0];
    const cosmosField = `c.${this.toCosmosField(group.field, 'Group by field')}`;

    const groupExpression = group.operation
      ? this.buildDateGroupExpression(cosmosField, group.operation)
      : cosmosField;

    const aggregateExpr = this.buildAggregateExpression(aggregation);

    const query = `
      SELECT ${groupExpression} as groupKey, ${aggregateExpr} as aggregateValue
      FROM c
      ${whereFragment}
      GROUP BY ${groupExpression}
      ORDER BY ${groupExpression}
      ${limit ? `OFFSET 0 LIMIT ${limit}` : ''}
    `
      .trim()
      .replace(/\s+/g, ' ');

    return { query, parameters };
  }

  /**
   * Process raw aggregation results into Forest Admin format
   */
  /**
   * Extract the aggregate value from a raw Cosmos DB result row.
   * Falls back to 0 when the value is undefined/null, which happens when
   * Cosmos DB SUM/AVG encounters mixed types (strings, booleans alongside numbers).
   */
  private static extractAggregateValue(result: Record<string, unknown>): unknown {
    return Serializer.serializeValue(result.aggregateValue ?? result.value ?? 0);
  }

  static processAggregationResults(
    rawResults: Array<Record<string, unknown>>,
    aggregation: Aggregation,
  ): AggregateResult[] {
    if (!aggregation.groups || aggregation.groups.length === 0) {
      if (rawResults.length === 0) {
        return [{ value: 0, group: {} }];
      }

      return [{ value: this.extractAggregateValue(rawResults[0]), group: {} }];
    }

    return rawResults.map(result => {
      const group: Record<string, unknown> = {};

      aggregation.groups.forEach((groupDef, index) => {
        group[groupDef.field] = Serializer.serializeValue(
          result.groupKey || result[`group${index}`],
        );
      });

      return { value: this.extractAggregateValue(result), group };
    });
  }
}
