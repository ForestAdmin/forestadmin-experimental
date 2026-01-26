/**
 * Forest Admin Airtable Datasource v2
 * Using the official Airtable Node.js SDK
 *
 * @module @forestadmin/datasource-airtable-v2
 */

const AirtableDataSource = require('./airtable-datasource');
const AirtableCollection = require('./airtable-collection');

/**
 * Create an Airtable datasource factory function for Forest Admin
 *
 * @param {object} options - Configuration options
 * @param {string} [options.apiKey] - Airtable API key (defaults to AIRTABLE_API_KEY env var)
 * @param {string} [options.endpointUrl] - Custom Airtable API endpoint URL
 * @param {Function} [options.collectionNameFormatter] - Custom function to format collection names
 *   Signature: (base: {id, name}, table: {id, name}) => string
 *   Default: (base, table) => `${base.name} - ${table.name}`
 * @param {string[]} [options.includeBases] - Only include bases with these names
 * @param {string[]} [options.excludeBases] - Exclude bases with these names
 * @param {string[]} [options.includeTables] - Only include tables with these names
 * @param {string[]} [options.excludeTables] - Exclude tables with these names
 *
 * @returns {Function} Async factory function that creates the datasource
 *
 * @example
 * // Basic usage
 * agent.addDataSource(createAirtableDataSource());
 *
 * @example
 * // With custom API key
 * agent.addDataSource(createAirtableDataSource({
 *   apiKey: 'your-api-key'
 * }));
 *
 * @example
 * // With filtering and custom naming
 * agent.addDataSource(createAirtableDataSource({
 *   includeBases: ['My Base'],
 *   excludeTables: ['Archive', 'Test'],
 *   collectionNameFormatter: (base, table) => table.name
 * }));
 */
function createAirtableDataSource(options = {}) {
  return async () => {
    const dataSource = new AirtableDataSource(options);
    await dataSource.initialize();
    return dataSource;
  };
}

// Export factory function as default and named export
module.exports = createAirtableDataSource;
module.exports.createAirtableDataSource = createAirtableDataSource;

// Export classes for advanced usage
module.exports.AirtableDataSource = AirtableDataSource;
module.exports.AirtableCollection = AirtableCollection;

// Re-export utilities for customization
module.exports.fieldMapper = require('./field-mapper');
module.exports.filterBuilder = require('./filter-builder');
module.exports.constants = require('./constants');
