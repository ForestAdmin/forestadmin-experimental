/**
 * Field Type Mapping Module
 *
 * Maps Airtable field types to Forest Admin supported types
 */

/**
 * Mapping table from Airtable field types to Forest Admin field configurations
 */
const FIELD_TYPE_MAP = {
  // Boolean type -> Boolean (must be before text types for transform)
  checkbox: { type: 'Boolean', transform: (value) => value === true },

  // Text types -> String
  singleLineText: { type: 'String', transform: null },
  multilineText: { type: 'String', transform: (value) => {
    console.log('Transforming multilineText value:', value);
    if (typeof value === 'object' && value !== null) {
      if (value.plaintext) {
        console.log('Using plaintext:', value.plaintext);
        return value.plaintext;
      }
      if (value.text) {
        console.log('Using text:', value.text);
        return value.text;
      }
      console.log('No plaintext or text, using JSON.stringify');
      return JSON.stringify(value);
    }
    console.log('Value is not object, returning as is');
    return value;
  }},
  aiText: { type: 'String', transform: (value) => {
    console.log('Transforming aiText value:', value);
    if (typeof value === 'object' && value !== null) {
      if (value.value) {
        console.log('Using value:', value.value);
        return value.value;
      }
      console.log('No value, using JSON.stringify');
      return JSON.stringify(value);
    }
    console.log('Value is not object, returning as is');
    return value;
  }},
  richText: { type: 'String', transform: null },
  email: { type: 'String', transform: null },
  url: { type: 'String', transform: null },
  phoneNumber: { type: 'String', transform: null },

  // Number types -> Number
  number: { type: 'Number', transform: null },
  currency: { type: 'Number', transform: null },
  percent: { type: 'Number', transform: null },
  duration: { type: 'Number', transform: null },
  rating: { type: 'Number', transform: null },
  count: { type: 'Number', transform: null },
  autoNumber: { type: 'Number', transform: null },


  // Date types
  date: { type: 'Dateonly', transform: null },
  dateTime: { type: 'Date', transform: null },
  createdTime: { type: 'Date', transform: null },
  lastModifiedTime: { type: 'Date', transform: null },

  // Selection types
  singleSelect: { type: 'String', transform: null },
  multipleSelects: { type: 'Json', transform: null },

  // Collaborator types -> Json
  singleCollaborator: { type: 'Json', transform: null },
  multipleCollaborators: { type: 'Json', transform: null },

  // Linked records and attachments -> Json
  multipleRecordLinks: { type: 'Json', transform: null },
  multipleAttachments: { type: 'String', transform: (value) => {
    console.log('Transforming multipleAttachments value:', value);
    if (Array.isArray(value) && value.length > 0) {
      console.log('Using first attachment url:', value[0].url);
      return value[0].url;
    }
    console.log('No attachments or not array, returning as is');
    return value;
  }},

  // Computed fields
  formula: { type: 'String', transform: null },
  rollup: { type: 'String', transform: null },
  lookup: { type: 'Json', transform: null },

  // Others
  barcode: { type: 'String', transform: null },
  button: { type: 'Json', transform: null },
  externalSyncSource: { type: 'String', transform: null },
};

/**
 * List of text-type fields
 */
const TEXT_TYPES = [
  'singleLineText', 'multilineText', 'richText',
  'email', 'url', 'phoneNumber', 'singleSelect'
];

/**
 * List of number-type fields
 */
const NUMBER_TYPES = [
  'number', 'currency', 'percent', 'duration',
  'rating', 'count', 'autoNumber'
];

/**
 * Maps Airtable field type to Forest Admin field type
 *
 * @param {string} airtableType - Airtable field type
 * @returns {string} Forest Admin field type
 */
function mapFieldType(airtableType) {
  const config = FIELD_TYPE_MAP[airtableType];
  return config ? config.type : 'String';
}

/**
 * Gets the transform function for an Airtable field type
 *
 * @param {string} airtableType - Airtable field type
 * @returns {Function|null} Transform function or null
 */
function getTransformFunction(airtableType) {
  const config = FIELD_TYPE_MAP[airtableType];
  return config ? config.transform : null;
}

/**
 * Returns supported filter operators for a given Airtable field type
 *
 * @param {string} airtableType - Airtable field type
 * @returns {Set<string>} Set of supported operators
 */
function getFilterOperators(airtableType) {
  if (TEXT_TYPES.includes(airtableType)) {
    return new Set(['Equal', 'NotEqual', 'Contains', 'StartsWith', 'EndsWith']);
  }
  if (NUMBER_TYPES.includes(airtableType)) {
    return new Set(['Equal', 'NotEqual', 'GreaterThan', 'LessThan', 'GreaterThanOrEqual', 'LessThanOrEqual']);
  }
  if (airtableType === 'checkbox') {
    return new Set(['Equal']);
  }
  return new Set(['Equal', 'NotEqual']);
}

/**
 * Checks if a field type is read-only
 *
 * @param {string} airtableType - Airtable field type
 * @returns {boolean}
 */
function isReadOnlyField(airtableType) {
  const readOnlyTypes = [
    'formula', 'rollup', 'lookup', 'count',
    'createdTime', 'lastModifiedTime', 'autoNumber', 'button'
  ];
  return readOnlyTypes.includes(airtableType);
}

/**
 * Extracts string value from Airtable field, handling special cases
 *
 * @param {string} airtableType - Airtable field type
 * @param {*} value - Raw value from Airtable
 * @returns {*} Processed value
 */
function extractStringValue(airtableType, value) {
  const transform = getTransformFunction(airtableType);
  return transform ? transform(value) : value;
}

/**
 * Prepare a value for writing to Airtable
 * Handles type conversions for specific field types
 *
 * @param {string} airtableType - Airtable field type
 * @param {*} value - Value to prepare
 * @returns {*} Prepared value
 */
function prepareValueForWrite(airtableType, value) {
  if (value === null || value === undefined) {
    return null;
  }

  switch (airtableType) {
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
  TEXT_TYPES,
  NUMBER_TYPES,
  mapFieldType,
  getFilterOperators,
  isReadOnlyField,
  getTransformFunction,
  prepareValueForWrite,
};
