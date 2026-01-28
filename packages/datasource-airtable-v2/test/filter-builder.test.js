/**
 * Tests for filter-builder.js
 * Tests all filter operators and formula building
 */

const {
  escapeFormulaString,
  formatValue,
  buildCondition,
  buildFilterFormula,
  buildSort,
  buildFields,
  extractRecordId,
  extractRecordIds,
} = require('../src/filter-builder');

describe('filter-builder', () => {
  describe('escapeFormulaString()', () => {
    it('should return non-string values as strings', () => {
      expect(escapeFormulaString(123)).toBe('123');
      expect(escapeFormulaString(true)).toBe('true');
    });

    it('should return plain strings unchanged', () => {
      expect(escapeFormulaString('hello')).toBe('hello');
      expect(escapeFormulaString('test string')).toBe('test string');
    });

    it('should escape double quotes', () => {
      expect(escapeFormulaString('say "hello"')).toBe('say \\"hello\\"');
    });

    it('should escape backslashes', () => {
      expect(escapeFormulaString('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape both quotes and backslashes', () => {
      expect(escapeFormulaString('say \\"hi\\"')).toBe('say \\\\\\"hi\\\\\\"');
    });
  });

  describe('formatValue()', () => {
    it('should format null as BLANK()', () => {
      expect(formatValue(null)).toBe('BLANK()');
    });

    it('should format undefined as BLANK()', () => {
      expect(formatValue(undefined)).toBe('BLANK()');
    });

    it('should format true as TRUE()', () => {
      expect(formatValue(true)).toBe('TRUE()');
    });

    it('should format false as FALSE()', () => {
      expect(formatValue(false)).toBe('FALSE()');
    });

    it('should format numbers as strings', () => {
      expect(formatValue(42)).toBe('42');
      expect(formatValue(3.14)).toBe('3.14');
      expect(formatValue(-10)).toBe('-10');
    });

    it('should format Date objects as quoted ISO strings', () => {
      const date = new Date('2024-01-15T12:00:00Z');
      expect(formatValue(date)).toBe('"2024-01-15T12:00:00.000Z"');
    });

    it('should format strings with quotes', () => {
      expect(formatValue('hello')).toBe('"hello"');
    });

    it('should escape special characters in strings', () => {
      expect(formatValue('say "hi"')).toBe('"say \\"hi\\""');
    });
  });

  describe('buildCondition()', () => {
    describe('Equal operator', () => {
      it('should build equality condition', () => {
        expect(buildCondition('Name', 'Equal', 'John')).toBe('{Name} = "John"');
      });

      it('should handle null value', () => {
        expect(buildCondition('Name', 'Equal', null)).toBe('{Name} = BLANK()');
      });

      it('should handle undefined value', () => {
        expect(buildCondition('Name', 'Equal', undefined)).toBe('{Name} = BLANK()');
      });

      it('should handle number value', () => {
        expect(buildCondition('Age', 'Equal', 25)).toBe('{Age} = 25');
      });

      it('should handle boolean value', () => {
        expect(buildCondition('Active', 'Equal', true)).toBe('{Active} = TRUE()');
      });
    });

    describe('NotEqual operator', () => {
      it('should build not-equal condition', () => {
        expect(buildCondition('Name', 'NotEqual', 'John')).toBe('{Name} != "John"');
      });

      it('should handle null value', () => {
        expect(buildCondition('Name', 'NotEqual', null)).toBe('{Name} != BLANK()');
      });
    });

    describe('Comparison operators', () => {
      it('should build GreaterThan condition', () => {
        expect(buildCondition('Age', 'GreaterThan', 18)).toBe('{Age} > 18');
      });

      it('should build LessThan condition', () => {
        expect(buildCondition('Age', 'LessThan', 65)).toBe('{Age} < 65');
      });

      it('should build GreaterThanOrEqual condition', () => {
        expect(buildCondition('Age', 'GreaterThanOrEqual', 18)).toBe('{Age} >= 18');
      });

      it('should build LessThanOrEqual condition', () => {
        expect(buildCondition('Age', 'LessThanOrEqual', 65)).toBe('{Age} <= 65');
      });
    });

    describe('String operators', () => {
      it('should build Contains condition', () => {
        expect(buildCondition('Name', 'Contains', 'oh')).toBe('FIND("oh", {Name}) > 0');
      });

      it('should build NotContains condition', () => {
        expect(buildCondition('Name', 'NotContains', 'oh')).toBe('FIND("oh", {Name}) = 0');
      });

      it('should build StartsWith condition', () => {
        expect(buildCondition('Name', 'StartsWith', 'Jo')).toBe('LEFT({Name}, 2) = "Jo"');
      });

      it('should build EndsWith condition', () => {
        expect(buildCondition('Name', 'EndsWith', 'hn')).toBe('RIGHT({Name}, 2) = "hn"');
      });
    });

    describe('Presence operators', () => {
      it('should build Present condition', () => {
        expect(buildCondition('Name', 'Present')).toBe('{Name} != BLANK()');
      });

      it('should build Blank condition', () => {
        expect(buildCondition('Name', 'Blank')).toBe('{Name} = BLANK()');
      });
    });

    describe('Date operators', () => {
      it('should build Before condition', () => {
        const date = new Date('2024-01-15T12:00:00Z');
        expect(buildCondition('CreatedAt', 'Before', date)).toBe('IS_BEFORE({CreatedAt}, "2024-01-15T12:00:00.000Z")');
      });

      it('should build After condition', () => {
        const date = new Date('2024-01-15T12:00:00Z');
        expect(buildCondition('CreatedAt', 'After', date)).toBe('IS_AFTER({CreatedAt}, "2024-01-15T12:00:00.000Z")');
      });
    });

    describe('In/NotIn operators', () => {
      it('should build In condition with multiple values', () => {
        expect(buildCondition('Status', 'In', ['Active', 'Pending'])).toBe('OR({Status} = "Active", {Status} = "Pending")');
      });

      it('should return FALSE() for empty In array', () => {
        expect(buildCondition('Status', 'In', [])).toBe('FALSE()');
      });

      it('should build NotIn condition with multiple values', () => {
        expect(buildCondition('Status', 'NotIn', ['Deleted', 'Archived'])).toBe('AND({Status} != "Deleted", {Status} != "Archived")');
      });

      it('should return TRUE() for empty NotIn array', () => {
        expect(buildCondition('Status', 'NotIn', [])).toBe('TRUE()');
      });
    });

    describe('Unknown operator', () => {
      it('should default to Equal for unknown operators', () => {
        // Capture console.warn
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

        expect(buildCondition('Name', 'UnknownOp', 'value')).toBe('{Name} = "value"');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown operator'));

        warnSpy.mockRestore();
      });
    });
  });

  describe('buildFilterFormula()', () => {
    it('should return null for null/undefined condition tree', () => {
      expect(buildFilterFormula(null)).toBeNull();
      expect(buildFilterFormula(undefined)).toBeNull();
    });

    it('should build formula for single condition', () => {
      const tree = { field: 'Name', operator: 'Equal', value: 'John' };
      expect(buildFilterFormula(tree)).toBe('{Name} = "John"');
    });

    it('should skip id field conditions', () => {
      const tree = { field: 'id', operator: 'Equal', value: 'rec123' };
      expect(buildFilterFormula(tree)).toBeNull();
    });

    it('should build AND formula for multiple conditions', () => {
      const tree = {
        aggregator: 'and',
        conditions: [
          { field: 'Name', operator: 'Equal', value: 'John' },
          { field: 'Age', operator: 'GreaterThan', value: 18 },
        ],
      };
      expect(buildFilterFormula(tree)).toBe('AND({Name} = "John", {Age} > 18)');
    });

    it('should build OR formula for multiple conditions', () => {
      const tree = {
        aggregator: 'or',
        conditions: [
          { field: 'Status', operator: 'Equal', value: 'Active' },
          { field: 'Status', operator: 'Equal', value: 'Pending' },
        ],
      };
      expect(buildFilterFormula(tree)).toBe('OR({Status} = "Active", {Status} = "Pending")');
    });

    it('should filter out invalid conditions', () => {
      const tree = {
        aggregator: 'and',
        conditions: [
          { field: 'id', operator: 'Equal', value: 'rec123' }, // Should be skipped
          { field: 'Name', operator: 'Equal', value: 'John' },
        ],
      };
      expect(buildFilterFormula(tree)).toBe('{Name} = "John"');
    });

    it('should return null if all conditions are invalid', () => {
      const tree = {
        aggregator: 'and',
        conditions: [
          { field: 'id', operator: 'Equal', value: 'rec123' },
        ],
      };
      expect(buildFilterFormula(tree)).toBeNull();
    });

    it('should handle nested condition trees', () => {
      const tree = {
        aggregator: 'and',
        conditions: [
          { field: 'Active', operator: 'Equal', value: true },
          {
            aggregator: 'or',
            conditions: [
              { field: 'Role', operator: 'Equal', value: 'Admin' },
              { field: 'Role', operator: 'Equal', value: 'Manager' },
            ],
          },
        ],
      };
      expect(buildFilterFormula(tree)).toBe('AND({Active} = TRUE(), OR({Role} = "Admin", {Role} = "Manager"))');
    });

    it('should return single condition without aggregator wrapper', () => {
      const tree = {
        aggregator: 'and',
        conditions: [
          { field: 'Name', operator: 'Equal', value: 'John' },
        ],
      };
      expect(buildFilterFormula(tree)).toBe('{Name} = "John"');
    });

    it('should handle empty conditions array', () => {
      const tree = {
        aggregator: 'and',
        conditions: [],
      };
      expect(buildFilterFormula(tree)).toBeNull();
    });

    it('should handle case-insensitive aggregator', () => {
      const tree = {
        aggregator: 'AND',
        conditions: [
          { field: 'A', operator: 'Equal', value: 1 },
          { field: 'B', operator: 'Equal', value: 2 },
        ],
      };
      expect(buildFilterFormula(tree)).toBe('AND({A} = 1, {B} = 2)');
    });
  });

  describe('buildSort()', () => {
    it('should return empty array for null/undefined', () => {
      expect(buildSort(null)).toEqual([]);
      expect(buildSort(undefined)).toEqual([]);
    });

    it('should return empty array for empty array', () => {
      expect(buildSort([])).toEqual([]);
    });

    it('should build ascending sort', () => {
      const clauses = [{ field: 'Name', ascending: true }];
      expect(buildSort(clauses)).toEqual([{ field: 'Name', direction: 'asc' }]);
    });

    it('should build descending sort', () => {
      const clauses = [{ field: 'Name', ascending: false }];
      expect(buildSort(clauses)).toEqual([{ field: 'Name', direction: 'desc' }]);
    });

    it('should handle multiple sort clauses', () => {
      const clauses = [
        { field: 'Status', ascending: true },
        { field: 'CreatedAt', ascending: false },
      ];
      expect(buildSort(clauses)).toEqual([
        { field: 'Status', direction: 'asc' },
        { field: 'CreatedAt', direction: 'desc' },
      ]);
    });

    it('should filter out id field', () => {
      const clauses = [
        { field: 'id', ascending: true },
        { field: 'Name', ascending: true },
      ];
      expect(buildSort(clauses)).toEqual([{ field: 'Name', direction: 'asc' }]);
    });
  });

  describe('buildFields()', () => {
    it('should return null for null/undefined projection', () => {
      expect(buildFields(null)).toBeNull();
      expect(buildFields(undefined)).toBeNull();
    });

    it('should return null for empty projection', () => {
      expect(buildFields([])).toBeNull();
    });

    it('should filter out id field', () => {
      expect(buildFields(['id', 'Name', 'Email'])).toEqual(['Name', 'Email']);
    });

    it('should return all fields except id', () => {
      expect(buildFields(['Name', 'Email', 'Phone'])).toEqual(['Name', 'Email', 'Phone']);
    });

    it('should handle projection with only id', () => {
      expect(buildFields(['id'])).toEqual([]);
    });
  });

  describe('extractRecordId()', () => {
    it('should return null for null/undefined filter', () => {
      expect(extractRecordId(null)).toBeNull();
      expect(extractRecordId(undefined)).toBeNull();
    });

    it('should return null for filter without conditionTree', () => {
      expect(extractRecordId({})).toBeNull();
    });

    it('should return record ID for simple id equality filter', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'Equal',
          value: 'rec123',
        },
      };
      expect(extractRecordId(filter)).toBe('rec123');
    });

    it('should return null for non-id field', () => {
      const filter = {
        conditionTree: {
          field: 'Name',
          operator: 'Equal',
          value: 'John',
        },
      };
      expect(extractRecordId(filter)).toBeNull();
    });

    it('should return null for non-Equal operator', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'In',
          value: ['rec1', 'rec2'],
        },
      };
      expect(extractRecordId(filter)).toBeNull();
    });

    it('should return null for empty value', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'Equal',
          value: '',
        },
      };
      expect(extractRecordId(filter)).toBeNull();
    });
  });

  describe('extractRecordIds()', () => {
    it('should return null for null/undefined filter', () => {
      expect(extractRecordIds(null)).toBeNull();
      expect(extractRecordIds(undefined)).toBeNull();
    });

    it('should return null for filter without conditionTree', () => {
      expect(extractRecordIds({})).toBeNull();
    });

    it('should return record IDs for id In filter', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'In',
          value: ['rec1', 'rec2', 'rec3'],
        },
      };
      expect(extractRecordIds(filter)).toEqual(['rec1', 'rec2', 'rec3']);
    });

    it('should return null for non-id field', () => {
      const filter = {
        conditionTree: {
          field: 'Status',
          operator: 'In',
          value: ['Active', 'Pending'],
        },
      };
      expect(extractRecordIds(filter)).toBeNull();
    });

    it('should return null for non-In operator', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'Equal',
          value: 'rec123',
        },
      };
      expect(extractRecordIds(filter)).toBeNull();
    });

    it('should return null for non-array value', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'In',
          value: 'rec123',
        },
      };
      expect(extractRecordIds(filter)).toBeNull();
    });
  });
});
