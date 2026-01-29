/**
 * Tests for TypeConverter utility
 */

import TypeConverter from '../src/utils/type-converter';

describe('TypeConverter', () => {
  describe('toColumnType', () => {
    it('should convert text fields to String', () => {
      expect(TypeConverter.toColumnType('singleLineText')).toBe('String');
      expect(TypeConverter.toColumnType('email')).toBe('String');
      expect(TypeConverter.toColumnType('url')).toBe('String');
      expect(TypeConverter.toColumnType('multilineText')).toBe('String');
      expect(TypeConverter.toColumnType('phoneNumber')).toBe('String');
      expect(TypeConverter.toColumnType('richText')).toBe('String');
    });

    it('should convert numeric fields to Number', () => {
      expect(TypeConverter.toColumnType('number')).toBe('Number');
      expect(TypeConverter.toColumnType('percent')).toBe('Number');
      expect(TypeConverter.toColumnType('currency')).toBe('Number');
      expect(TypeConverter.toColumnType('rating')).toBe('Number');
      expect(TypeConverter.toColumnType('duration')).toBe('Number');
      expect(TypeConverter.toColumnType('autoNumber')).toBe('Number');
      expect(TypeConverter.toColumnType('count')).toBe('Number');
    });

    it('should convert checkbox to Boolean', () => {
      expect(TypeConverter.toColumnType('checkbox')).toBe('Boolean');
    });

    it('should convert date fields correctly', () => {
      expect(TypeConverter.toColumnType('date')).toBe('Dateonly');
      expect(TypeConverter.toColumnType('dateTime')).toBe('Date');
      expect(TypeConverter.toColumnType('createdTime')).toBe('Date');
      expect(TypeConverter.toColumnType('lastModifiedTime')).toBe('Date');
    });

    it('should convert single select to Enum', () => {
      expect(TypeConverter.toColumnType('singleSelect')).toBe('Enum');
    });

    it('should convert complex fields to Json', () => {
      expect(TypeConverter.toColumnType('multipleSelects')).toBe('Json');
      expect(TypeConverter.toColumnType('multipleRecordLinks')).toBe('Json');
      expect(TypeConverter.toColumnType('multipleAttachments')).toBe('Json');
      expect(TypeConverter.toColumnType('singleCollaborator')).toBe('Json');
      expect(TypeConverter.toColumnType('multipleCollaborators')).toBe('Json');
    });
  });

  describe('isReadOnly', () => {
    it('should return true for computed fields', () => {
      expect(TypeConverter.isReadOnly('formula')).toBe(true);
      expect(TypeConverter.isReadOnly('rollup')).toBe(true);
      expect(TypeConverter.isReadOnly('count')).toBe(true);
      expect(TypeConverter.isReadOnly('lookup')).toBe(true);
      expect(TypeConverter.isReadOnly('createdTime')).toBe(true);
      expect(TypeConverter.isReadOnly('lastModifiedTime')).toBe(true);
      expect(TypeConverter.isReadOnly('autoNumber')).toBe(true);
    });

    it('should return false for editable fields', () => {
      expect(TypeConverter.isReadOnly('singleLineText')).toBe(false);
      expect(TypeConverter.isReadOnly('number')).toBe(false);
      expect(TypeConverter.isReadOnly('checkbox')).toBe(false);
      expect(TypeConverter.isReadOnly('singleSelect')).toBe(false);
      expect(TypeConverter.isReadOnly('multipleRecordLinks')).toBe(false);
    });
  });

  describe('isSortable', () => {
    it('should return false for non-sortable fields', () => {
      expect(TypeConverter.isSortable('multipleAttachments')).toBe(false);
      expect(TypeConverter.isSortable('multipleRecordLinks')).toBe(false);
      expect(TypeConverter.isSortable('multipleSelects')).toBe(false);
      expect(TypeConverter.isSortable('multipleCollaborators')).toBe(false);
      expect(TypeConverter.isSortable('lookup')).toBe(false);
    });

    it('should return true for sortable fields', () => {
      expect(TypeConverter.isSortable('singleLineText')).toBe(true);
      expect(TypeConverter.isSortable('number')).toBe(true);
      expect(TypeConverter.isSortable('date')).toBe(true);
      expect(TypeConverter.isSortable('singleSelect')).toBe(true);
    });
  });

  describe('getFilterOperators', () => {
    it('should return correct operators for String type', () => {
      const operators = TypeConverter.getFilterOperators('String');
      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('Contains')).toBe(true);
      expect(operators.has('StartsWith')).toBe(true);
      expect(operators.has('EndsWith')).toBe(true);
    });

    it('should return correct operators for Number type', () => {
      const operators = TypeConverter.getFilterOperators('Number');
      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('GreaterThan')).toBe(true);
      expect(operators.has('LessThan')).toBe(true);
    });

    it('should return correct operators for Date type', () => {
      const operators = TypeConverter.getFilterOperators('Date');
      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('GreaterThan')).toBe(true);
      expect(operators.has('LessThan')).toBe(true);
      expect(operators.has('Today')).toBe(true);
      expect(operators.has('Before')).toBe(true);
      expect(operators.has('After')).toBe(true);
    });

    it('should return limited operators for Json type', () => {
      const operators = TypeConverter.getFilterOperators('Json');
      expect(operators.has('Present')).toBe(true);
      expect(operators.has('Blank')).toBe(true);
      expect(operators.size).toBe(2);
    });
  });

  describe('getEnumValues', () => {
    it('should extract enum values from choices', () => {
      const options = {
        choices: [{ name: 'Option 1' }, { name: 'Option 2' }, { name: 'Option 3' }],
      };
      expect(TypeConverter.getEnumValues(options)).toEqual(['Option 1', 'Option 2', 'Option 3']);
    });

    it('should return undefined for missing choices', () => {
      expect(TypeConverter.getEnumValues({})).toBeUndefined();
      expect(TypeConverter.getEnumValues(undefined)).toBeUndefined();
    });
  });
});
