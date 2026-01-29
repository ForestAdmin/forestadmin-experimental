/**
 * Serializer utility for transforming data between Airtable and Forest Admin formats
 */

import { RecordData } from '@forestadmin/datasource-toolkit';

import {
  AirtableAttachment,
  AirtableBarcode,
  AirtableCollaborator,
  AirtableFieldType,
  AirtableRecord,
} from '../types/airtable';

/**
 * Field definition for serialization
 */
interface FieldDef {
  name: string;
  type: AirtableFieldType;
  options?: Record<string, unknown>;
}

export default class Serializer {
  /**
   * Transform an Airtable record to Forest Admin format
   */
  static serialize(record: AirtableRecord, fields: FieldDef[]): RecordData {
    const result: RecordData = {
      id: record.id,
    };

    for (const field of fields) {
      const value = record.fields[field.name];
      result[field.name] = Serializer.serializeValue(value, field.type);
    }

    return result;
  }

  /**
   * Serialize a single value based on field type
   */
  static serializeValue(value: unknown, fieldType: AirtableFieldType): unknown {
    // Special handling for checkbox - Airtable returns undefined for unchecked boxes
    if (fieldType === 'checkbox') {
      return value === true;
    }

    if (value === null || value === undefined) {
      return null;
    }

    switch (fieldType) {
      // Text fields - handle object format with .text property (v2 compatibility)
      case 'multilineText':
      case 'richText':
        if (value && typeof value === 'object' && 'text' in (value as object)) {
          return (value as { text: string }).text;
        }

        return String(value);

      case 'aiText':
        // AI text fields can have complex object format
        if (value && typeof value === 'object') {
          const aiValue = value as { value?: string; state?: string; text?: string };

          return aiValue.value || aiValue.text || aiValue.state || JSON.stringify(value);
        }

        return String(value);

      case 'singleLineText':
      case 'email':
      case 'url':
      case 'phoneNumber':
        return String(value);

      // Numeric fields
      case 'number':
      case 'percent':
      case 'currency':
      case 'rating':
      case 'duration':
      case 'autoNumber':
      case 'count':
        return typeof value === 'number' ? value : parseFloat(String(value)) || null;

      // Note: checkbox is handled at the beginning of this function

      // Date fields
      case 'date':
        return Serializer.serializeDate(value, false);

      case 'dateTime':
      case 'createdTime':
      case 'lastModifiedTime':
        return Serializer.serializeDate(value, true);

      // Single select - return the string value
      case 'singleSelect':
        return String(value);

      // Multiple select - return array of strings
      case 'multipleSelects':
        return Array.isArray(value) ? value.map(String) : [String(value)];

      // Linked records - return array of record IDs
      case 'multipleRecordLinks':
        return Array.isArray(value) ? value : [];

      // Lookup fields - always return as array (v2 compatibility)
      case 'lookup':
      case 'multipleLookupValues':
        // Airtable lookup can return single value or array, normalize to array
        if (value === null || value === undefined) {
          return [];
        }

        return Array.isArray(value) ? value : [value];

      // Rollup - can be any type, return as-is
      case 'rollup':
        return value;

      // Formula - could be any type
      case 'formula':
        return Serializer.serializeFormulaValue(value);

      // Attachments
      case 'multipleAttachments':
        return Serializer.serializeAttachments(value as AirtableAttachment[]);

      // Collaborators
      case 'singleCollaborator':
        return Serializer.serializeCollaborator(value as AirtableCollaborator);

      case 'multipleCollaborators':
        return Serializer.serializeCollaborators(value as AirtableCollaborator[]);

      // Barcode
      case 'barcode':
        return Serializer.serializeBarcode(value as AirtableBarcode);

      // Button
      case 'button':
        return value;

      // Created/modified by
      case 'createdBy':
      case 'lastModifiedBy':
        return Serializer.serializeCollaborator(value as AirtableCollaborator);

      // External sync source
      case 'externalSyncSource':
        return value;

      default:
        return value;
    }
  }

  /**
   * Serialize a date value
   */
  private static serializeDate(value: unknown, includeTime: boolean): string | null {
    if (!value) {
      return null;
    }

    try {
      const date = new Date(String(value));

      if (isNaN(date.getTime())) {
        return null;
      }

      if (includeTime) {
        return date.toISOString();
      }

      // Return date only (YYYY-MM-DD)
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  /**
   * Serialize formula field value (could be any type)
   */
  private static serializeFormulaValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    // If it looks like a date, format it
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return Serializer.serializeDate(value, true);
    }

    // Return as-is
    return value;
  }

  /**
   * Serialize attachments array
   */
  private static serializeAttachments(attachments: AirtableAttachment[]): unknown[] {
    if (!Array.isArray(attachments)) {
      return [];
    }

    return attachments.map(att => ({
      id: att.id,
      url: att.url,
      filename: att.filename,
      size: att.size,
      type: att.type,
      width: att.width,
      height: att.height,
    }));
  }

  /**
   * Serialize a single collaborator
   */
  private static serializeCollaborator(collaborator: AirtableCollaborator): unknown {
    if (!collaborator) {
      return null;
    }

    return {
      id: collaborator.id,
      email: collaborator.email,
      name: collaborator.name,
    };
  }

  /**
   * Serialize collaborators array
   */
  private static serializeCollaborators(collaborators: AirtableCollaborator[]): unknown[] {
    if (!Array.isArray(collaborators)) {
      return [];
    }

    return collaborators.map(c => Serializer.serializeCollaborator(c));
  }

  /**
   * Serialize barcode field
   */
  private static serializeBarcode(barcode: AirtableBarcode): unknown {
    if (!barcode) {
      return null;
    }

    return {
      text: barcode.text,
      type: barcode.type,
    };
  }

  /**
   * Prepare a patch object for writing to Airtable
   */
  static deserialize(patch: RecordData, fields: FieldDef[]): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [fieldName, value] of Object.entries(patch)) {
      // Skip id field
      if (fieldName === 'id') {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Find field definition
      const fieldDef = fields.find(f => f.name === fieldName);

      if (!fieldDef) {
        console.warn(`Field '${fieldName}' not found in schema, skipping`);
        // eslint-disable-next-line no-continue
        continue;
      }

      const deserializedValue = Serializer.deserializeValue(value, fieldDef.type);

      if (deserializedValue !== undefined) {
        result[fieldName] = deserializedValue;
      }
    }

    return result;
  }

  /**
   * Deserialize a single value for writing to Airtable
   */
  static deserializeValue(value: unknown, fieldType: AirtableFieldType): unknown {
    if (value === null || value === undefined) {
      return null;
    }

    switch (fieldType) {
      // Text fields
      case 'singleLineText':
      case 'email':
      case 'url':
      case 'multilineText':
      case 'phoneNumber':
      case 'richText':
        return String(value);

      // Numeric fields
      case 'number':
      case 'percent':
      case 'currency':
      case 'rating':
      case 'duration':
        return typeof value === 'number' ? value : parseFloat(String(value));

      // Boolean
      case 'checkbox':
        return Boolean(value);

      // Date fields
      case 'date':
      case 'dateTime':
        return Serializer.deserializeDate(value);

      // Single select
      case 'singleSelect':
        return String(value);

      // Multiple select
      case 'multipleSelects':
        return Array.isArray(value) ? value.map(String) : [String(value)];

      // Linked records - expect array of record IDs
      case 'multipleRecordLinks':
        return Array.isArray(value) ? value : [value];

      // Attachments - expect array of {url} objects
      case 'multipleAttachments':
        return Serializer.deserializeAttachments(value);

      // Collaborators - expect array of {id} or {email}
      case 'singleCollaborator':
        return Serializer.deserializeCollaborator(value);

      case 'multipleCollaborators':
        return Serializer.deserializeCollaborators(value);

      // Barcode
      case 'barcode':
        return Serializer.deserializeBarcode(value);

      // Read-only fields - return undefined to skip
      case 'formula':
      case 'rollup':
      case 'count':
      case 'lookup':
      case 'multipleLookupValues':
      case 'createdTime':
      case 'lastModifiedTime':
      case 'autoNumber':
      case 'button':
      case 'createdBy':
      case 'lastModifiedBy':
      case 'externalSyncSource':
      case 'aiText':
        return undefined;

      default:
        return value;
    }
  }

  /**
   * Deserialize date for Airtable
   */
  private static deserializeDate(value: unknown): string | null {
    if (!value) {
      return null;
    }

    try {
      if (value instanceof Date) {
        return value.toISOString();
      }

      const date = new Date(String(value));

      if (isNaN(date.getTime())) {
        return null;
      }

      return date.toISOString();
    } catch {
      return null;
    }
  }

  /**
   * Deserialize attachments for Airtable
   */
  private static deserializeAttachments(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.map(att => {
      if (typeof att === 'string') {
        return { url: att };
      }

      if (typeof att === 'object' && att !== null) {
        const attachment = att as { url?: string; filename?: string };

        return {
          url: attachment.url,
          filename: attachment.filename,
        };
      }

      return null;
    }).filter(Boolean);
  }

  /**
   * Deserialize single collaborator
   */
  private static deserializeCollaborator(value: unknown): unknown {
    if (!value) {
      return null;
    }

    if (typeof value === 'object') {
      const collab = value as { id?: string; email?: string };

      return { id: collab.id, email: collab.email };
    }

    // Assume it's an email or ID
    if (typeof value === 'string') {
      if (value.includes('@')) {
        return { email: value };
      }

      return { id: value };
    }

    return null;
  }

  /**
   * Deserialize multiple collaborators
   */
  private static deserializeCollaborators(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
      const single = Serializer.deserializeCollaborator(value);

      return single ? [single] : [];
    }

    return value
      .map(v => Serializer.deserializeCollaborator(v))
      .filter(Boolean);
  }

  /**
   * Deserialize barcode
   */
  private static deserializeBarcode(value: unknown): unknown {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      return { text: value };
    }

    if (typeof value === 'object') {
      const barcode = value as { text?: string; type?: string };

      return { text: barcode.text, type: barcode.type };
    }

    return null;
  }
}
