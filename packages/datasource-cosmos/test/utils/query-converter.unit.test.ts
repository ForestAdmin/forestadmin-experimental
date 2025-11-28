import { ConditionTreeBranch, ConditionTreeLeaf, Sort } from '@forestadmin/datasource-toolkit';

import QueryConverter from '../../src/utils/query-converter';

describe('QueryConverter', () => {
  let converter: QueryConverter;

  beforeEach(() => {
    converter = new QueryConverter();
  });

  describe('getSqlQuerySpec', () => {
    describe('with no conditions', () => {
      it('should return simple SELECT * query when no conditions provided', () => {
        const result = converter.getSqlQuerySpec();

        expect(result.query).toBe('SELECT c FROM c');
        expect(result.parameters).toEqual([]);
      });

      it('should handle projection with simple fields', () => {
        const result = converter.getSqlQuerySpec(undefined, undefined, ['id', 'name', 'status']);

        expect(result.query).toBe('SELECT c.id, c.name, c.status FROM c');
      });

      it('should handle projection with nested fields by selecting parent', () => {
        const result = converter.getSqlQuerySpec(undefined, undefined, [
          'id',
          'address->city',
          'address->country',
        ]);

        expect(result.query).toBe('SELECT c.id, c.address FROM c');
      });
    });

    describe('with sort', () => {
      it('should add ORDER BY clause for ascending sort', () => {
        const sort = [{ field: 'name', ascending: true }] as unknown as Sort;
        const result = converter.getSqlQuerySpec(undefined, sort);

        expect(result.query).toBe('SELECT c FROM c  ORDER BY c.name ASC');
      });

      it('should add ORDER BY clause for descending sort', () => {
        const sort = [{ field: 'createdAt', ascending: false }] as unknown as Sort;
        const result = converter.getSqlQuerySpec(undefined, sort);

        expect(result.query).toBe('SELECT c FROM c  ORDER BY c.createdAt DESC');
      });

      it('should handle multiple sort fields', () => {
        const sort = [
          { field: 'status', ascending: true },
          { field: 'createdAt', ascending: false },
        ] as unknown as Sort;
        const result = converter.getSqlQuerySpec(undefined, sort);

        expect(result.query).toBe('SELECT c FROM c  ORDER BY c.status ASC, c.createdAt DESC');
      });

      it('should convert nested field notation in sort', () => {
        const sort = [{ field: 'address->city', ascending: true }] as unknown as Sort;
        const result = converter.getSqlQuerySpec(undefined, sort);

        expect(result.query).toBe('SELECT c FROM c  ORDER BY c.address.city ASC');
      });
    });

    describe('operators', () => {
      describe('Present operator', () => {
        it('should generate IS_DEFINED check', () => {
          const condition = new ConditionTreeLeaf('name', 'Present', null);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE IS_DEFINED(c.name) AND c.name != null');
        });
      });

      describe('Missing operator', () => {
        it('should generate NOT IS_DEFINED check', () => {
          const condition = new ConditionTreeLeaf('name', 'Missing', null);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE (NOT IS_DEFINED(c.name) OR c.name = null)',
          );
        });
      });

      describe('Equal operator', () => {
        it('should generate equality check with parameter', () => {
          const condition = new ConditionTreeLeaf('status', 'Equal', 'active');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE c.status = @param0');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'active' }]);
        });

        it('should handle null value as Missing check', () => {
          const condition = new ConditionTreeLeaf('status', 'Equal', null);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE (NOT IS_DEFINED(c.status) OR c.status = null)',
          );
        });

        it('should handle undefined value as Missing check', () => {
          const condition = new ConditionTreeLeaf('status', 'Equal', undefined);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE (NOT IS_DEFINED(c.status) OR c.status = null)',
          );
        });

        it('should handle number values', () => {
          const condition = new ConditionTreeLeaf('count', 'Equal', 42);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE c.count = @param0');
          expect(result.parameters).toEqual([{ name: '@param0', value: 42 }]);
        });
      });

      describe('NotEqual operator', () => {
        it('should generate inequality check with parameter', () => {
          const condition = new ConditionTreeLeaf('status', 'NotEqual', 'inactive');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE c.status != @param0');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'inactive' }]);
        });

        it('should handle null value as Present check', () => {
          const condition = new ConditionTreeLeaf('status', 'NotEqual', null);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE IS_DEFINED(c.status) AND c.status != null',
          );
        });

        it('should handle undefined value as Present check', () => {
          const condition = new ConditionTreeLeaf('status', 'NotEqual', undefined);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE IS_DEFINED(c.status) AND c.status != null',
          );
        });
      });

      describe('In operator', () => {
        it('should generate ARRAY_CONTAINS check', () => {
          const condition = new ConditionTreeLeaf('status', 'In', ['active', 'pending']);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE ARRAY_CONTAINS(@param0, c.status)');
          expect(result.parameters).toEqual([{ name: '@param0', value: ['active', 'pending'] }]);
        });

        it('should return always false for empty array', () => {
          const condition = new ConditionTreeLeaf('status', 'In', []);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE 1 = 0');
        });

        it('should handle non-array value by wrapping in array', () => {
          const condition = new ConditionTreeLeaf('status', 'In', 'active');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE ARRAY_CONTAINS(@param0, c.status)');
          expect(result.parameters).toEqual([{ name: '@param0', value: ['active'] }]);
        });

        it('should handle array with null values', () => {
          const condition = new ConditionTreeLeaf('status', 'In', ['active', null, 'pending']);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE (ARRAY_CONTAINS(@param0, c.status) ' +
              'OR NOT IS_DEFINED(c.status) OR c.status = null)',
          );
          expect(result.parameters).toEqual([{ name: '@param0', value: ['active', 'pending'] }]);
        });

        it('should handle array with only null values', () => {
          const condition = new ConditionTreeLeaf('status', 'In', [null, undefined]);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE (NOT IS_DEFINED(c.status) OR c.status = null)',
          );
        });
      });

      describe('NotIn operator', () => {
        it('should generate NOT ARRAY_CONTAINS check', () => {
          const condition = new ConditionTreeLeaf('status', 'NotIn', ['deleted', 'archived']);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE NOT ARRAY_CONTAINS(@param0, c.status)');
          expect(result.parameters).toEqual([{ name: '@param0', value: ['deleted', 'archived'] }]);
        });

        it('should return always true for empty array', () => {
          const condition = new ConditionTreeLeaf('status', 'NotIn', []);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE 1 = 1');
        });

        it('should handle non-array value by wrapping in array', () => {
          const condition = new ConditionTreeLeaf('status', 'NotIn', 'deleted');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE NOT ARRAY_CONTAINS(@param0, c.status)');
          expect(result.parameters).toEqual([{ name: '@param0', value: ['deleted'] }]);
        });
      });

      describe('LessThan operator', () => {
        it('should generate less than comparison', () => {
          const condition = new ConditionTreeLeaf('count', 'LessThan', 100);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE c.count < @param0');
          expect(result.parameters).toEqual([{ name: '@param0', value: 100 }]);
        });
      });

      describe('GreaterThan operator', () => {
        it('should generate greater than comparison', () => {
          const condition = new ConditionTreeLeaf('count', 'GreaterThan', 50);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE c.count > @param0');
          expect(result.parameters).toEqual([{ name: '@param0', value: 50 }]);
        });
      });

      describe('Like operator', () => {
        it('should generate CONTAINS check stripping wildcards', () => {
          const condition = new ConditionTreeLeaf('name', 'Like', '%john%');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE CONTAINS(c.name, @param0)');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'john' }]);
        });

        it('should strip leading wildcard only', () => {
          const condition = new ConditionTreeLeaf('name', 'Like', '%john');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE CONTAINS(c.name, @param0)');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'john' }]);
        });

        it('should strip trailing wildcard only', () => {
          const condition = new ConditionTreeLeaf('name', 'Like', 'john%');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE CONTAINS(c.name, @param0)');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'john' }]);
        });
      });

      describe('ILike operator', () => {
        it('should generate case-insensitive CONTAINS check', () => {
          const condition = new ConditionTreeLeaf('name', 'ILike', '%JOHN%');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE CONTAINS(LOWER(c.name), LOWER(@param0))',
          );
          expect(result.parameters).toEqual([{ name: '@param0', value: 'JOHN' }]);
        });
      });

      describe('Contains operator', () => {
        it('should generate CONTAINS check', () => {
          const condition = new ConditionTreeLeaf('description', 'Contains', 'important');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE CONTAINS(c.description, @param0)');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'important' }]);
        });
      });

      describe('NotContains operator', () => {
        it('should generate NOT CONTAINS check', () => {
          const condition = new ConditionTreeLeaf('description', 'NotContains', 'spam');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE NOT CONTAINS(c.description, @param0)');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'spam' }]);
        });
      });

      describe('StartsWith operator', () => {
        it('should generate STARTSWITH check', () => {
          const condition = new ConditionTreeLeaf('email', 'StartsWith', 'admin');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE STARTSWITH(c.email, @param0)');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'admin' }]);
        });
      });

      describe('EndsWith operator', () => {
        it('should generate ENDSWITH check', () => {
          const condition = new ConditionTreeLeaf('email', 'EndsWith', '@example.com');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE ENDSWITH(c.email, @param0)');
          expect(result.parameters).toEqual([{ name: '@param0', value: '@example.com' }]);
        });
      });

      describe('IncludesAll operator', () => {
        it('should generate multiple ARRAY_CONTAINS checks with AND', () => {
          const condition = new ConditionTreeLeaf('tags', 'IncludesAll', ['urgent', 'important']);
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe(
            'SELECT c FROM c WHERE (ARRAY_CONTAINS(c.tags, @param0) ' +
              'AND ARRAY_CONTAINS(c.tags, @param1))',
          );
          expect(result.parameters).toEqual([
            { name: '@param0', value: 'urgent' },
            { name: '@param1', value: 'important' },
          ]);
        });

        it('should handle non-array value by wrapping in array', () => {
          const condition = new ConditionTreeLeaf('tags', 'IncludesAll', 'urgent');
          const result = converter.getSqlQuerySpec(condition);

          expect(result.query).toBe('SELECT c FROM c WHERE (ARRAY_CONTAINS(c.tags, @param0))');
          expect(result.parameters).toEqual([{ name: '@param0', value: 'urgent' }]);
        });
      });

      describe('unsupported operator', () => {
        it('should throw error for unsupported operator', () => {
          const condition = new ConditionTreeLeaf(
            'field',
            'SomeUnsupportedOperator' as never,
            'value',
          );

          expect(() => converter.getSqlQuerySpec(condition)).toThrow(
            'Unsupported operator: "SomeUnsupportedOperator".',
          );
        });
      });
    });

    describe('nested fields', () => {
      it('should convert arrow notation to dot notation', () => {
        const condition = new ConditionTreeLeaf('address->city', 'Equal', 'Paris');
        const result = converter.getSqlQuerySpec(condition);

        expect(result.query).toBe('SELECT c FROM c WHERE c.address.city = @param0');
        expect(result.parameters).toEqual([{ name: '@param0', value: 'Paris' }]);
      });

      it('should handle deeply nested fields', () => {
        const condition = new ConditionTreeLeaf('user->profile->settings->theme', 'Equal', 'dark');
        const result = converter.getSqlQuerySpec(condition);

        expect(result.query).toBe('SELECT c FROM c WHERE c.user.profile.settings.theme = @param0');
      });
    });

    describe('condition tree branches', () => {
      it('should handle AND aggregator', () => {
        const condition = new ConditionTreeBranch('And', [
          new ConditionTreeLeaf('status', 'Equal', 'active'),
          new ConditionTreeLeaf('count', 'GreaterThan', 10),
        ]);
        const result = converter.getSqlQuerySpec(condition);

        expect(result.query).toBe(
          'SELECT c FROM c WHERE (c.status = @param0 AND c.count > @param1)',
        );
        expect(result.parameters).toEqual([
          { name: '@param0', value: 'active' },
          { name: '@param1', value: 10 },
        ]);
      });

      it('should handle OR aggregator', () => {
        const condition = new ConditionTreeBranch('Or', [
          new ConditionTreeLeaf('status', 'Equal', 'active'),
          new ConditionTreeLeaf('status', 'Equal', 'pending'),
        ]);
        const result = converter.getSqlQuerySpec(condition);

        expect(result.query).toBe(
          'SELECT c FROM c WHERE (c.status = @param0 OR c.status = @param1)',
        );
      });

      it('should handle nested branches', () => {
        const condition = new ConditionTreeBranch('And', [
          new ConditionTreeLeaf('type', 'Equal', 'order'),
          new ConditionTreeBranch('Or', [
            new ConditionTreeLeaf('status', 'Equal', 'active'),
            new ConditionTreeLeaf('status', 'Equal', 'pending'),
          ]),
        ]);
        const result = converter.getSqlQuerySpec(condition);

        expect(result.query).toBe(
          'SELECT c FROM c WHERE (c.type = @param0 AND (c.status = @param1 OR c.status = @param2))',
        );
      });

      it('should return single clause without parentheses when only one condition', () => {
        const condition = new ConditionTreeBranch('And', [
          new ConditionTreeLeaf('status', 'Equal', 'active'),
        ]);
        const result = converter.getSqlQuerySpec(condition);

        expect(result.query).toBe('SELECT c FROM c WHERE c.status = @param0');
      });

      it('should throw error for null aggregator', () => {
        const condition = { aggregator: null, conditions: [] };

        expect(() => converter.getSqlQuerySpec(condition as never)).toThrow(
          'Invalid (null) aggregator.',
        );
      });

      it('should throw error for empty conditions array', () => {
        const condition = new ConditionTreeBranch('And', []);

        expect(() => converter.getSqlQuerySpec(condition)).toThrow(
          'Conditions must be a non-empty array.',
        );
      });
    });

    describe('relation fields', () => {
      it('should throw error for relation condition tree', () => {
        const condition = new ConditionTreeLeaf('orders:id', 'Equal', '123');

        expect(() => converter.getSqlQuerySpec(condition)).toThrow(
          'Relation ConditionTree not yet supported for Cosmos DB.',
        );
      });
    });

    describe('invalid condition tree', () => {
      it('should throw error for invalid condition tree object', () => {
        const condition = { someProperty: 'value' };

        expect(() => converter.getSqlQuerySpec(condition as never)).toThrow(
          'Invalid ConditionTree.',
        );
      });
    });
  });

  describe('getOrderByClause', () => {
    it('should return empty string for undefined sort', () => {
      const result = converter.getOrderByClause(undefined);

      expect(result).toBe('');
    });

    it('should return empty string for empty sort array', () => {
      const result = converter.getOrderByClause([] as unknown as Sort);

      expect(result).toBe('');
    });
  });

  describe('getWhereClause', () => {
    it('should return empty where and empty parameters for undefined condition', () => {
      const result = converter.getWhereClause(undefined);

      expect(result).toEqual({ where: '', parameters: [] });
    });

    it('should return where clause and parameters for condition', () => {
      const condition = new ConditionTreeLeaf('status', 'Equal', 'active');
      const result = converter.getWhereClause(condition);

      expect(result).toEqual({
        where: 'c.status = @param0',
        parameters: [{ name: '@param0', value: 'active' }],
      });
    });
  });

  describe('parameter handling', () => {
    it('should reset parameters between calls', () => {
      const condition1 = new ConditionTreeLeaf('field1', 'Equal', 'value1');
      converter.getSqlQuerySpec(condition1);

      const condition2 = new ConditionTreeLeaf('field2', 'Equal', 'value2');
      const result = converter.getSqlQuerySpec(condition2);

      // Parameters should start from @param0 again, not @param1
      expect(result.parameters).toEqual([{ name: '@param0', value: 'value2' }]);
    });

    it('should increment parameter counter for multiple conditions', () => {
      const condition = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('field1', 'Equal', 'value1'),
        new ConditionTreeLeaf('field2', 'Equal', 'value2'),
        new ConditionTreeLeaf('field3', 'Equal', 'value3'),
      ]);
      const result = converter.getSqlQuerySpec(condition);

      expect(result.parameters).toEqual([
        { name: '@param0', value: 'value1' },
        { name: '@param1', value: 'value2' },
        { name: '@param2', value: 'value3' },
      ]);
    });
  });
});
