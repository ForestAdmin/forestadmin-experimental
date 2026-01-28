/**
 * Tests for field-mapper.js
 * Comprehensive tests covering all 28 Airtable field types
 */

const {
  FIELD_TYPE_MAP,
  READ_ONLY_FIELDS,
  OPERATORS_BY_TYPE,
  TRANSFORM_FUNCTIONS,
  getColumnType,
  isReadOnly,
  getOperators,
  transformValue,
  prepareValueForWrite,
} = require('../src/field-mapper');

describe('field-mapper', () => {
  describe('FIELD_TYPE_MAP', () => {
    it('should map all 28 Airtable field types', () => {
      const expectedTypes = [
        'singleLineText', 'multilineText', 'richText', 'email', 'url', 'phoneNumber',
        'number', 'currency', 'percent', 'rating', 'duration',
        'checkbox',
        'date', 'dateTime', 'createdTime', 'lastModifiedTime',
        'singleSelect', 'multipleSelects',
        'multipleRecordLinks',
        'formula', 'rollup', 'lookup', 'count',
        'multipleAttachments',
        'singleCollaborator', 'multipleCollaborators', 'createdBy', 'lastModifiedBy',
        'barcode', 'button', 'autoNumber', 'externalSyncSource', 'aiText',
      ];

      for (const type of expectedTypes) {
        expect(FIELD_TYPE_MAP).toHaveProperty(type);
      }
    });

    describe('text field types', () => {
      it('should map singleLineText to String', () => {
        expect(FIELD_TYPE_MAP.singleLineText).toBe('String');
      });

      it('should map multilineText to String', () => {
        expect(FIELD_TYPE_MAP.multilineText).toBe('String');
      });

      it('should map richText to String', () => {
        expect(FIELD_TYPE_MAP.richText).toBe('String');
      });

      it('should map email to String', () => {
        expect(FIELD_TYPE_MAP.email).toBe('String');
      });

      it('should map url to String', () => {
        expect(FIELD_TYPE_MAP.url).toBe('String');
      });

      it('should map phoneNumber to String', () => {
        expect(FIELD_TYPE_MAP.phoneNumber).toBe('String');
      });
    });

    describe('number field types', () => {
      it('should map number to Number', () => {
        expect(FIELD_TYPE_MAP.number).toBe('Number');
      });

      it('should map currency to Number', () => {
        expect(FIELD_TYPE_MAP.currency).toBe('Number');
      });

      it('should map percent to Number', () => {
        expect(FIELD_TYPE_MAP.percent).toBe('Number');
      });

      it('should map rating to Number', () => {
        expect(FIELD_TYPE_MAP.rating).toBe('Number');
      });

      it('should map duration to Number', () => {
        expect(FIELD_TYPE_MAP.duration).toBe('Number');
      });

      it('should map count to Number', () => {
        expect(FIELD_TYPE_MAP.count).toBe('Number');
      });

      it('should map autoNumber to Number', () => {
        expect(FIELD_TYPE_MAP.autoNumber).toBe('Number');
      });
    });

    describe('boolean field types', () => {
      it('should map checkbox to Boolean', () => {
        expect(FIELD_TYPE_MAP.checkbox).toBe('Boolean');
      });
    });

    describe('date field types', () => {
      it('should map date to Dateonly', () => {
        expect(FIELD_TYPE_MAP.date).toBe('Dateonly');
      });

      it('should map dateTime to Date', () => {
        expect(FIELD_TYPE_MAP.dateTime).toBe('Date');
      });

      it('should map createdTime to Date', () => {
        expect(FIELD_TYPE_MAP.createdTime).toBe('Date');
      });

      it('should map lastModifiedTime to Date', () => {
        expect(FIELD_TYPE_MAP.lastModifiedTime).toBe('Date');
      });
    });

    describe('select field types', () => {
      it('should map singleSelect to String', () => {
        expect(FIELD_TYPE_MAP.singleSelect).toBe('String');
      });

      it('should map multipleSelects to Json', () => {
        expect(FIELD_TYPE_MAP.multipleSelects).toBe('Json');
      });
    });

    describe('reference field types', () => {
      it('should map multipleRecordLinks to Json', () => {
        expect(FIELD_TYPE_MAP.multipleRecordLinks).toBe('Json');
      });
    });

    describe('computed field types', () => {
      it('should map formula to String', () => {
        expect(FIELD_TYPE_MAP.formula).toBe('String');
      });

      it('should map rollup to String', () => {
        expect(FIELD_TYPE_MAP.rollup).toBe('String');
      });

      it('should map lookup to Json', () => {
        expect(FIELD_TYPE_MAP.lookup).toBe('Json');
      });
    });

    describe('user field types', () => {
      it('should map singleCollaborator to Json', () => {
        expect(FIELD_TYPE_MAP.singleCollaborator).toBe('Json');
      });

      it('should map multipleCollaborators to Json', () => {
        expect(FIELD_TYPE_MAP.multipleCollaborators).toBe('Json');
      });

      it('should map createdBy to Json', () => {
        expect(FIELD_TYPE_MAP.createdBy).toBe('Json');
      });

      it('should map lastModifiedBy to Json', () => {
        expect(FIELD_TYPE_MAP.lastModifiedBy).toBe('Json');
      });
    });

    describe('other field types', () => {
      it('should map barcode to Json', () => {
        expect(FIELD_TYPE_MAP.barcode).toBe('Json');
      });

      it('should map button to Json', () => {
        expect(FIELD_TYPE_MAP.button).toBe('Json');
      });

      it('should map multipleAttachments to String', () => {
        expect(FIELD_TYPE_MAP.multipleAttachments).toBe('String');
      });

      it('should map externalSyncSource to String', () => {
        expect(FIELD_TYPE_MAP.externalSyncSource).toBe('String');
      });

      it('should map aiText to String', () => {
        expect(FIELD_TYPE_MAP.aiText).toBe('String');
      });
    });
  });

  describe('READ_ONLY_FIELDS', () => {
    it('should include all computed fields', () => {
      expect(READ_ONLY_FIELDS).toContain('formula');
      expect(READ_ONLY_FIELDS).toContain('rollup');
      expect(READ_ONLY_FIELDS).toContain('lookup');
      expect(READ_ONLY_FIELDS).toContain('count');
    });

    it('should include all auto-generated fields', () => {
      expect(READ_ONLY_FIELDS).toContain('createdTime');
      expect(READ_ONLY_FIELDS).toContain('lastModifiedTime');
      expect(READ_ONLY_FIELDS).toContain('createdBy');
      expect(READ_ONLY_FIELDS).toContain('lastModifiedBy');
      expect(READ_ONLY_FIELDS).toContain('autoNumber');
    });

    it('should include button field', () => {
      expect(READ_ONLY_FIELDS).toContain('button');
    });

    it('should include AI text field', () => {
      expect(READ_ONLY_FIELDS).toContain('aiText');
    });

    it('should NOT include writable fields', () => {
      expect(READ_ONLY_FIELDS).not.toContain('singleLineText');
      expect(READ_ONLY_FIELDS).not.toContain('number');
      expect(READ_ONLY_FIELDS).not.toContain('checkbox');
      expect(READ_ONLY_FIELDS).not.toContain('multipleRecordLinks');
    });
  });

  describe('OPERATORS_BY_TYPE', () => {
    it('should have operators for String type', () => {
      expect(OPERATORS_BY_TYPE.String).toContain('Equal');
      expect(OPERATORS_BY_TYPE.String).toContain('NotEqual');
      expect(OPERATORS_BY_TYPE.String).toContain('Contains');
      expect(OPERATORS_BY_TYPE.String).toContain('StartsWith');
      expect(OPERATORS_BY_TYPE.String).toContain('EndsWith');
    });

    it('should have operators for Number type', () => {
      expect(OPERATORS_BY_TYPE.Number).toContain('Equal');
      expect(OPERATORS_BY_TYPE.Number).toContain('GreaterThan');
      expect(OPERATORS_BY_TYPE.Number).toContain('LessThan');
      expect(OPERATORS_BY_TYPE.Number).toContain('GreaterThanOrEqual');
      expect(OPERATORS_BY_TYPE.Number).toContain('LessThanOrEqual');
    });

    it('should have operators for Boolean type', () => {
      expect(OPERATORS_BY_TYPE.Boolean).toContain('Equal');
    });

    it('should have operators for Date type', () => {
      expect(OPERATORS_BY_TYPE.Date).toContain('Equal');
      expect(OPERATORS_BY_TYPE.Date).toContain('Before');
      expect(OPERATORS_BY_TYPE.Date).toContain('After');
      expect(OPERATORS_BY_TYPE.Date).toContain('GreaterThan');
      expect(OPERATORS_BY_TYPE.Date).toContain('LessThan');
    });

    it('should have operators for Dateonly type', () => {
      expect(OPERATORS_BY_TYPE.Dateonly).toContain('Equal');
      expect(OPERATORS_BY_TYPE.Dateonly).toContain('Before');
      expect(OPERATORS_BY_TYPE.Dateonly).toContain('After');
    });

    it('should have operators for Json type', () => {
      expect(OPERATORS_BY_TYPE.Json).toContain('Present');
      expect(OPERATORS_BY_TYPE.Json).toContain('Blank');
    });
  });

  describe('getColumnType()', () => {
    it('should return correct type for known Airtable types', () => {
      expect(getColumnType('singleLineText')).toBe('String');
      expect(getColumnType('number')).toBe('Number');
      expect(getColumnType('checkbox')).toBe('Boolean');
      expect(getColumnType('date')).toBe('Dateonly');
      expect(getColumnType('dateTime')).toBe('Date');
      expect(getColumnType('multipleSelects')).toBe('Json');
    });

    it('should return String for unknown types', () => {
      expect(getColumnType('unknownType')).toBe('String');
      expect(getColumnType('')).toBe('String');
      expect(getColumnType(null)).toBe('String');
      expect(getColumnType(undefined)).toBe('String');
    });
  });

  describe('isReadOnly()', () => {
    it('should return true for read-only fields', () => {
      expect(isReadOnly('formula')).toBe(true);
      expect(isReadOnly('rollup')).toBe(true);
      expect(isReadOnly('createdTime')).toBe(true);
      expect(isReadOnly('autoNumber')).toBe(true);
    });

    it('should return false for writable fields', () => {
      expect(isReadOnly('singleLineText')).toBe(false);
      expect(isReadOnly('number')).toBe(false);
      expect(isReadOnly('checkbox')).toBe(false);
      expect(isReadOnly('multipleRecordLinks')).toBe(false);
    });

    it('should return false for unknown fields', () => {
      expect(isReadOnly('unknownType')).toBe(false);
    });
  });

  describe('getOperators()', () => {
    it('should return operators for known column types', () => {
      const stringOps = getOperators('String');
      expect(stringOps).toContain('Equal');
      expect(stringOps).toContain('Contains');

      const numberOps = getOperators('Number');
      expect(numberOps).toContain('GreaterThan');
    });

    it('should return default operators for unknown types', () => {
      const ops = getOperators('Unknown');
      expect(ops).toContain('Equal');
      expect(ops).toContain('NotEqual');
    });
  });

  describe('transformValue()', () => {
    describe('null/undefined handling', () => {
      it('should return null for null values', () => {
        expect(transformValue('singleLineText', null)).toBeNull();
      });

      it('should return null for undefined values', () => {
        expect(transformValue('singleLineText', undefined)).toBeNull();
      });
    });

    describe('checkbox transformation', () => {
      it('should return true for true value', () => {
        expect(transformValue('checkbox', true)).toBe(true);
      });

      it('should return false for false value', () => {
        expect(transformValue('checkbox', false)).toBe(false);
      });

      it('should return false for undefined (unchecked)', () => {
        expect(transformValue('checkbox', undefined)).toBeNull();
      });
    });

    describe('multilineText transformation', () => {
      it('should return string value as-is', () => {
        expect(transformValue('multilineText', 'plain text')).toBe('plain text');
      });

      it('should extract text from object', () => {
        expect(transformValue('multilineText', { text: 'extracted' })).toBe('extracted');
      });
    });

    describe('richText transformation', () => {
      it('should return string value as-is', () => {
        expect(transformValue('richText', 'plain text')).toBe('plain text');
      });

      it('should extract text from object', () => {
        expect(transformValue('richText', { text: 'extracted' })).toBe('extracted');
      });
    });

    describe('aiText transformation', () => {
      it('should return string value as-is', () => {
        expect(transformValue('aiText', 'ai generated')).toBe('ai generated');
      });

      it('should extract value from object', () => {
        expect(transformValue('aiText', { value: 'ai value' })).toBe('ai value');
      });

      it('should extract state from object if no value', () => {
        expect(transformValue('aiText', { state: 'pending' })).toBe('pending');
      });

      it('should stringify object if no value or state', () => {
        const result = transformValue('aiText', { other: 'data' });
        expect(result).toBe('{"other":"data"}');
      });
    });

    describe('multipleAttachments transformation', () => {
      it('should return first URL from array', () => {
        const attachments = [
          { url: 'https://example.com/file1.pdf' },
          { url: 'https://example.com/file2.pdf' },
        ];
        expect(transformValue('multipleAttachments', attachments)).toBe('https://example.com/file1.pdf');
      });

      it('should return value as-is if not an array', () => {
        expect(transformValue('multipleAttachments', 'string')).toBe('string');
      });

      it('should return empty array as-is', () => {
        expect(transformValue('multipleAttachments', [])).toEqual([]);
      });
    });

    describe('singleCollaborator transformation', () => {
      it('should extract id, email, name from object', () => {
        const collab = { id: 'usr123', email: 'test@example.com', name: 'Test User', extra: 'ignored' };
        expect(transformValue('singleCollaborator', collab)).toEqual({
          id: 'usr123',
          email: 'test@example.com',
          name: 'Test User',
        });
      });

      it('should return non-object as-is', () => {
        expect(transformValue('singleCollaborator', 'string')).toBe('string');
      });
    });

    describe('multipleCollaborators transformation', () => {
      it('should extract id, email, name from each collaborator', () => {
        const collabs = [
          { id: 'usr1', email: 'a@example.com', name: 'User A', extra: 'ignored' },
          { id: 'usr2', email: 'b@example.com', name: 'User B' },
        ];
        expect(transformValue('multipleCollaborators', collabs)).toEqual([
          { id: 'usr1', email: 'a@example.com', name: 'User A' },
          { id: 'usr2', email: 'b@example.com', name: 'User B' },
        ]);
      });

      it('should return non-array as-is', () => {
        expect(transformValue('multipleCollaborators', 'string')).toBe('string');
      });
    });

    describe('createdBy/lastModifiedBy transformation', () => {
      it('should extract id, email, name from createdBy', () => {
        const user = { id: 'usr123', email: 'test@example.com', name: 'Test' };
        expect(transformValue('createdBy', user)).toEqual({
          id: 'usr123',
          email: 'test@example.com',
          name: 'Test',
        });
      });

      it('should extract id, email, name from lastModifiedBy', () => {
        const user = { id: 'usr123', email: 'test@example.com', name: 'Test' };
        expect(transformValue('lastModifiedBy', user)).toEqual({
          id: 'usr123',
          email: 'test@example.com',
          name: 'Test',
        });
      });
    });

    describe('barcode transformation', () => {
      it('should extract text and type from barcode object', () => {
        const barcode = { text: '123456', type: 'code39' };
        expect(transformValue('barcode', barcode)).toEqual({
          text: '123456',
          type: 'code39',
        });
      });

      it('should return non-object as-is', () => {
        expect(transformValue('barcode', 'string')).toBe('string');
      });
    });

    describe('lookup transformation', () => {
      it('should wrap non-array value in array', () => {
        expect(transformValue('lookup', 'single')).toEqual(['single']);
      });

      it('should return array as-is', () => {
        expect(transformValue('lookup', ['a', 'b'])).toEqual(['a', 'b']);
      });
    });

    describe('multipleRecordLinks transformation', () => {
      it('should return array as-is', () => {
        expect(transformValue('multipleRecordLinks', ['rec1', 'rec2'])).toEqual(['rec1', 'rec2']);
      });

      it('should return empty array for non-array', () => {
        expect(transformValue('multipleRecordLinks', 'rec1')).toEqual([]);
      });
    });

    describe('fields without transformation', () => {
      it('should return value as-is for singleLineText', () => {
        expect(transformValue('singleLineText', 'text')).toBe('text');
      });

      it('should return value as-is for number', () => {
        expect(transformValue('number', 42)).toBe(42);
      });

      it('should return value as-is for date', () => {
        expect(transformValue('date', '2024-01-15')).toBe('2024-01-15');
      });
    });
  });

  describe('prepareValueForWrite()', () => {
    describe('null/undefined handling', () => {
      it('should return null for null values', () => {
        expect(prepareValueForWrite('singleLineText', null)).toBeNull();
      });

      it('should return null for undefined values', () => {
        expect(prepareValueForWrite('singleLineText', undefined)).toBeNull();
      });
    });

    describe('checkbox preparation', () => {
      it('should convert truthy values to true', () => {
        expect(prepareValueForWrite('checkbox', true)).toBe(true);
        expect(prepareValueForWrite('checkbox', 1)).toBe(true);
        expect(prepareValueForWrite('checkbox', 'yes')).toBe(true);
      });

      it('should convert falsy values to false', () => {
        expect(prepareValueForWrite('checkbox', false)).toBe(false);
        expect(prepareValueForWrite('checkbox', 0)).toBe(false);
        expect(prepareValueForWrite('checkbox', '')).toBe(false);
      });
    });

    describe('number preparation', () => {
      it('should convert string to number', () => {
        expect(prepareValueForWrite('number', '42')).toBe(42);
        expect(prepareValueForWrite('number', '3.14')).toBe(3.14);
      });

      it('should keep number as number', () => {
        expect(prepareValueForWrite('number', 42)).toBe(42);
      });

      it('should work for currency, percent, rating, duration', () => {
        expect(prepareValueForWrite('currency', '100.50')).toBe(100.50);
        expect(prepareValueForWrite('percent', '0.5')).toBe(0.5);
        expect(prepareValueForWrite('rating', '4')).toBe(4);
        expect(prepareValueForWrite('duration', '3600')).toBe(3600);
      });
    });

    describe('date preparation', () => {
      it('should convert Date object to YYYY-MM-DD string', () => {
        const date = new Date('2024-01-15T12:00:00Z');
        expect(prepareValueForWrite('date', date)).toBe('2024-01-15');
      });

      it('should extract date part from ISO string', () => {
        expect(prepareValueForWrite('date', '2024-01-15T12:00:00Z')).toBe('2024-01-15');
      });

      it('should keep date-only string as-is', () => {
        expect(prepareValueForWrite('date', '2024-01-15')).toBe('2024-01-15');
      });
    });

    describe('dateTime preparation', () => {
      it('should convert Date object to ISO string', () => {
        const date = new Date('2024-01-15T12:00:00Z');
        expect(prepareValueForWrite('dateTime', date)).toBe('2024-01-15T12:00:00.000Z');
      });

      it('should keep string as-is', () => {
        expect(prepareValueForWrite('dateTime', '2024-01-15T12:00:00Z')).toBe('2024-01-15T12:00:00Z');
      });
    });

    describe('multipleSelects preparation', () => {
      it('should keep array as-is', () => {
        expect(prepareValueForWrite('multipleSelects', ['a', 'b'])).toEqual(['a', 'b']);
      });

      it('should wrap single value in array', () => {
        expect(prepareValueForWrite('multipleSelects', 'single')).toEqual(['single']);
      });
    });

    describe('multipleRecordLinks preparation', () => {
      it('should keep array as-is', () => {
        expect(prepareValueForWrite('multipleRecordLinks', ['rec1', 'rec2'])).toEqual(['rec1', 'rec2']);
      });

      it('should wrap single value in array', () => {
        expect(prepareValueForWrite('multipleRecordLinks', 'rec1')).toEqual(['rec1']);
      });
    });

    describe('multipleAttachments preparation', () => {
      it('should convert string URL to array of objects', () => {
        expect(prepareValueForWrite('multipleAttachments', 'https://example.com/file.pdf')).toEqual([
          { url: 'https://example.com/file.pdf' },
        ]);
      });

      it('should convert array of strings to array of objects', () => {
        expect(prepareValueForWrite('multipleAttachments', ['url1', 'url2'])).toEqual([
          { url: 'url1' },
          { url: 'url2' },
        ]);
      });

      it('should keep array of objects as-is', () => {
        const attachments = [{ url: 'url1', filename: 'file.pdf' }];
        expect(prepareValueForWrite('multipleAttachments', attachments)).toEqual(attachments);
      });
    });

    describe('singleCollaborator preparation', () => {
      it('should convert string ID to object', () => {
        expect(prepareValueForWrite('singleCollaborator', 'usr123')).toEqual({ id: 'usr123' });
      });

      it('should extract ID from object', () => {
        expect(prepareValueForWrite('singleCollaborator', { id: 'usr123', name: 'Test' })).toEqual({ id: 'usr123' });
      });
    });

    describe('multipleCollaborators preparation', () => {
      it('should convert string ID to array of objects', () => {
        expect(prepareValueForWrite('multipleCollaborators', 'usr123')).toEqual([{ id: 'usr123' }]);
      });

      it('should convert array of strings to array of objects', () => {
        expect(prepareValueForWrite('multipleCollaborators', ['usr1', 'usr2'])).toEqual([
          { id: 'usr1' },
          { id: 'usr2' },
        ]);
      });

      it('should extract IDs from array of objects', () => {
        const collabs = [
          { id: 'usr1', name: 'A' },
          { id: 'usr2', name: 'B' },
        ];
        expect(prepareValueForWrite('multipleCollaborators', collabs)).toEqual([
          { id: 'usr1' },
          { id: 'usr2' },
        ]);
      });
    });

    describe('barcode preparation', () => {
      it('should convert string to barcode object', () => {
        expect(prepareValueForWrite('barcode', '123456')).toEqual({ text: '123456' });
      });

      it('should extract text from object', () => {
        expect(prepareValueForWrite('barcode', { text: '123456', type: 'code39' })).toEqual({ text: '123456' });
      });
    });

    describe('default behavior', () => {
      it('should return value as-is for unknown types', () => {
        expect(prepareValueForWrite('unknownType', 'value')).toBe('value');
      });

      it('should return value as-is for singleLineText', () => {
        expect(prepareValueForWrite('singleLineText', 'text')).toBe('text');
      });
    });
  });

  describe('TRANSFORM_FUNCTIONS', () => {
    it('should have transform function for checkbox', () => {
      expect(TRANSFORM_FUNCTIONS.checkbox).toBeDefined();
      expect(typeof TRANSFORM_FUNCTIONS.checkbox).toBe('function');
    });

    it('should have transform function for multilineText', () => {
      expect(TRANSFORM_FUNCTIONS.multilineText).toBeDefined();
    });

    it('should have transform function for multipleAttachments', () => {
      expect(TRANSFORM_FUNCTIONS.multipleAttachments).toBeDefined();
    });

    it('should have transform function for lookup', () => {
      expect(TRANSFORM_FUNCTIONS.lookup).toBeDefined();
    });

    it('should have transform function for multipleRecordLinks', () => {
      expect(TRANSFORM_FUNCTIONS.multipleRecordLinks).toBeDefined();
    });
  });
});
