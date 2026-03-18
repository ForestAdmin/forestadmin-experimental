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
   * Mapping from Forest Admin DateOperation to the number of characters to extract
   * from an ISO 8601 date string (e.g. "2024-01-15T10:30:00Z").
   * Year: 4 chars -> "2024", Month: 7 -> "2024-01", Day: 10 -> "2024-01-15"
   */
  private static DATE_OPERATION_TO_LENGTH: Record<string, number> = {
    Year: 4,
    Month: 7,
    Day: 10,
  };

  /** Date operations that require post-processing rollup from daily data */
  private static ROLLUP_OPERATIONS = new Set(['Week', 'Quarter']);

  /**
   * Build a Cosmos DB expression that truncates a date field to the given granularity.
   * Uses LEFT() on ISO 8601 string dates.
   * Week and Quarter query at Day granularity for performance (avoids
   * expensive computed expressions in GROUP BY) and roll up in post-processing.
   */
  private static buildDateGroupExpression(field: string, operation: string): string {
    // Week/Quarter: query at Day level, roll up in processAggregationResults
    if (this.ROLLUP_OPERATIONS.has(operation)) {
      return `LEFT(${field}, 10)`;
    }

    const length = this.DATE_OPERATION_TO_LENGTH[operation];

    if (!length) {
      throw new Error(`Unsupported date operation: "${operation}"`);
    }

    return `LEFT(${field}, ${length})`;
  }

  /**
   * Compute the Monday of the week for a given "YYYY-MM-DD" date string.
   */
  private static getMonday(dateStr: string): string {
    const date = new Date(`${dateStr}T00:00:00Z`);
    const day = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const diff = (day + 6) % 7; // days since Monday
    date.setUTCDate(date.getUTCDate() - diff);

    return date.toISOString().slice(0, 10);
  }

  /**
   * Compute the first day of the quarter for a "YYYY-MM-DD" date string.
   * Returns "YYYY-MM-01" where MM is 01, 04, 07, or 10.
   */
  private static getQuarterStart(dateStr: string): string {
    const month = parseInt(dateStr.slice(5, 7), 10);
    const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;

    return `${dateStr.slice(0, 4)}-${String(quarterStartMonth).padStart(2, '0')}-01`;
  }

  /**
   * Reduce two values according to the aggregation operation.
   */
  private static reduce(op: AggregationOperation, current: number, incoming: number): number {
    switch (op) {
      case 'Max':
        return Math.max(current, incoming);
      case 'Min':
        return Math.min(current, incoming);
      default: // Sum, Count, Avg
        return current + incoming;
    }
  }

  /**
   * Roll up daily aggregation results into coarser time buckets.
   * Used for Week and Quarter to avoid expensive Cosmos DB computed expressions.
   * Applies the correct reduction per aggregation operation.
   */
  private static rollupResults(
    results: AggregateResult[],
    aggregation: Aggregation,
  ): AggregateResult[] {
    const group = aggregation.groups[0];
    const op = aggregation.operation;
    const bucketFn = group.operation === 'Week' ? this.getMonday : this.getQuarterStart;

    const buckets = new Map<string, number>();
    const counts = new Map<string, number>();

    for (const result of results) {
      const rawValue = result.group[group.field];

      if (rawValue != null) {
        const bucketKey = bucketFn(String(rawValue));

        const value = Number(result.value) || 0;

        if (buckets.has(bucketKey)) {
          buckets.set(bucketKey, this.reduce(op, buckets.get(bucketKey)!, value));
        } else {
          buckets.set(bucketKey, value);
        }

        counts.set(bucketKey, (counts.get(bucketKey) || 0) + 1);
      }
    }

    // For Avg, divide the accumulated sum by the number of days
    if (op === 'Avg') {
      for (const [key, sum] of buckets) {
        buckets.set(key, sum / counts.get(key)!);
      }
    }

    return Array.from(buckets.entries()).map(([key, value]) => ({
      value,
      group: { [group.field]: key },
    }));
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

    const results = rawResults.map(result => {
      const group: Record<string, unknown> = {};

      aggregation.groups.forEach((groupDef, index) => {
        group[groupDef.field] = Serializer.serializeValue(
          result.groupKey || result[`group${index}`],
        );
      });

      return { value: this.extractAggregateValue(result), group };
    });

    // Roll up daily results into Week/Quarter buckets
    const dateOp = aggregation.groups[0]?.operation;

    if (dateOp && this.ROLLUP_OPERATIONS.has(dateOp)) {
      return this.rollupResults(results, aggregation);
    }

    return results;
  }
}
