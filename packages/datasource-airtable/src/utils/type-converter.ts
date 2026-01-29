/**
 * Type converter utility for mapping Airtable field types to Forest Admin column types
 */

import { ColumnType, Operator } from '@forestadmin/datasource-toolkit';

import { AirtableFieldType } from '../types/airtable';

/**
 * Mapping of Airtable field types to Forest Admin column types
 */
const FIELD_TYPE_MAP: Record<AirtableFieldType, ColumnType> = {
  // Text fields
  singleLineText: 'String',
  email: 'String',
  url: 'String',
  multilineText: 'String',
  phoneNumber: 'String',
  richText: 'String',

  // Numeric fields
  number: 'Number',
  percent: 'Number',
  currency: 'Number',
  rating: 'Number',
  duration: 'Number',
  autoNumber: 'Number',
  count: 'Number',

  // Boolean fields
  checkbox: 'Boolean',

  // Date/time fields
  date: 'Dateonly',
  dateTime: 'Date',
  createdTime: 'Date',
  lastModifiedTime: 'Date',

  // Select fields
  singleSelect: 'Enum',
  multipleSelects: 'Json',

  // Relationship fields
  multipleRecordLinks: 'Json',
  lookup: 'Json',
  multipleLookupValues: 'Json',

  // Complex fields - stored as JSON
  multipleAttachments: 'Json',
  singleCollaborator: 'Json',
  multipleCollaborators: 'Json',
  barcode: 'Json',
  button: 'Json',
  createdBy: 'Json',
  lastModifiedBy: 'Json',
  externalSyncSource: 'Json',

  // Computed fields
  formula: 'String',
  rollup: 'String',

  // AI fields
  aiText: 'String',
};

/**
 * Read-only field types that cannot be modified via API
 * 12 types as documented in v2
 */
const READ_ONLY_TYPES: Set<AirtableFieldType> = new Set([
  'formula',
  'rollup',
  'count',
  'lookup',
  'multipleLookupValues',
  'createdTime',
  'lastModifiedTime',
  'autoNumber',
  'button',
  'createdBy',
  'lastModifiedBy',
  'externalSyncSource',
  'aiText', // AI-generated text is read-only
]);

/**
 * Non-sortable field types
 */
const NON_SORTABLE_TYPES: Set<AirtableFieldType> = new Set([
  'multipleAttachments',
  'multipleRecordLinks',
  'multipleSelects',
  'multipleCollaborators',
  'lookup',
  'multipleLookupValues',
  'button',
]);

export default class TypeConverter {
  /**
   * Convert Airtable field type to Forest Admin column type
   */
  static toColumnType(airtableType: AirtableFieldType): ColumnType {
    return FIELD_TYPE_MAP[airtableType] || 'String';
  }

  /**
   * Check if a field type is read-only
   */
  static isReadOnly(airtableType: AirtableFieldType): boolean {
    return READ_ONLY_TYPES.has(airtableType);
  }

  /**
   * Check if a field type is sortable
   */
  static isSortable(airtableType: AirtableFieldType): boolean {
    return !NON_SORTABLE_TYPES.has(airtableType);
  }

  /**
   * Get filter operators for a column type
   */
  static getFilterOperators(columnType: ColumnType): Set<Operator> {
    switch (columnType) {
      case 'String':
        return new Set<Operator>([
          'Equal',
          'NotEqual',
          'Present',
          'Blank',
          'In',
          'NotIn',
          'Contains',
          'NotContains',
          'StartsWith',
          'EndsWith',
          'Like',
        ]);

      case 'Number':
        return new Set<Operator>([
          'Equal',
          'NotEqual',
          'Present',
          'Blank',
          'In',
          'NotIn',
          'GreaterThan',
          'GreaterThanOrEqual',
          'LessThan',
          'LessThanOrEqual',
        ]);

      case 'Boolean':
        return new Set<Operator>(['Equal', 'NotEqual', 'Present', 'Blank']);

      case 'Date':
      case 'Dateonly':
        return new Set<Operator>([
          'Equal',
          'NotEqual',
          'Present',
          'Blank',
          'GreaterThan',
          'LessThan',
          'Today',
          'Yesterday',
          'PreviousWeek',
          'PreviousMonth',
          'PreviousQuarter',
          'PreviousYear',
          'Before',
          'After',
          'PreviousXDays',
        ]);

      case 'Enum':
        return new Set<Operator>(['Equal', 'NotEqual', 'Present', 'Blank', 'In', 'NotIn']);

      case 'Json':
        return new Set<Operator>(['Present', 'Blank']);

      default:
        return new Set<Operator>(['Equal', 'NotEqual', 'Present', 'Blank']);
    }
  }

  /**
   * Get enum values for a single select field
   */
  static getEnumValues(options?: { choices?: Array<{ name: string }> }): string[] | undefined {
    if (!options?.choices) {
      return undefined;
    }

    return options.choices.map(choice => choice.name);
  }

  /**
   * Determine the result type of a formula or rollup field
   */
  static getComputedFieldType(options?: { result?: { type: AirtableFieldType } }): ColumnType {
    if (!options?.result?.type) {
      return 'String';
    }

    return TypeConverter.toColumnType(options.result.type);
  }
}
