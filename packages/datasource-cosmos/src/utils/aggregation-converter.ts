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

  /**
   * Build a Cosmos DB expression that truncates a date field to the given granularity.
   * Uses LEFT() on ISO 8601 string dates for Year/Month/Day.
   * Week uses DateTimeAdd/DateTimePart to compute Monday of the week.
   */
  private static buildDateGroupExpression(field: string, operation: string): string {
    if (operation === 'Week') {
      // Compute the Monday of the week using Cosmos DB date functions.
      // DateTimePart("dw", ...) returns 1=Sunday ... 7=Saturday.
      // To get days-since-Monday: (dw + 5) % 7 → Mon=0, Tue=1, ..., Sun=6.
      // Subtract that many days to get Monday's date.
      return `LEFT(DateTimeAdd("day", -1 * ((DateTimePart("dw", ${field}) + 5) % 7), ${field}), 10)`;
    }

    if (operation === 'Quarter') {
      // Return first day of the quarter as "YYYY-MM-01" so Forest Admin can parse it.
      // Compute quarter start month: FLOOR((month - 1) / 3) * 3 + 1
      // e.g. Jan-Mar -> 01, Apr-Jun -> 04, Jul-Sep -> 07, Oct-Dec -> 10
      const startMonth = `FLOOR((DateTimePart("mm", ${field}) - 1) / 3) * 3 + 1`;

      return `CONCAT(LEFT(${field}, 4), "-", RIGHT(CONCAT("0", ToString(${startMonth})), 2), "-01")`;
    }

    const length = this.DATE_OPERATION_TO_LENGTH[operation];

    if (!length) {
      throw new Error(`Unsupported date operation: "${operation}"`);
    }

    return `LEFT(${field}, ${length})`;
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
