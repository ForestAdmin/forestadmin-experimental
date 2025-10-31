import { ColumnType, Operator } from '@forestadmin/datasource-toolkit';

import TypeConverter, { CosmosDataType } from '../../src/utils/type-converter';

describe('Utils > TypeConverter', () => {
  describe('isSortable', () => {
    it('should be sortable on simple types', () => {
      expect(TypeConverter.isSortable('string')).toBe(true);
      expect(TypeConverter.isSortable('number')).toBe(true);
      expect(TypeConverter.isSortable('boolean')).toBe(true);
      expect(TypeConverter.isSortable('date')).toBe(true);
      expect(TypeConverter.isSortable('dateonly')).toBe(true);
      expect(TypeConverter.isSortable('timeonly')).toBe(true);
    });

    it('should not be sortable on complex types', () => {
      expect(TypeConverter.isSortable('object')).toBe(false);
      expect(TypeConverter.isSortable('array')).toBe(false);
      expect(TypeConverter.isSortable('enum')).toBe(false);
    });
  });

  describe('fromDataType', () => {
    it('should throw with an unknown column type', () => {
      expect(() => TypeConverter.fromDataType('__unknown__' as CosmosDataType)).toThrow(
        'Unsupported data type: "__unknown__"',
      );
    });

    it.each([
      ['boolean', 'Boolean'],
      ['date', 'Date'],
      ['dateonly', 'Dateonly'],
      ['timeonly', 'Timeonly'],
      ['number', 'Number'],
      ['string', 'String'],
      ['enum', 'Enum'],
      ['binary', 'String'],
      ['point', 'Point'],
      ['object', 'Json'],
      ['array', 'Json'],
      ['null', 'Json'],
    ])('should return a PrimitiveTypes when known for type "%s"', (dataType, primitiveType) => {
      expect(TypeConverter.fromDataType(dataType as CosmosDataType)).toEqual(primitiveType);
    });
  });

  describe('inferTypeFromValue', () => {
    it('should infer null type', () => {
      expect(TypeConverter.inferTypeFromValue(null)).toBe('null');
      expect(TypeConverter.inferTypeFromValue(undefined)).toBe('null');
    });

    it('should infer primitive types', () => {
      expect(TypeConverter.inferTypeFromValue(true)).toBe('boolean');
      expect(TypeConverter.inferTypeFromValue(false)).toBe('boolean');
      expect(TypeConverter.inferTypeFromValue(42)).toBe('number');
      expect(TypeConverter.inferTypeFromValue(3.14)).toBe('number');
      expect(TypeConverter.inferTypeFromValue('hello')).toBe('string');
    });

    it('should infer timeonly type', () => {
      expect(TypeConverter.inferTypeFromValue('14:30:00')).toBe('timeonly');
      expect(TypeConverter.inferTypeFromValue('09:15:30')).toBe('timeonly');
      expect(TypeConverter.inferTypeFromValue('23:59:59')).toBe('timeonly');
      expect(TypeConverter.inferTypeFromValue('00:00:00')).toBe('timeonly');
      expect(TypeConverter.inferTypeFromValue('14:30:00.123')).toBe('timeonly');
    });

    it('should infer dateonly type', () => {
      expect(TypeConverter.inferTypeFromValue('2023-01-15')).toBe('dateonly');
      expect(TypeConverter.inferTypeFromValue('2025-10-30')).toBe('dateonly');
      expect(TypeConverter.inferTypeFromValue('1985-10-26')).toBe('dateonly');
    });

    it('should infer date from ISO string with time', () => {
      expect(TypeConverter.inferTypeFromValue('2023-01-15T10:30:00Z')).toBe('date');
      expect(TypeConverter.inferTypeFromValue('2023-01-15T10:30:00.123Z')).toBe('date');
      expect(TypeConverter.inferTypeFromValue('2023-01-15T10:30:00.1234567Z')).toBe('date');
      expect(TypeConverter.inferTypeFromValue('2023-01-15 10:30:00')).toBe('date');
    });

    it('should infer date from Date object', () => {
      expect(TypeConverter.inferTypeFromValue(new Date())).toBe('date');
    });

    it('should not confuse similar formats', () => {
      // Dateonly without time component
      expect(TypeConverter.inferTypeFromValue('2023-01-15')).not.toBe('date');
      expect(TypeConverter.inferTypeFromValue('2023-01-15')).toBe('dateonly');

      // Time without date
      expect(TypeConverter.inferTypeFromValue('14:30:00')).not.toBe('date');
      expect(TypeConverter.inferTypeFromValue('14:30:00')).toBe('timeonly');

      // Invalid formats should be string
      expect(TypeConverter.inferTypeFromValue('not-a-uuid')).toBe('string');
      expect(TypeConverter.inferTypeFromValue('25:99:99')).toBe('string');
    });

    it('should infer array type', () => {
      expect(TypeConverter.inferTypeFromValue([1, 2, 3])).toBe('array');
      expect(TypeConverter.inferTypeFromValue(['a', 'b'])).toBe('array');
    });

    it('should infer object type', () => {
      expect(TypeConverter.inferTypeFromValue({ name: 'John' })).toBe('object');
    });

    it('should infer point type for GeoJSON Point', () => {
      const geoPoint = {
        type: 'Point',
        coordinates: [40.7128, -74.006],
      };
      expect(TypeConverter.inferTypeFromValue(geoPoint)).toBe('point');
    });
  });

  describe('getMostSpecificType', () => {
    it('should return null for empty array', () => {
      expect(TypeConverter.getMostSpecificType([])).toBe('null');
    });

    it('should return the type for single element', () => {
      expect(TypeConverter.getMostSpecificType(['string'])).toBe('string');
      expect(TypeConverter.getMostSpecificType(['number'])).toBe('number');
    });

    it('should return common type for same types', () => {
      expect(TypeConverter.getMostSpecificType(['string', 'string', 'string'])).toBe('string');
      expect(TypeConverter.getMostSpecificType(['number', 'number'])).toBe('number');
    });

    it('should handle nullable types', () => {
      expect(TypeConverter.getMostSpecificType(['string', 'null'])).toBe('string');
      expect(TypeConverter.getMostSpecificType(['number', 'null'])).toBe('number');
      expect(TypeConverter.getMostSpecificType(['boolean', 'null'])).toBe('boolean');
      expect(TypeConverter.getMostSpecificType(['date', 'null'])).toBe('date');
      expect(TypeConverter.getMostSpecificType(['dateonly', 'null'])).toBe('dateonly');
      expect(TypeConverter.getMostSpecificType(['timeonly', 'null'])).toBe('timeonly');
    });

    it('should handle mixed date and dateonly types', () => {
      // Example: null, "2025-12-23", "2025-12-23T11:34:32"
      expect(TypeConverter.getMostSpecificType(['date', 'dateonly', 'null'])).toBe('date');
      expect(TypeConverter.getMostSpecificType(['dateonly', 'date', 'null'])).toBe('date');
      expect(TypeConverter.getMostSpecificType(['null', 'date', 'dateonly'])).toBe('date');

      // Without datetime values, should remain dateonly
      expect(TypeConverter.getMostSpecificType(['dateonly', 'null'])).toBe('dateonly');
    });

    it('should handle mixed string-compatible types', () => {
      // If we see actual date values along with strings, prefer date
      expect(TypeConverter.getMostSpecificType(['date', 'string', 'null'])).toBe('date');
      expect(TypeConverter.getMostSpecificType(['dateonly', 'string', 'null'])).toBe('dateonly');
      expect(TypeConverter.getMostSpecificType(['timeonly', 'string', 'null'])).toBe('timeonly');
    });

    it('should return object for mixed incompatible types', () => {
      expect(TypeConverter.getMostSpecificType(['string', 'number'])).toBe('object');
      expect(TypeConverter.getMostSpecificType(['boolean', 'string'])).toBe('object');
      expect(TypeConverter.getMostSpecificType(['date', 'number'])).toBe('object');
    });
  });

  describe('operatorsForColumnType', () => {
    const presence = ['Present', 'Missing'] as const;
    const equality = ['Equal', 'NotEqual', 'In', 'NotIn'] as const;
    const orderables = ['LessThan', 'GreaterThan'] as const;
    const strings = ['Like', 'ILike', 'NotContains', 'Contains'] as const;

    it.each([
      // Primitive type
      ['Boolean', [...presence, ...equality]],
      ['Date', [...presence, ...equality, ...orderables]],
      ['Enum', [...presence, ...equality]],
      ['Number', [...presence, ...equality, ...orderables]],
      ['String', [...presence, ...equality, ...orderables, ...strings]],
      ['Point', [...presence, ...equality]],

      // Composite and unsupported types
      ['Json', [...presence]],
      [{ a: 'String' }, [...presence]],
      ['I_am_not_a_suported_type', [...presence]],
    ])('should return the matching set of operators for type "%s"', (dataType, operatorList) => {
      expect(TypeConverter.operatorsForColumnType(dataType as ColumnType)).toEqual(
        new Set<Operator>(operatorList as Operator[]),
      );
    });
  });

  describe('operatorsForId', () => {
    it('should return correct operators for id field', () => {
      const operators = TypeConverter.operatorsForId();
      expect(operators).toEqual(
        new Set<Operator>(['Present', 'Missing', 'Equal', 'NotEqual', 'In', 'NotIn']),
      );
    });
  });
});
