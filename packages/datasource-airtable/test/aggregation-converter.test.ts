/**
 * Tests for AggregationConverter utility
 */

import { Aggregation, RecordData } from '@forestadmin/datasource-toolkit';

import AggregationConverter from '../src/utils/aggregation-converter';

describe('AggregationConverter', () => {
  const sampleRecords: RecordData[] = [
    { id: '1', name: 'Alice', age: 30, department: 'Engineering', salary: 100000 },
    { id: '2', name: 'Bob', age: 25, department: 'Engineering', salary: 80000 },
    { id: '3', name: 'Charlie', age: 35, department: 'Sales', salary: 90000 },
    { id: '4', name: 'Diana', age: 28, department: 'Sales', salary: 85000 },
    { id: '5', name: 'Eve', age: 32, department: 'Marketing', salary: 75000 },
  ];

  describe('Count operation', () => {
    it('should count all records', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Count',
        field: undefined,
        groups: undefined,
      } as unknown as Aggregation);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(5);
      expect(result[0].group).toEqual({});
    });

    it('should count records grouped by field', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Count',
        field: undefined,
        groups: [{ field: 'department' }],
      } as unknown as Aggregation);

      expect(result).toHaveLength(3);

      const engineering = result.find(r => r.group.department === 'Engineering');
      const sales = result.find(r => r.group.department === 'Sales');
      const marketing = result.find(r => r.group.department === 'Marketing');

      expect(engineering?.value).toBe(2);
      expect(sales?.value).toBe(2);
      expect(marketing?.value).toBe(1);
    });
  });

  describe('Sum operation', () => {
    it('should sum field values', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Sum',
        field: 'salary',
        groups: undefined,
      } as unknown as Aggregation);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(430000);
    });

    it('should sum with grouping', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Sum',
        field: 'salary',
        groups: [{ field: 'department' }],
      } as unknown as Aggregation);

      expect(result).toHaveLength(3);

      const engineering = result.find(r => r.group.department === 'Engineering');
      const sales = result.find(r => r.group.department === 'Sales');

      expect(engineering?.value).toBe(180000);
      expect(sales?.value).toBe(175000);
    });
  });

  describe('Avg operation', () => {
    it('should calculate average', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Avg',
        field: 'age',
        groups: undefined,
      } as unknown as Aggregation);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(30); // (30+25+35+28+32)/5 = 30
    });

    it('should return null for empty records', () => {
      const result = AggregationConverter.aggregate([], {
        operation: 'Avg',
        field: 'age',
        groups: undefined,
      } as unknown as Aggregation);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBeNull();
    });
  });

  describe('Max operation', () => {
    it('should find maximum value', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Max',
        field: 'age',
        groups: undefined,
      } as unknown as Aggregation);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(35);
    });

    it('should find max with grouping', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Max',
        field: 'salary',
        groups: [{ field: 'department' }],
      } as unknown as Aggregation);

      const engineering = result.find(r => r.group.department === 'Engineering');
      expect(engineering?.value).toBe(100000);
    });
  });

  describe('Min operation', () => {
    it('should find minimum value', () => {
      const result = AggregationConverter.aggregate(sampleRecords, {
        operation: 'Min',
        field: 'age',
        groups: undefined,
      } as unknown as Aggregation);

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe(25);
    });
  });

  describe('Limit', () => {
    it('should respect limit parameter', () => {
      const result = AggregationConverter.aggregate(
        sampleRecords,
        {
          operation: 'Count',
          field: undefined,
          groups: [{ field: 'department' }],
        } as unknown as Aggregation,
        2,
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('Date grouping operations', () => {
    const recordsWithDates: RecordData[] = [
      { id: '1', createdAt: '2024-01-15T10:00:00Z', amount: 100 },
      { id: '2', createdAt: '2024-01-20T10:00:00Z', amount: 200 },
      { id: '3', createdAt: '2024-02-10T10:00:00Z', amount: 150 },
      { id: '4', createdAt: '2024-02-15T10:00:00Z', amount: 250 },
    ];

    it('should group by month', () => {
      const result = AggregationConverter.aggregate(recordsWithDates, {
        operation: 'Sum',
        field: 'amount',
        groups: [{ field: 'createdAt', operation: 'Month' }],
      } as unknown as Aggregation);

      expect(result).toHaveLength(2);

      const jan = result.find(r => r.group.createdAt === '2024-01');
      const feb = result.find(r => r.group.createdAt === '2024-02');

      expect(jan?.value).toBe(300);
      expect(feb?.value).toBe(400);
    });

    it('should group by year', () => {
      const result = AggregationConverter.aggregate(recordsWithDates, {
        operation: 'Count',
        field: undefined,
        groups: [{ field: 'createdAt', operation: 'Year' }],
      } as unknown as Aggregation);

      expect(result).toHaveLength(1);
      expect(result[0].group.createdAt).toBe(2024);
      expect(result[0].value).toBe(4);
    });

    it('should group by day', () => {
      const result = AggregationConverter.aggregate(recordsWithDates, {
        operation: 'Count',
        field: undefined,
        groups: [{ field: 'createdAt', operation: 'Day' }],
      } as unknown as Aggregation);

      expect(result).toHaveLength(4);
    });
  });
});
