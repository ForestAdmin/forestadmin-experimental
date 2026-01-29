/**
 * Airtable-specific type definitions
 */

/**
 * Airtable field types as returned by the Meta API
 */
export type AirtableFieldType =
  | 'singleLineText'
  | 'email'
  | 'url'
  | 'multilineText'
  | 'number'
  | 'percent'
  | 'currency'
  | 'singleSelect'
  | 'multipleSelects'
  | 'singleCollaborator'
  | 'multipleCollaborators'
  | 'multipleRecordLinks'
  | 'date'
  | 'dateTime'
  | 'phoneNumber'
  | 'multipleAttachments'
  | 'checkbox'
  | 'formula'
  | 'createdTime'
  | 'rollup'
  | 'count'
  | 'lookup'
  | 'multipleLookupValues'
  | 'autoNumber'
  | 'barcode'
  | 'rating'
  | 'richText'
  | 'duration'
  | 'lastModifiedTime'
  | 'button'
  | 'createdBy'
  | 'lastModifiedBy'
  | 'externalSyncSource'
  | 'aiText';

/**
 * Airtable field definition from Meta API
 */
export interface AirtableFieldDefinition {
  id: string;
  name: string;
  type: AirtableFieldType;
  description?: string;
  options?: AirtableFieldOptions;
}

/**
 * Field options for various Airtable field types
 */
export interface AirtableFieldOptions {
  // For select fields
  choices?: Array<{
    id: string;
    name: string;
    color?: string;
  }>;

  // For number/currency fields
  precision?: number;
  symbol?: string;

  // For date/dateTime fields
  dateFormat?: {
    name: string;
    format: string;
  };
  timeFormat?: {
    name: string;
    format: string;
  };
  timeZone?: string;

  // For formula/rollup fields
  result?: {
    type: AirtableFieldType;
    options?: AirtableFieldOptions;
  };

  // For linked records
  linkedTableId?: string;
  prefersSingleRecordLink?: boolean;
  inverseLinkFieldId?: string;

  // For rating fields
  max?: number;
  icon?: string;
  color?: string;

  // For duration fields
  durationFormat?: string;
}

/**
 * Airtable table definition from Meta API
 */
export interface AirtableTableDefinition {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: AirtableFieldDefinition[];
  views?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

/**
 * Airtable base definition from Meta API
 */
export interface AirtableBaseDefinition {
  id: string;
  name: string;
  permissionLevel: 'none' | 'read' | 'comment' | 'edit' | 'create';
  workspaceId?: string;
}

/**
 * Airtable record structure
 */
export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, unknown>;
}

/**
 * Airtable attachment object
 */
export interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
  thumbnails?: {
    small?: { url: string; width: number; height: number };
    large?: { url: string; width: number; height: number };
    full?: { url: string; width: number; height: number };
  };
}

/**
 * Airtable collaborator object
 */
export interface AirtableCollaborator {
  id: string;
  email: string;
  name: string;
}

/**
 * Airtable barcode object
 */
export interface AirtableBarcode {
  text: string;
  type?: string;
}

/**
 * Airtable button field result
 */
export interface AirtableButtonResult {
  label: string;
  url?: string;
}
