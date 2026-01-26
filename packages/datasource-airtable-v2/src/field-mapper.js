/**
 * Field type mapping between Airtable and Forest Admin
 * Maps Airtable field types to Forest Admin column types and operators
 */

// Map Airtable field types to Forest Admin column types
const FIELD_TYPE_MAP = {
  // Text types
  singleLineText: 'String',
  multilineText: 'String',
  richText: 'String',
  email: 'String',
  url: 'String',
  phoneNumber: 'String',

  // Number types
  number: 'Number',
  currency: 'Number',
  percent: 'Number',
  rating: 'Number',
  duration: 'Number',

  // Boolean
  checkbox: 'Boolean',

  // Date/Time types
  date: 'Dateonly',
  dateTime: 'Date',
  createdTime: 'Date',
  lastModifiedTime: 'Date',

  // Select types
  singleSelect: 'String',
  multipleSelects: 'Json',

  // Reference types
  multipleRecordLinks: 'Json',

  // Computed types
  formula: 'String',
  rollup: 'String',
  lookup: 'Json',
  count: 'Number',

  // File types
  multipleAttachments: 'String',

  // User types
  singleCollaborator: 'Json',
  multipleCollaborators: 'Json',
  createdBy: 'Json',
  lastModifiedBy: 'Json',

  // Other types
  barcode: 'Json',
  button: 'Json',
  autoNumber: 'Number',
  externalSyncSource: 'String',
  aiText: 'String',
};

// Fields that are read-only (computed or auto-generated)
const READ_ONLY_FIELDS = [
  'formula',
  'rollup',
  'lookup',
  'count',
  'createdTime',
  'lastModifiedTime',
  'createdBy',
  'lastModifiedBy',
  'autoNumber',
  'button',
  'externalSyncSource',
  'aiText',
];

// Filter operators by Forest Admin column type
const OPERATORS_BY_TYPE = {
  String: ['Equal', 'NotEqual', 'Present', 'Blank', 'Contains', 'NotContains', 'StartsWith', 'EndsWith'],
  Number: ['Equal', 'NotEqual', 'Present', 'Blank', 'GreaterThan', 'LessThan', 'GreaterThanOrEqual', 'LessThanOrEqual'],
  Boolean: ['Equal'],
  Date: ['Equal', 'NotEqual', 'Present', 'Blank', 'GreaterThan', 'LessThan', 'Before', 'After'],
  Dateonly: ['Equal', 'NotEqual', 'Present', 'Blank', 'GreaterThan', 'LessThan', 'Before', 'After'],
  Json: ['Present', 'Blank'],
};

/**
 * Transform functions for specific field types
 * Some Airtable field types return complex objects that need to be simplified
 */
const TRANSFORM_FUNCTIONS = {
  // Checkbox: Airtable returns undefined for unchecked, convert to false
  checkbox: (value) => {
    return value === true;
  },

  // Multiline text may come as object with different formats
  multilineText: (value) => {
    if (value && typeof value === 'object' && value.text) {
      return value.text;
    }
    return value;
  },

  // Rich text returns HTML, extract text content
  richText: (value) => {
    if (value && typeof value === 'object' && value.text) {
      return value.text;
    }
    return value;
  },

  // AI text returns object with value
  aiText: (value) => {
    if (value && typeof value === 'object') {
      return value.value || value.state || JSON.stringify(value);
    }
    return value;
  },

  // Multiple attachments - return first URL only
  multipleAttachments: (value) => {
    if (Array.isArray(value) && value.length > 0) {
      return value[0].url;
    }
    return value;
  },

  // Single collaborator
  singleCollaborator: (value) => {
    if (value && typeof value === 'object') {
      return {
        id: value.id,
        email: value.email,
        name: value.name
      };
    }
    return value;
  },

  // Multiple collaborators
  multipleCollaborators: (value) => {
    if (Array.isArray(value)) {
      return value.map(collab => ({
        id: collab.id,
        email: collab.email,
        name: collab.name
      }));
    }
    return value;
  },

  // Created by / Last modified by
  createdBy: (value) => {
    if (value && typeof value === 'object') {
      return {
        id: value.id,
        email: value.email,
        name: value.name
      };
    }
    return value;
  },

  lastModifiedBy: (value) => {
    if (value && typeof value === 'object') {
      return {
        id: value.id,
        email: value.email,
        name: value.name
      };
    }
    return value;
  },

  // Barcode
  barcode: (value) => {
    if (value && typeof value === 'object') {
      return {
        text: value.text,
        type: value.type
      };
    }
    return value;
  },

  // Lookup returns array
  lookup: (value) => {
    return Array.isArray(value) ? value : [value];
  },

  // Record links
  multipleRecordLinks: (value) => {
    return Array.isArray(value) ? value : [];
  }
};

/**
 * Get Forest Admin column type for an Airtable field type
 * @param {string} airtableType - Airtable field type
 * @returns {string} Forest Admin column type
 */
function getColumnType(airtableType) {
  return FIELD_TYPE_MAP[airtableType] || 'String';
}

/**
 * Check if a field type is read-only
 * @param {string} airtableType - Airtable field type
 * @returns {boolean}
 */
function isReadOnly(airtableType) {
  return READ_ONLY_FIELDS.includes(airtableType);
}

/**
 * Get supported filter operators for a column type
 * @param {string} columnType - Forest Admin column type
 * @returns {string[]} Array of supported operators
 */
function getOperators(columnType) {
  return OPERATORS_BY_TYPE[columnType] || ['Equal', 'NotEqual'];
}

/**
 * Transform a field value from Airtable format to Forest Admin format
 * @param {string} fieldType - Airtable field type
 * @param {any} value - The value to transform
 * @returns {any} Transformed value
 */
function transformValue(fieldType, value) {
  if (value === null || value === undefined) {
    return null;
  }

  const transformer = TRANSFORM_FUNCTIONS[fieldType];
  if (transformer) {
    return transformer(value);
  }

  return value;
}

/**
 * Prepare a value for writing to Airtable
 * @param {string} fieldType - Airtable field type
 * @param {any} value - The value to prepare
 * @returns {any} Prepared value
 */
function prepareValueForWrite(fieldType, value) {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle specific types that need conversion
  switch (fieldType) {
    case 'checkbox':
      return Boolean(value);

    case 'number':
    case 'currency':
    case 'percent':
    case 'rating':
    case 'duration':
      return Number(value);

    case 'date':
      // Airtable date field only accepts YYYY-MM-DD format
      if (value instanceof Date) {
        return value.toISOString().split('T')[0];
      }
      if (typeof value === 'string' && value.includes('T')) {
        return value.split('T')[0];
      }
      return value;

    case 'dateTime':
      // Ensure ISO format for dateTime
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;

    case 'multipleSelects':
      // Ensure array
      return Array.isArray(value) ? value : [value];

    case 'multipleRecordLinks':
      // Ensure array of record IDs
      return Array.isArray(value) ? value : [value];

    case 'multipleAttachments':
      // Airtable expects array of objects with url property
      if (typeof value === 'string') {
        return [{ url: value }];
      }
      if (Array.isArray(value)) {
        return value.map(item => typeof item === 'string' ? { url: item } : item);
      }
      return value;

    case 'singleCollaborator':
      // Airtable expects {id: "usrXXX"} format
      if (typeof value === 'string') {
        return { id: value };
      }
      if (value && typeof value === 'object' && value.id) {
        return { id: value.id };
      }
      return value;

    case 'multipleCollaborators':
      // Airtable expects array of {id: "usrXXX"} objects
      if (typeof value === 'string') {
        return [{ id: value }];
      }
      if (Array.isArray(value)) {
        return value.map(item => {
          if (typeof item === 'string') {
            return { id: item };
          }
          if (item && typeof item === 'object' && item.id) {
            return { id: item.id };
          }
          return item;
        });
      }
      return value;

    case 'barcode':
      // Airtable expects {text: "..."} format
      if (typeof value === 'string') {
        return { text: value };
      }
      if (value && typeof value === 'object' && value.text) {
        return { text: value.text };
      }
      return value;

    default:
      return value;
  }
}

module.exports = {
  FIELD_TYPE_MAP,
  READ_ONLY_FIELDS,
  OPERATORS_BY_TYPE,
  TRANSFORM_FUNCTIONS,
  getColumnType,
  isReadOnly,
  getOperators,
  transformValue,
  prepareValueForWrite
};
