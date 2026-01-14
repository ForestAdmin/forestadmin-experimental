import convertFilter from '../../src/utils/filter-converter';

describe('FilterConverter', () => {
  describe('convertFilter', () => {
    it('should return undefined for null condition tree', () => {
      const result = convertFilter(null);
      expect(result).toBeUndefined();
    });

    it('should convert Equal operator', () => {
      const conditionTree = {
        field: 'name',
        operator: 'Equal',
        value: 'John',
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        name: { _eq: 'John' },
      });
    });

    it('should convert NotEqual operator', () => {
      const conditionTree = {
        field: 'status',
        operator: 'NotEqual',
        value: 'inactive',
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        status: { _neq: 'inactive' },
      });
    });

    it('should convert LessThan operator', () => {
      const conditionTree = {
        field: 'age',
        operator: 'LessThan',
        value: 30,
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        age: { _lt: 30 },
      });
    });

    it('should convert GreaterThan operator', () => {
      const conditionTree = {
        field: 'price',
        operator: 'GreaterThan',
        value: 100,
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        price: { _gt: 100 },
      });
    });

    it('should convert In operator', () => {
      const conditionTree = {
        field: 'status',
        operator: 'In',
        value: ['active', 'pending'],
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        status: { _in: ['active', 'pending'] },
      });
    });

    it('should convert Contains operator with escaped wildcards', () => {
      const conditionTree = {
        field: 'name',
        operator: 'Contains',
        value: 'test%value',
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        name: { _ilike: '%test\\%value%' },
      });
    });

    it('should convert StartsWith operator', () => {
      const conditionTree = {
        field: 'email',
        operator: 'StartsWith',
        value: 'admin',
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        email: { _ilike: 'admin%' },
      });
    });

    it('should convert EndsWith operator', () => {
      const conditionTree = {
        field: 'email',
        operator: 'EndsWith',
        value: '@example.com',
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        email: { _ilike: '%@example.com' },
      });
    });

    it('should convert Present operator', () => {
      const conditionTree = {
        field: 'phone',
        operator: 'Present',
        value: null,
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        phone: { _is_null: false },
      });
    });

    it('should convert Missing operator', () => {
      const conditionTree = {
        field: 'deleted_at',
        operator: 'Missing',
        value: null,
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        deleted_at: { _is_null: true },
      });
    });

    it('should convert AND branch', () => {
      const conditionTree = {
        aggregator: 'And',
        conditions: [
          { field: 'status', operator: 'Equal', value: 'active' },
          { field: 'age', operator: 'GreaterThan', value: 18 },
        ],
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        _and: [{ status: { _eq: 'active' } }, { age: { _gt: 18 } }],
      });
    });

    it('should convert OR branch', () => {
      const conditionTree = {
        aggregator: 'Or',
        conditions: [
          { field: 'role', operator: 'Equal', value: 'admin' },
          { field: 'role', operator: 'Equal', value: 'moderator' },
        ],
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        _or: [{ role: { _eq: 'admin' } }, { role: { _eq: 'moderator' } }],
      });
    });

    it('should handle nested relationship fields', () => {
      const conditionTree = {
        field: 'author:name',
        operator: 'Equal',
        value: 'John',
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        author: { name: { _eq: 'John' } },
      });
    });

    it('should handle deeply nested relationship fields', () => {
      const conditionTree = {
        field: 'author:company:name',
        operator: 'Equal',
        value: 'Acme',
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        author: { company: { name: { _eq: 'Acme' } } },
      });
    });

    it('should return single condition for branch with one condition', () => {
      const conditionTree = {
        aggregator: 'And',
        conditions: [{ field: 'status', operator: 'Equal', value: 'active' }],
      };

      const result = convertFilter(conditionTree as any);

      expect(result).toEqual({
        status: { _eq: 'active' },
      });
    });

    it('should throw for unsupported operator', () => {
      const conditionTree = {
        field: 'name',
        operator: 'UnsupportedOperator',
        value: 'test',
      };

      expect(() => convertFilter(conditionTree as any)).toThrow('Unsupported operator');
    });
  });
});
