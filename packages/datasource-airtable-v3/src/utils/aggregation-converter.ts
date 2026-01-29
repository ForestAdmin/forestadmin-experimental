/**
 * Aggregation converter utility for handling Forest Admin aggregations
 * Since Airtable doesn't support server-side aggregations, we perform them client-side
 */

import { Aggregation, AggregateResult, RecordData } from '@forestadmin/datasource-toolkit';

export default class AggregationConverter {
  /**
   * Perform aggregation on a set of records
   */
  static aggregate(
    records: RecordData[],
    aggregation: Aggregation,
    limit?: number,
  ): AggregateResult[] {
    const { operation, field, groups } = aggregation;

    // Group records if needed
    const groupedRecords = AggregationConverter.groupRecords(records, groups);

    // Calculate aggregation for each group
    const results: AggregateResult[] = [];

    for (const [, { group, records: groupRecords }] of Object.entries(groupedRecords)) {
      const value = AggregationConverter.calculateAggregation(
        operation,
        field,
        groupRecords,
      );

      results.push({
        value,
        group,
      });
    }

    // Sort by value descending for most operations
    if (operation !== 'Count' || groups?.length) {
      results.sort((a, b) => {
        if (a.value === null) return 1;
        if (b.value === null) return -1;

        return (b.value as number) - (a.value as number);
      });
    }

    // Apply limit
    if (limit && results.length > limit) {
      return results.slice(0, limit);
    }

    return results;
  }

  /**
   * Group records by specified grouping fields
   */
  private static groupRecords(
    records: RecordData[],
    groups?: Array<{ field: string; operation?: string }>,
  ): Record<string, { group: Record<string, unknown>; records: RecordData[] }> {
    const grouped: Record<string, { group: Record<string, unknown>; records: RecordData[] }> = {};

    if (!groups || groups.length === 0) {
      // No grouping - single group with all records
      grouped['__all__'] = {
        group: {},
        records,
      };

      return grouped;
    }

    for (const record of records) {
      // Build group key and group object
      const groupValues: Record<string, unknown> = {};
      const keyParts: string[] = [];

      for (const g of groups) {
        let value = record[g.field];

        // Apply grouping operation if specified (e.g., 'Day', 'Month', 'Year' for dates)
        if (g.operation && value) {
          value = AggregationConverter.applyGroupingOperation(value, g.operation);
        }

        groupValues[g.field] = value;
        keyParts.push(String(value ?? '__null__'));
      }

      const key = keyParts.join('|');

      if (!grouped[key]) {
        grouped[key] = {
          group: groupValues,
          records: [],
        };
      }

      grouped[key].records.push(record);
    }

    return grouped;
  }

  /**
   * Apply grouping operation to a value (e.g., extracting month from date)
   */
  private static applyGroupingOperation(
    value: unknown,
    operation: string,
  ): unknown {
    if (!value) {
      return null;
    }

    const date = new Date(String(value));

    if (isNaN(date.getTime())) {
      return value;
    }

    switch (operation) {
      case 'Year':
        return date.getFullYear();

      case 'Month':
        // Return as YYYY-MM format
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      case 'Week': {
        // Return ISO week number
        const yearStart = new Date(date.getFullYear(), 0, 1);
        const weekNum = Math.ceil(
          ((date.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7,
        );

        return `${date.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
      }

      case 'Day':
        // Return as YYYY-MM-DD format
        return date.toISOString().split('T')[0];

      default:
        return value;
    }
  }

  /**
   * Calculate aggregation value for a group of records
   */
  private static calculateAggregation(
    operation: string,
    field: string | undefined,
    records: RecordData[],
  ): unknown {
    switch (operation) {
      case 'Count':
        return records.length;

      case 'Sum':
        return AggregationConverter.calculateSum(records, field!);

      case 'Avg':
        return AggregationConverter.calculateAvg(records, field!);

      case 'Max':
        return AggregationConverter.calculateMax(records, field!);

      case 'Min':
        return AggregationConverter.calculateMin(records, field!);

      default:
        console.warn(`Unsupported aggregation operation: ${operation}`);

        return null;
    }
  }

  /**
   * Calculate sum of field values
   */
  private static calculateSum(records: RecordData[], field: string): number {
    return records.reduce((sum, record) => {
      const value = Number(record[field]);

      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  }

  /**
   * Calculate average of field values
   */
  private static calculateAvg(records: RecordData[], field: string): number | null {
    if (records.length === 0) {
      return null;
    }

    const validRecords = records.filter(r => {
      const value = r[field];

      return value !== null && value !== undefined && !isNaN(Number(value));
    });

    if (validRecords.length === 0) {
      return null;
    }

    const sum = AggregationConverter.calculateSum(validRecords, field);

    return sum / validRecords.length;
  }

  /**
   * Calculate maximum value
   */
  private static calculateMax(records: RecordData[], field: string): number | null {
    const values = records
      .map(r => Number(r[field]))
      .filter(v => !isNaN(v));

    if (values.length === 0) {
      return null;
    }

    return Math.max(...values);
  }

  /**
   * Calculate minimum value
   */
  private static calculateMin(records: RecordData[], field: string): number | null {
    const values = records
      .map(r => Number(r[field]))
      .filter(v => !isNaN(v));

    if (values.length === 0) {
      return null;
    }

    return Math.min(...values);
  }
}
