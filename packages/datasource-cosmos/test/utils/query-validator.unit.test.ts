import { ConditionTreeBranch, ConditionTreeLeaf, Sort } from '@forestadmin/datasource-toolkit';

import QueryValidator, {
  QueryValidationError,
  QueryValidationErrorCode,
} from '../../src/utils/query-validator';

describe('QueryValidator', () => {
  describe('validateFieldName', () => {
    describe('basic validation', () => {
      it('should accept valid simple field names', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('name')).not.toThrow();
        expect(() => validator.validateFieldName('email')).not.toThrow();
        expect(() => validator.validateFieldName('createdAt')).not.toThrow();
        expect(() => validator.validateFieldName('user_id')).not.toThrow();
        expect(() => validator.validateFieldName('_privateField')).not.toThrow();
      });

      it('should accept valid nested field names', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('address->city')).not.toThrow();
        expect(() => validator.validateFieldName('user->profile->name')).not.toThrow();
        expect(() => validator.validateFieldName('data->nested->deep->value')).not.toThrow();
      });

      it('should accept Cosmos DB system fields', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('id')).not.toThrow();
        expect(() => validator.validateFieldName('_ts')).not.toThrow();
        expect(() => validator.validateFieldName('_etag')).not.toThrow();
        expect(() => validator.validateFieldName('_rid')).not.toThrow();
        expect(() => validator.validateFieldName('_self')).not.toThrow();
        expect(() => validator.validateFieldName('_attachments')).not.toThrow();
      });

      it('should reject empty field names', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('   ')).toThrow(QueryValidationError);
      });

      it('should reject field names exceeding max length', () => {
        const validator = new QueryValidator(undefined, { maxFieldNameLength: 10 });

        expect(() => validator.validateFieldName('shortField')).not.toThrow();
        expect(() => validator.validateFieldName('veryLongFieldName')).toThrow(
          QueryValidationError,
        );
      });
    });

    describe('injection prevention', () => {
      it('should reject SQL injection characters', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName("field'; DROP TABLE")).toThrow(
          QueryValidationError,
        );
        expect(() => validator.validateFieldName('field"')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field;')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field\\')).toThrow(QueryValidationError);
      });

      it('should reject SQL comments', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('field--comment')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field/*comment')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field*/end')).toThrow(QueryValidationError);
      });

      it('should reject SQL keywords in field names', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('SELECT')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('FROM')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('WHERE')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('DROP')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('DELETE')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('UPDATE')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('INSERT')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('EXEC')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('UNION')).toThrow(QueryValidationError);
      });

      it('should reject null bytes', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('field\0name')).toThrow(QueryValidationError);
      });

      it('should include POTENTIAL_INJECTION error code for injection attempts', () => {
        const validator = new QueryValidator();

        let thrownError: QueryValidationError | null = null;

        try {
          validator.validateFieldName("field'; DROP TABLE");
        } catch (error) {
          thrownError = error as QueryValidationError;
        }

        expect(thrownError).toBeInstanceOf(QueryValidationError);
        expect(thrownError?.code).toBe(QueryValidationErrorCode.POTENTIAL_INJECTION);
      });
    });

    describe('field name format validation', () => {
      it('should reject field names starting with numbers', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('123field')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('1_field')).toThrow(QueryValidationError);
      });

      it('should reject field names with invalid characters', () => {
        const validator = new QueryValidator();

        expect(() => validator.validateFieldName('field name')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field.name')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field@name')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field#name')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field$name')).toThrow(QueryValidationError);
        expect(() => validator.validateFieldName('field:name')).toThrow(QueryValidationError);
      });

      it('should include INVALID_FIELD_NAME error code for format issues', () => {
        const validator = new QueryValidator();

        let thrownError: QueryValidationError | null = null;

        try {
          validator.validateFieldName('123field');
        } catch (error) {
          thrownError = error as QueryValidationError;
        }

        expect(thrownError).toBeInstanceOf(QueryValidationError);
        expect(thrownError?.code).toBe(QueryValidationErrorCode.INVALID_FIELD_NAME);
      });
    });

    describe('nesting depth validation', () => {
      it('should accept fields within max depth', () => {
        const validator = new QueryValidator(undefined, { maxFieldDepth: 3 });

        expect(() => validator.validateFieldName('a->b->c')).not.toThrow();
      });

      it('should reject fields exceeding max depth', () => {
        const validator = new QueryValidator(undefined, { maxFieldDepth: 3 });

        expect(() => validator.validateFieldName('a->b->c->d')).toThrow(QueryValidationError);
      });

      it('should include MAX_DEPTH_EXCEEDED error code', () => {
        const validator = new QueryValidator(undefined, { maxFieldDepth: 2 });

        let thrownError: QueryValidationError | null = null;

        try {
          validator.validateFieldName('a->b->c');
        } catch (error) {
          thrownError = error as QueryValidationError;
        }

        expect(thrownError).toBeInstanceOf(QueryValidationError);
        expect(thrownError?.code).toBe(QueryValidationErrorCode.MAX_DEPTH_EXCEEDED);
      });
    });

    describe('schema validation', () => {
      it('should accept fields present in schema', () => {
        const validator = new QueryValidator(['name', 'email', 'address->city']);

        expect(() => validator.validateFieldName('name')).not.toThrow();
        expect(() => validator.validateFieldName('email')).not.toThrow();
        expect(() => validator.validateFieldName('address->city')).not.toThrow();
      });

      it('should accept parent paths of nested fields', () => {
        const validator = new QueryValidator(['address->city', 'user->profile->name']);

        expect(() => validator.validateFieldName('address')).not.toThrow();
        expect(() => validator.validateFieldName('user')).not.toThrow();
        expect(() => validator.validateFieldName('user->profile')).not.toThrow();
      });

      it('should reject unknown fields when allowUnknownFields is false', () => {
        const validator = new QueryValidator(['name', 'email'], { allowUnknownFields: false });

        expect(() => validator.validateFieldName('unknownField')).toThrow(QueryValidationError);
      });

      it('should accept unknown fields when allowUnknownFields is true', () => {
        const validator = new QueryValidator(['name', 'email'], { allowUnknownFields: true });

        expect(() => validator.validateFieldName('unknownField')).not.toThrow();
      });

      it('should always allow system fields regardless of schema', () => {
        const validator = new QueryValidator(['name'], { allowUnknownFields: false });

        expect(() => validator.validateFieldName('id')).not.toThrow();
        expect(() => validator.validateFieldName('_ts')).not.toThrow();
      });

      it('should include FIELD_NOT_IN_SCHEMA error code', () => {
        const validator = new QueryValidator(['name'], { allowUnknownFields: false });

        let thrownError: QueryValidationError | null = null;

        try {
          validator.validateFieldName('unknownField');
        } catch (error) {
          thrownError = error as QueryValidationError;
        }

        expect(thrownError).toBeInstanceOf(QueryValidationError);
        expect(thrownError?.code).toBe(QueryValidationErrorCode.FIELD_NOT_IN_SCHEMA);
      });
    });
  });

  describe('validateValue', () => {
    it('should accept null and undefined values', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateValue(null)).not.toThrow();
      expect(() => validator.validateValue(undefined)).not.toThrow();
    });

    it('should accept primitive values', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateValue('string value')).not.toThrow();
      expect(() => validator.validateValue(123)).not.toThrow();
      expect(() => validator.validateValue(true)).not.toThrow();
      expect(() => validator.validateValue(false)).not.toThrow();
    });

    it('should accept array values', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateValue(['a', 'b', 'c'])).not.toThrow();
      expect(() => validator.validateValue([1, 2, 3])).not.toThrow();
    });

    it('should reject strings with null bytes', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateValue('value\0with\0nulls')).toThrow(QueryValidationError);
    });

    it('should recursively validate array items', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateValue(['safe', 'value\0unsafe'])).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('validateConditionTree', () => {
    it('should accept undefined condition tree', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateConditionTree(undefined)).not.toThrow();
    });

    it('should validate simple leaf conditions', () => {
      const validator = new QueryValidator();
      const condition = new ConditionTreeLeaf('status', 'Equal', 'active');

      expect(() => validator.validateConditionTree(condition)).not.toThrow();
    });

    it('should validate branch conditions with AND', () => {
      const validator = new QueryValidator();
      const condition = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('status', 'Equal', 'active'),
        new ConditionTreeLeaf('count', 'GreaterThan', 10),
      ]);

      expect(() => validator.validateConditionTree(condition)).not.toThrow();
    });

    it('should validate branch conditions with OR', () => {
      const validator = new QueryValidator();
      const condition = new ConditionTreeBranch('Or', [
        new ConditionTreeLeaf('status', 'Equal', 'active'),
        new ConditionTreeLeaf('status', 'Equal', 'pending'),
      ]);

      expect(() => validator.validateConditionTree(condition)).not.toThrow();
    });

    it('should validate deeply nested conditions', () => {
      const validator = new QueryValidator();
      const condition = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('type', 'Equal', 'order'),
        new ConditionTreeBranch('Or', [
          new ConditionTreeLeaf('status', 'Equal', 'active'),
          new ConditionTreeBranch('And', [
            new ConditionTreeLeaf('priority', 'GreaterThan', 5),
            new ConditionTreeLeaf('urgent', 'Equal', true),
          ]),
        ]),
      ]);

      expect(() => validator.validateConditionTree(condition)).not.toThrow();
    });

    it('should reject conditions with invalid field names', () => {
      const validator = new QueryValidator();
      const condition = new ConditionTreeLeaf("status'; DROP", 'Equal', 'active');

      expect(() => validator.validateConditionTree(condition)).toThrow(QueryValidationError);
    });

    it('should reject conditions exceeding max conditions limit', () => {
      const validator = new QueryValidator(undefined, { maxConditions: 5 });
      const conditions = Array.from(
        { length: 10 },
        (_, i) => new ConditionTreeLeaf(`field${i}`, 'Equal', `value${i}`),
      );
      const condition = new ConditionTreeBranch('And', conditions);

      expect(() => validator.validateConditionTree(condition)).toThrow(QueryValidationError);
    });
  });

  describe('validateSort', () => {
    it('should accept undefined sort', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateSort(undefined)).not.toThrow();
    });

    it('should accept empty sort array', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateSort([] as unknown as Sort)).not.toThrow();
    });

    it('should accept valid sort clauses', () => {
      const validator = new QueryValidator();
      const sort = [
        { field: 'name', ascending: true },
        { field: 'createdAt', ascending: false },
      ] as unknown as Sort;

      expect(() => validator.validateSort(sort)).not.toThrow();
    });

    it('should accept nested field in sort', () => {
      const validator = new QueryValidator();
      const sort = [{ field: 'address->city', ascending: true }] as unknown as Sort;

      expect(() => validator.validateSort(sort)).not.toThrow();
    });

    it('should reject invalid field names in sort', () => {
      const validator = new QueryValidator();
      const sort = [{ field: "name'; DROP", ascending: true }] as unknown as Sort;

      expect(() => validator.validateSort(sort)).toThrow(QueryValidationError);
    });

    it('should reject non-boolean ascending value', () => {
      const validator = new QueryValidator();
      const sort = [{ field: 'name', ascending: 'yes' }] as unknown as Sort;

      expect(() => validator.validateSort(sort)).toThrow(QueryValidationError);
    });
  });

  describe('validateProjection', () => {
    it('should accept undefined projection', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateProjection(undefined)).not.toThrow();
    });

    it('should accept empty projection array', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateProjection([])).not.toThrow();
    });

    it('should accept valid projection fields', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateProjection(['id', 'name', 'email'])).not.toThrow();
    });

    it('should accept nested field projections', () => {
      const validator = new QueryValidator();

      expect(() =>
        validator.validateProjection(['address->city', 'user->profile->name']),
      ).not.toThrow();
    });

    it('should reject invalid field names in projection', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateProjection(['valid', "invalid'; DROP"])).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('validateQuery', () => {
    it('should validate all query components together', () => {
      const validator = new QueryValidator();
      const condition = new ConditionTreeLeaf('status', 'Equal', 'active');
      const sort = [{ field: 'name', ascending: true }] as unknown as Sort;
      const projection = ['id', 'name', 'status'];

      expect(() => validator.validateQuery(condition, sort, projection)).not.toThrow();
    });

    it('should reject if any component is invalid', () => {
      const validator = new QueryValidator();
      const condition = new ConditionTreeLeaf('status', 'Equal', 'active');
      const sort = [{ field: "invalid'; DROP", ascending: true }] as unknown as Sort;
      const projection = ['id', 'name'];

      expect(() => validator.validateQuery(condition, sort, projection)).toThrow(
        QueryValidationError,
      );
    });
  });

  describe('QueryValidationError', () => {
    it('should include error code and field in error', () => {
      const error = new QueryValidationError(
        'Test error',
        QueryValidationErrorCode.INVALID_FIELD_NAME,
        'testField',
      );

      expect(error.message).toBe('Test error');
      expect(error.code).toBe(QueryValidationErrorCode.INVALID_FIELD_NAME);
      expect(error.field).toBe('testField');
      expect(error.name).toBe('QueryValidationError');
    });
  });

  describe('edge cases', () => {
    it('should handle fields with numbers after first character', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateFieldName('field1')).not.toThrow();
      expect(() => validator.validateFieldName('field_123')).not.toThrow();
      expect(() => validator.validateFieldName('field1->nested2')).not.toThrow();
    });

    it('should handle single character field names', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateFieldName('a')).not.toThrow();
      expect(() => validator.validateFieldName('_')).not.toThrow();
    });

    it('should handle case-insensitive SQL keyword detection', () => {
      const validator = new QueryValidator();

      expect(() => validator.validateFieldName('select')).toThrow(QueryValidationError);
      expect(() => validator.validateFieldName('SELECT')).toThrow(QueryValidationError);
      expect(() => validator.validateFieldName('Select')).toThrow(QueryValidationError);
    });

    it('should not trigger false positive for partial SQL keywords', () => {
      const validator = new QueryValidator();

      // These contain SQL keywords as substrings but are valid field names
      // The word boundary regex should allow these
      expect(() => validator.validateFieldName('selection')).not.toThrow();
      expect(() => validator.validateFieldName('updatedAt')).not.toThrow();
      expect(() => validator.validateFieldName('fromDate')).not.toThrow();
      expect(() => validator.validateFieldName('whereabouts')).not.toThrow();
    });

    it('should handle complex object values', () => {
      const validator = new QueryValidator();
      const complexValue = {
        nested: {
          field: 'value',
          array: [1, 2, 3],
        },
      };

      expect(() => validator.validateValue(complexValue)).not.toThrow();
    });
  });
});
