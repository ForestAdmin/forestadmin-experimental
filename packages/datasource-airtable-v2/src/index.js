/**
 * Forest Admin Airtable Datasource v2
 * Using the official Airtable Node.js SDK
 *
 * @module @forestadmin/datasource-airtable-v2
 */

import AirtableCollection from './airtable-collection';
import AirtableDataSource from './airtable-datasource';
import * as constants from './constants';
import * as fieldMapper from './field-mapper';
import * as filterBuilder from './filter-builder';

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
  return async logger => {
    const dataSource = new AirtableDataSource({ ...options, logger });
    await dataSource.initialize();

    return dataSource;
  };
}

// Export factory function as default
export default createAirtableDataSource;

// Export named exports
export { createAirtableDataSource, AirtableDataSource, AirtableCollection };

// Re-export utilities for customization
export { fieldMapper, filterBuilder, constants };
