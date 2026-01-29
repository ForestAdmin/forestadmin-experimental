/**
 * Tests for Serializer utility
 */

import { AirtableFieldType, AirtableRecord } from '../src/types/airtable';
import Serializer from '../src/utils/serializer';

describe('Serializer', () => {
  const fieldDefs: Array<{ name: string; type: AirtableFieldType }> = [
    { name: 'Name', type: 'singleLineText' },
    { name: 'Email', type: 'email' },
    { name: 'Age', type: 'number' },
    { name: 'Active', type: 'checkbox' },
    { name: 'StartDate', type: 'date' },
    { name: 'CreatedAt', type: 'dateTime' },
    { name: 'Status', type: 'singleSelect' },
    { name: 'Tags', type: 'multipleSelects' },
    { name: 'RelatedRecords', type: 'multipleRecordLinks' },
  ];

  describe('serialize', () => {
    it('should serialize an Airtable record to Forest Admin format', () => {
      const record: AirtableRecord = {
        id: 'rec123',
        createdTime: '2024-01-15T10:00:00.000Z',
        fields: {
          Name: 'John Doe',
          Email: 'john@example.com',
          Age: 30,
          Active: true,
          StartDate: '2024-01-01',
          CreatedAt: '2024-01-15T10:00:00.000Z',
          Status: 'Active',
          Tags: ['Tag1', 'Tag2'],
          RelatedRecords: ['rec456', 'rec789'],
        },
      };

      const result = Serializer.serialize(record, fieldDefs);

      expect(result.id).toBe('rec123');
      expect(result.Name).toBe('John Doe');
      expect(result.Email).toBe('john@example.com');
      expect(result.Age).toBe(30);
      expect(result.Active).toBe(true);
      expect(result.StartDate).toBe('2024-01-01');
      expect(result.Status).toBe('Active');
      expect(result.Tags).toEqual(['Tag1', 'Tag2']);
      expect(result.RelatedRecords).toEqual(['rec456', 'rec789']);
    });

    it('should handle null values', () => {
      const record: AirtableRecord = {
        id: 'rec123',
        createdTime: '2024-01-15T10:00:00.000Z',
        fields: {
          Name: null,
          Age: undefined,
        },
      };

      const result = Serializer.serialize(record, fieldDefs);

      expect(result.Name).toBeNull();
      expect(result.Age).toBeNull();
    });

    it('should convert number strings to numbers', () => {
      const record: AirtableRecord = {
        id: 'rec123',
        createdTime: '2024-01-15T10:00:00.000Z',
        fields: {
          Age: '30' as unknown as number,
        },
      };

      const result = Serializer.serialize(record, fieldDefs);

      expect(result.Age).toBe(30);
    });
  });

  describe('deserialize', () => {
    it('should deserialize Forest Admin patch to Airtable format', () => {
      const patch = {
        Name: 'Jane Doe',
        Email: 'jane@example.com',
        Age: 25,
        Active: false,
      };

      const result = Serializer.deserialize(patch, fieldDefs);

      expect(result.Name).toBe('Jane Doe');
      expect(result.Email).toBe('jane@example.com');
      expect(result.Age).toBe(25);
      expect(result.Active).toBe(false);
    });

    it('should skip id field', () => {
      const patch = {
        id: 'rec123',
        Name: 'Jane Doe',
      };

      const result = Serializer.deserialize(patch, fieldDefs);

      expect(result.id).toBeUndefined();
      expect(result.Name).toBe('Jane Doe');
    });

    it('should skip read-only fields', () => {
      const fieldsWithReadOnly: Array<{ name: string; type: AirtableFieldType }> = [
        ...fieldDefs,
        { name: 'Formula', type: 'formula' },
        { name: 'AutoNum', type: 'autoNumber' },
      ];

      const patch = {
        Name: 'Jane Doe',
        Formula: 'some value',
        AutoNum: 123,
      };

      const result = Serializer.deserialize(patch, fieldsWithReadOnly);

      expect(result.Name).toBe('Jane Doe');
      expect(result.Formula).toBeUndefined();
      expect(result.AutoNum).toBeUndefined();
    });

    it('should handle date conversion', () => {
      const patch = {
        StartDate: '2024-06-15',
        CreatedAt: new Date('2024-06-15T10:00:00.000Z'),
      };

      const result = Serializer.deserialize(patch, fieldDefs);

      expect(result.StartDate).toBe('2024-06-15T00:00:00.000Z');
      expect(result.CreatedAt).toBe('2024-06-15T10:00:00.000Z');
    });

    it('should handle boolean conversion', () => {
      const patch = {
        Active: 1,
      };

      const result = Serializer.deserialize(patch, fieldDefs);

      expect(result.Active).toBe(true);
    });

    it('should warn for unknown fields', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const patch = {
        UnknownField: 'value',
      };

      Serializer.deserialize(patch, fieldDefs);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Field 'UnknownField' not found"),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('serializeValue', () => {
    it('should handle attachment serialization', () => {
      const attachments = [
        {
          id: 'att1',
          url: 'https://example.com/file1.pdf',
          filename: 'file1.pdf',
          size: 1024,
          type: 'application/pdf',
        },
      ];

      const result = Serializer.serializeValue(attachments, 'multipleAttachments');

      expect(result).toEqual([
        {
          id: 'att1',
          url: 'https://example.com/file1.pdf',
          filename: 'file1.pdf',
          size: 1024,
          type: 'application/pdf',
          width: undefined,
          height: undefined,
        },
      ]);
    });

    it('should handle collaborator serialization', () => {
      const collaborator = {
        id: 'user1',
        email: 'user@example.com',
        name: 'Test User',
      };

      const result = Serializer.serializeValue(collaborator, 'singleCollaborator');

      expect(result).toEqual({
        id: 'user1',
        email: 'user@example.com',
        name: 'Test User',
      });
    });

    it('should handle barcode serialization', () => {
      const barcode = {
        text: '123456789',
        type: 'upca',
      };

      const result = Serializer.serializeValue(barcode, 'barcode');

      expect(result).toEqual({
        text: '123456789',
        type: 'upca',
      });
    });
  });

  describe('deserializeValue', () => {
    it('should handle attachment deserialization', () => {
      const attachments = [
        { url: 'https://example.com/file1.pdf', filename: 'file1.pdf' },
      ];

      const result = Serializer.deserializeValue(attachments, 'multipleAttachments');

      expect(result).toEqual([
        { url: 'https://example.com/file1.pdf', filename: 'file1.pdf' },
      ]);
    });

    it('should handle URL-only attachments', () => {
      const attachments = ['https://example.com/file1.pdf'];

      const result = Serializer.deserializeValue(attachments, 'multipleAttachments');

      expect(result).toEqual([{ url: 'https://example.com/file1.pdf' }]);
    });

    it('should handle collaborator by email', () => {
      const result = Serializer.deserializeValue('user@example.com', 'singleCollaborator');

      expect(result).toEqual({ email: 'user@example.com' });
    });

    it('should handle collaborator by ID', () => {
      const result = Serializer.deserializeValue('usr123', 'singleCollaborator');

      expect(result).toEqual({ id: 'usr123' });
    });

    it('should handle barcode deserialization from string', () => {
      const result = Serializer.deserializeValue('123456789', 'barcode');

      expect(result).toEqual({ text: '123456789' });
    });

    it('should handle barcode deserialization from object', () => {
      const barcode = { text: '123456789', type: 'upca' };
      const result = Serializer.deserializeValue(barcode, 'barcode');

      expect(result).toEqual({ text: '123456789', type: 'upca' });
    });

    it('should handle multiple collaborators', () => {
      const collaborators = [
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' },
      ];

      const result = Serializer.deserializeValue(collaborators, 'multipleCollaborators');

      expect(result).toEqual([
        { id: 'user1', email: 'user1@example.com' },
        { id: 'user2', email: 'user2@example.com' },
      ]);
    });

    it('should handle single collaborator as array input', () => {
      const collaborator = { id: 'user1', email: 'user1@example.com' };

      const result = Serializer.deserializeValue(collaborator, 'multipleCollaborators');

      expect(result).toEqual([{ id: 'user1', email: 'user1@example.com' }]);
    });

    it('should return null for invalid barcode', () => {
      const result = Serializer.deserializeValue(null, 'barcode');

      expect(result).toBeNull();
    });

    it('should return null for invalid collaborator', () => {
      const result = Serializer.deserializeValue(null, 'singleCollaborator');

      expect(result).toBeNull();
    });

    it('should return undefined for read-only fields', () => {
      expect(Serializer.deserializeValue('value', 'formula')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'rollup')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'count')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'lookup')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'createdTime')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'lastModifiedTime')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'autoNumber')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'createdBy')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'lastModifiedBy')).toBeUndefined();
      expect(Serializer.deserializeValue('value', 'aiText')).toBeUndefined();
    });

    it('should handle multipleSelects', () => {
      const result = Serializer.deserializeValue(['Tag1', 'Tag2'], 'multipleSelects');

      expect(result).toEqual(['Tag1', 'Tag2']);
    });

    it('should convert single value to array for multipleSelects', () => {
      const result = Serializer.deserializeValue('Tag1', 'multipleSelects');

      expect(result).toEqual(['Tag1']);
    });

    it('should handle multipleRecordLinks', () => {
      const result = Serializer.deserializeValue(['rec1', 'rec2'], 'multipleRecordLinks');

      expect(result).toEqual(['rec1', 'rec2']);
    });

    it('should convert single value to array for multipleRecordLinks', () => {
      const result = Serializer.deserializeValue('rec1', 'multipleRecordLinks');

      expect(result).toEqual(['rec1']);
    });
  });

  describe('serializeValue edge cases', () => {
    it('should handle checkbox - unchecked (undefined) returns false', () => {
      const result = Serializer.serializeValue(undefined, 'checkbox');

      expect(result).toBe(false);
    });

    it('should handle checkbox - checked returns true', () => {
      const result = Serializer.serializeValue(true, 'checkbox');

      expect(result).toBe(true);
    });

    it('should handle multilineText with object format', () => {
      const value = { text: 'This is\nmultiline\ntext' };
      const result = Serializer.serializeValue(value, 'multilineText');

      expect(result).toBe('This is\nmultiline\ntext');
    });

    it('should handle richText with object format', () => {
      const value = { text: '<p>Rich text</p>' };
      const result = Serializer.serializeValue(value, 'richText');

      expect(result).toBe('<p>Rich text</p>');
    });

    it('should handle aiText with value property', () => {
      const value = { value: 'AI generated text', state: 'complete' };
      const result = Serializer.serializeValue(value, 'aiText');

      expect(result).toBe('AI generated text');
    });

    it('should handle aiText with text property', () => {
      const value = { text: 'AI text', state: 'complete' };
      const result = Serializer.serializeValue(value, 'aiText');

      expect(result).toBe('AI text');
    });

    it('should handle aiText with state only', () => {
      const value = { state: 'generating' };
      const result = Serializer.serializeValue(value, 'aiText');

      expect(result).toBe('generating');
    });

    it('should handle aiText fallback to JSON', () => {
      const value = { unknownProp: 'data' };
      const result = Serializer.serializeValue(value, 'aiText');

      expect(result).toBe(JSON.stringify(value));
    });

    it('should handle lookup returning array', () => {
      const value = ['value1', 'value2'];
      const result = Serializer.serializeValue(value, 'lookup');

      expect(result).toEqual(['value1', 'value2']);
    });

    it('should handle lookup returning single value as array', () => {
      const value = 'single value';
      const result = Serializer.serializeValue(value, 'lookup');

      expect(result).toEqual(['single value']);
    });

    it('should handle lookup returning null', () => {
      // null value gets caught by early return before the switch statement
      const result = Serializer.serializeValue(null, 'lookup');

      expect(result).toBeNull();
    });

    it('should handle lookup returning undefined value inside switch', () => {
      // Test that internal undefined check in lookup case returns empty array
      // This is tested when the serialize method is called, not serializeValue directly
      const result = Serializer.serializeValue([], 'lookup');

      expect(result).toEqual([]);
    });

    it('should handle multipleLookupValues', () => {
      const value = [{ id: 1 }, { id: 2 }];
      const result = Serializer.serializeValue(value, 'multipleLookupValues');

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it('should handle multipleCollaborators serialization', () => {
      const collaborators = [
        { id: 'user1', email: 'user1@example.com', name: 'User 1' },
        { id: 'user2', email: 'user2@example.com', name: 'User 2' },
      ];

      const result = Serializer.serializeValue(collaborators, 'multipleCollaborators');

      expect(result).toEqual([
        { id: 'user1', email: 'user1@example.com', name: 'User 1' },
        { id: 'user2', email: 'user2@example.com', name: 'User 2' },
      ]);
    });

    it('should handle createdBy/lastModifiedBy serialization', () => {
      const collaborator = { id: 'user1', email: 'user@example.com', name: 'User' };

      expect(Serializer.serializeValue(collaborator, 'createdBy')).toEqual({
        id: 'user1',
        email: 'user@example.com',
        name: 'User',
      });

      expect(Serializer.serializeValue(collaborator, 'lastModifiedBy')).toEqual({
        id: 'user1',
        email: 'user@example.com',
        name: 'User',
      });
    });

    it('should handle formula with date-like string', () => {
      const result = Serializer.serializeValue('2024-01-15T10:00:00.000Z', 'formula');

      expect(result).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should handle formula with number', () => {
      const result = Serializer.serializeValue(42, 'formula');

      expect(result).toBe(42);
    });

    it('should handle rollup', () => {
      const value = { sum: 100 };
      const result = Serializer.serializeValue(value, 'rollup');

      expect(result).toEqual({ sum: 100 });
    });

    it('should handle button field', () => {
      const value = { label: 'Click me', url: 'https://example.com' };
      const result = Serializer.serializeValue(value, 'button');

      expect(result).toEqual(value);
    });

    it('should handle externalSyncSource', () => {
      const value = { source: 'salesforce', id: 'sf123' };
      const result = Serializer.serializeValue(value, 'externalSyncSource');

      expect(result).toEqual(value);
    });

    it('should handle empty attachments array', () => {
      const result = Serializer.serializeValue('not an array', 'multipleAttachments');

      expect(result).toEqual([]);
    });

    it('should handle empty collaborators array', () => {
      const result = Serializer.serializeValue('not an array', 'multipleCollaborators');

      expect(result).toEqual([]);
    });

    it('should handle null collaborator', () => {
      const result = Serializer.serializeValue(null, 'singleCollaborator');

      expect(result).toBeNull();
    });

    it('should handle null barcode', () => {
      const result = Serializer.serializeValue(null, 'barcode');

      expect(result).toBeNull();
    });

    it('should handle invalid date', () => {
      const result = Serializer.serializeValue('not a date', 'date');

      expect(result).toBeNull();
    });

    it('should handle valid date', () => {
      const result = Serializer.serializeValue('2024-01-15', 'date');

      expect(result).toBe('2024-01-15');
    });

    it('should handle dateTime', () => {
      const result = Serializer.serializeValue('2024-01-15T10:00:00.000Z', 'dateTime');

      expect(result).toBe('2024-01-15T10:00:00.000Z');
    });

    it('should handle percent', () => {
      const result = Serializer.serializeValue(0.5, 'percent');

      expect(result).toBe(0.5);
    });

    it('should handle currency', () => {
      const result = Serializer.serializeValue(100.50, 'currency');

      expect(result).toBe(100.50);
    });

    it('should handle rating', () => {
      const result = Serializer.serializeValue(4, 'rating');

      expect(result).toBe(4);
    });

    it('should handle duration', () => {
      const result = Serializer.serializeValue(3600, 'duration');

      expect(result).toBe(3600);
    });

    it('should handle count', () => {
      const result = Serializer.serializeValue(10, 'count');

      expect(result).toBe(10);
    });

    it('should handle autoNumber', () => {
      const result = Serializer.serializeValue(42, 'autoNumber');

      expect(result).toBe(42);
    });

    it('should handle default/unknown field types', () => {
      const result = Serializer.serializeValue('some value', 'unknownType' as any);

      expect(result).toBe('some value');
    });
  });
});
