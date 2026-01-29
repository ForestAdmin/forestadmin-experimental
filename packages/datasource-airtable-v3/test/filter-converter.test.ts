/**
 * Tests for filter-converter utility
 */

import { ConditionTree, Filter } from '@forestadmin/datasource-toolkit';

import {
  buildFields,
  buildFilterFormula,
  buildSort,
  extractRecordId,
  extractRecordIds,
} from '../src/utils/filter-converter';

describe('filter-converter', () => {
  describe('buildFilterFormula', () => {
    it('should return undefined for empty condition tree', () => {
      expect(buildFilterFormula(undefined)).toBeUndefined();
    });

    it('should handle Equal operator', () => {
      const tree = {
        field: 'Name',
        operator: 'Equal' as const,
        value: 'John',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Name} = "John"');
    });

    it('should handle NotEqual operator', () => {
      const tree = {
        field: 'Name',
        operator: 'NotEqual' as const,
        value: 'John',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Name} != "John"');
    });

    it('should handle Present operator', () => {
      const tree = {
        field: 'Name',
        operator: 'Present' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('NOT({Name} = BLANK())');
    });

    it('should handle Blank operator', () => {
      const tree = {
        field: 'Name',
        operator: 'Blank' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Name} = BLANK()');
    });

    it('should handle GreaterThan operator', () => {
      const tree = {
        field: 'Age',
        operator: 'GreaterThan' as const,
        value: 18,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Age} > 18');
    });

    it('should handle LessThan operator', () => {
      const tree = {
        field: 'Age',
        operator: 'LessThan' as const,
        value: 65,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Age} < 65');
    });

    it('should handle Contains operator', () => {
      const tree = {
        field: 'Name',
        operator: 'Contains' as const,
        value: 'John',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('FIND("John", {Name}) > 0');
    });

    it('should handle StartsWith operator', () => {
      const tree = {
        field: 'Name',
        operator: 'StartsWith' as const,
        value: 'Dr.',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('LEFT({Name}, 3) = "Dr."');
    });

    it('should handle In operator', () => {
      const tree = {
        field: 'Status',
        operator: 'In' as const,
        value: ['Active', 'Pending'],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('OR({Status} = "Active", {Status} = "Pending")');
    });

    it('should handle AND aggregator', () => {
      const tree = {
        aggregator: 'And' as const,
        conditions: [
          { field: 'Name', operator: 'Equal' as const, value: 'John' },
          { field: 'Age', operator: 'GreaterThan' as const, value: 18 },
        ],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('AND({Name} = "John", {Age} > 18)');
    });

    it('should handle OR aggregator', () => {
      const tree = {
        aggregator: 'Or' as const,
        conditions: [
          { field: 'Status', operator: 'Equal' as const, value: 'Active' },
          { field: 'Status', operator: 'Equal' as const, value: 'Pending' },
        ],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('OR({Status} = "Active", {Status} = "Pending")');
    });

    it('should handle nested conditions', () => {
      const tree = {
        aggregator: 'And' as const,
        conditions: [
          { field: 'Name', operator: 'Present' as const, value: null },
          {
            aggregator: 'Or' as const,
            conditions: [
              { field: 'Status', operator: 'Equal' as const, value: 'Active' },
              { field: 'Status', operator: 'Equal' as const, value: 'Pending' },
            ],
          },
        ],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        'AND(NOT({Name} = BLANK()), OR({Status} = "Active", {Status} = "Pending"))',
      );
    });

    it('should skip id field in formula', () => {
      const tree = {
        field: 'id',
        operator: 'Equal' as const,
        value: 'rec123',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('');
    });

    it('should handle boolean values', () => {
      const tree = {
        field: 'Active',
        operator: 'Equal' as const,
        value: true,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Active} = TRUE()');
    });

    it('should handle null values', () => {
      const tree = {
        field: 'Name',
        operator: 'Equal' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Name} = BLANK()');
    });

    it('should handle empty branch conditions', () => {
      const tree = {
        aggregator: 'And' as const,
        conditions: [],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('');
    });

    it('should handle single condition branch', () => {
      const tree = {
        aggregator: 'And' as const,
        conditions: [{ field: 'Name', operator: 'Equal' as const, value: 'John' }],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Name} = "John"');
    });

    it('should handle GreaterThanOrEqual operator', () => {
      const tree = {
        field: 'Age',
        operator: 'GreaterThanOrEqual' as const,
        value: 18,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Age} >= 18');
    });

    it('should handle LessThanOrEqual operator', () => {
      const tree = {
        field: 'Age',
        operator: 'LessThanOrEqual' as const,
        value: 65,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Age} <= 65');
    });

    it('should handle NotContains operator', () => {
      const tree = {
        field: 'Name',
        operator: 'NotContains' as const,
        value: 'test',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('FIND("test", {Name}) = 0');
    });

    it('should handle EndsWith operator', () => {
      const tree = {
        field: 'Email',
        operator: 'EndsWith' as const,
        value: '.com',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('RIGHT({Email}, 4) = ".com"');
    });

    it('should handle NotIn operator', () => {
      const tree = {
        field: 'Status',
        operator: 'NotIn' as const,
        value: ['Deleted', 'Archived'],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('NOT(OR({Status} = "Deleted", {Status} = "Archived"))');
    });

    it('should handle In operator with empty array', () => {
      const tree = {
        field: 'Status',
        operator: 'In' as const,
        value: [],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('FALSE()');
    });

    it('should handle In operator with single value', () => {
      const tree = {
        field: 'Status',
        operator: 'In' as const,
        value: ['Active'],
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Status} = "Active"');
    });

    it('should handle Today operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'Today' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe("IS_SAME({CreatedAt}, TODAY(), 'day')");
    });

    it('should handle Yesterday operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'Yesterday' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        "IS_SAME({CreatedAt}, DATEADD(TODAY(), -1, 'days'), 'day')",
      );
    });

    it('should handle Before operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'Before' as const,
        value: '2024-01-01',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('IS_BEFORE({CreatedAt}, DATETIME_PARSE("2024-01-01"))');
    });

    it('should handle After operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'After' as const,
        value: '2024-12-31',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('IS_AFTER({CreatedAt}, DATETIME_PARSE("2024-12-31"))');
    });

    it('should handle PreviousXDays operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'PreviousXDays' as const,
        value: 7,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        "AND(IS_AFTER({CreatedAt}, DATEADD(TODAY(), -7, 'days')), IS_BEFORE({CreatedAt}, DATEADD(TODAY(), 1, 'days')))",
      );
    });

    it('should handle PreviousXDays with string value', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'PreviousXDays' as const,
        value: '30',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        "AND(IS_AFTER({CreatedAt}, DATEADD(TODAY(), -30, 'days')), IS_BEFORE({CreatedAt}, DATEADD(TODAY(), 1, 'days')))",
      );
    });

    it('should handle PreviousWeek operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'PreviousWeek' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        "AND(IS_AFTER({CreatedAt}, DATEADD(TODAY(), -7, 'days')), IS_BEFORE({CreatedAt}, TODAY()))",
      );
    });

    it('should handle PreviousMonth operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'PreviousMonth' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        "AND(IS_AFTER({CreatedAt}, DATEADD(TODAY(), -1, 'months')), IS_BEFORE({CreatedAt}, TODAY()))",
      );
    });

    it('should handle PreviousQuarter operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'PreviousQuarter' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        "AND(IS_AFTER({CreatedAt}, DATEADD(TODAY(), -3, 'months')), IS_BEFORE({CreatedAt}, TODAY()))",
      );
    });

    it('should handle PreviousYear operator', () => {
      const tree = {
        field: 'CreatedAt',
        operator: 'PreviousYear' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        "AND(IS_AFTER({CreatedAt}, DATEADD(TODAY(), -1, 'years')), IS_BEFORE({CreatedAt}, TODAY()))",
      );
    });

    it('should handle Like operator', () => {
      const tree = {
        field: 'Name',
        operator: 'Like' as const,
        value: 'John%',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('REGEX_MATCH({Name}, "^John.*$")');
    });

    it('should handle Like operator with underscore', () => {
      const tree = {
        field: 'Code',
        operator: 'Like' as const,
        value: 'A_B',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('REGEX_MATCH({Code}, "^A.B$")');
    });

    it('should handle unsupported operator', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const tree = {
        field: 'Name',
        operator: 'UnsupportedOp' as const,
        value: 'test',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('');
      expect(warnSpy).toHaveBeenCalledWith('Unsupported filter operator: UnsupportedOp');
      warnSpy.mockRestore();
    });

    it('should handle NotEqual with null value', () => {
      const tree = {
        field: 'Name',
        operator: 'NotEqual' as const,
        value: null,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('NOT({Name} = BLANK())');
    });

    it('should handle Date object in Before operator', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const tree = {
        field: 'CreatedAt',
        operator: 'Before' as const,
        value: date,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        `IS_BEFORE({CreatedAt}, DATETIME_PARSE("${date.toISOString()}"))`,
      );
    });

    it('should handle Date object in Equal operator', () => {
      const date = new Date('2024-06-15T12:00:00.000Z');
      const tree = {
        field: 'CreatedAt',
        operator: 'Equal' as const,
        value: date,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe(
        `{CreatedAt} = DATETIME_PARSE("${date.toISOString()}")`,
      );
    });

    it('should escape special characters in string values', () => {
      const tree = {
        field: 'Name',
        operator: 'Equal' as const,
        value: 'John "The Great" Doe',
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Name} = "John \\"The Great\\" Doe"');
    });

    it('should handle false boolean value', () => {
      const tree = {
        field: 'Active',
        operator: 'Equal' as const,
        value: false,
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Active} = FALSE()');
    });

    it('should convert non-string/number/boolean values to string', () => {
      const tree = {
        field: 'Data',
        operator: 'Equal' as const,
        value: { toString: () => 'custom-value' },
      } as unknown as ConditionTree;
      expect(buildFilterFormula(tree)).toBe('{Data} = "custom-value"');
    });
  });

  describe('buildSort', () => {
    it('should return empty array for undefined sort', () => {
      expect(buildSort(undefined)).toEqual([]);
    });

    it('should convert sort to Airtable format', () => {
      const sort = [
        { field: 'Name', ascending: true },
        { field: 'CreatedAt', ascending: false },
      ];
      expect(buildSort(sort)).toEqual([
        { field: 'Name', direction: 'asc' },
        { field: 'CreatedAt', direction: 'desc' },
      ]);
    });

    it('should filter out id field', () => {
      const sort = [
        { field: 'id', ascending: true },
        { field: 'Name', ascending: true },
      ];
      expect(buildSort(sort)).toEqual([{ field: 'Name', direction: 'asc' }]);
    });
  });

  describe('buildFields', () => {
    it('should return undefined for empty projection', () => {
      expect(buildFields(undefined)).toBeUndefined();
      expect(buildFields(null)).toBeUndefined();
      expect(buildFields([])).toBeUndefined();
    });

    it('should filter out id field', () => {
      const projection = ['id', 'Name', 'Email'];
      expect(buildFields(projection)).toEqual(['Name', 'Email']);
    });
  });

  describe('extractRecordId', () => {
    it('should return null for undefined filter', () => {
      expect(extractRecordId(undefined)).toBeNull();
    });

    it('should extract single record ID', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'Equal' as const,
          value: 'rec123',
        },
      } as unknown as Filter;
      expect(extractRecordId(filter)).toBe('rec123');
    });

    it('should return null for non-id field', () => {
      const filter = {
        conditionTree: {
          field: 'Name',
          operator: 'Equal' as const,
          value: 'John',
        },
      } as unknown as Filter;
      expect(extractRecordId(filter)).toBeNull();
    });

    it('should return null for non-Equal operator', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'In' as const,
          value: ['rec123', 'rec456'],
        },
      } as unknown as Filter;
      expect(extractRecordId(filter)).toBeNull();
    });
  });

  describe('extractRecordIds', () => {
    it('should return null for undefined filter', () => {
      expect(extractRecordIds(undefined)).toBeNull();
    });

    it('should extract multiple record IDs', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'In' as const,
          value: ['rec123', 'rec456', 'rec789'],
        },
      } as unknown as Filter;
      expect(extractRecordIds(filter)).toEqual(['rec123', 'rec456', 'rec789']);
    });

    it('should return null for non-In operator', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'Equal' as const,
          value: 'rec123',
        },
      } as unknown as Filter;
      expect(extractRecordIds(filter)).toBeNull();
    });

    it('should return null for non-id field', () => {
      const filter = {
        conditionTree: {
          field: 'Status',
          operator: 'In' as const,
          value: ['Active', 'Pending'],
        },
      } as unknown as Filter;
      expect(extractRecordIds(filter)).toBeNull();
    });

    it('should return null when conditionTree is empty', () => {
      const filter = {} as unknown as Filter;
      expect(extractRecordIds(filter)).toBeNull();
    });
  });

  describe('extractRecordId additional', () => {
    it('should return null when conditionTree is empty', () => {
      const filter = {} as unknown as Filter;
      expect(extractRecordId(filter)).toBeNull();
    });
  });
});
