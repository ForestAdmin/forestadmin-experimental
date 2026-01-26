/**
 * @forestadmin/datasource-airtable
 *
 * Forest Admin DataSource for Airtable
 */

const AirtableDataSource = require('./airtable-datasource');
const AirtableCollection = require('./airtable-collection');
const {
  AIRTABLE_API_URL,
  AIRTABLE_META_URL,
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
} = require('./constants');
const {
  mapFieldType,
  getFilterOperators,
  isReadOnlyField,
  FIELD_TYPE_MAP,
} = require('./field-mapper');
const {
  extractSingleRecordId,
  buildFilterFormula,
  buildSortParams,
  buildFieldsParams,
} = require('./filter-builder');

/**
 * Factory function to create an Airtable DataSource
 *
 * @param {Object} options - Configuration options
 * @returns {Function} DataSource factory function for Forest Admin
 *
 * @example
 * // Basic usage
 * agent.addDataSource(createAirtableDataSource());
 *
 * @example
 * // With configuration options
 * agent.addDataSource(createAirtableDataSource({
 *   apiToken: 'pat_xxxxx',
 *   excludeBases: ['Test Base'],
 *   collectionNameFormatter: (base, table) => table.name,
 * }));
 */
function createAirtableDataSource(options = {}) {
  return async () => {
    const dataSource = new AirtableDataSource(options);
    await dataSource.initialize();
    return dataSource;
  };
}

module.exports = {
  // Main exports
  createAirtableDataSource,
  AirtableDataSource,
  AirtableCollection,

  // Constants
  AIRTABLE_API_URL,
  AIRTABLE_META_URL,
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,

  // Field mapping utilities
  mapFieldType,
  getFilterOperators,
  isReadOnlyField,
  FIELD_TYPE_MAP,

  // Filter builder utilities
  extractSingleRecordId,
  buildFilterFormula,
  buildSortParams,
  buildFieldsParams,
};
