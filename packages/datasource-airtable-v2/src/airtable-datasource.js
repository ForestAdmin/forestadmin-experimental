/**
 * AirtableDataSource - Forest Admin DataSource implementation using Airtable SDK
 * Handles schema discovery and collection registration
 */

const Airtable = require('airtable');
const axios = require('axios');
const { BaseDataSource } = require('@forestadmin/datasource-toolkit');
const { AIRTABLE_META_URL } = require('./constants');
const AirtableCollection = require('./airtable-collection');

class AirtableDataSource extends BaseDataSource {
  /**
   * @param {object} options - Configuration options
   * @param {string} [options.apiKey] - Airtable API key (or AIRTABLE_API_KEY env var)
   * @param {string} [options.endpointUrl] - Custom Airtable API endpoint URL
   * @param {Function} [options.collectionNameFormatter] - Custom collection naming function
   * @param {string[]} [options.includeBases] - Only include these bases (by name)
   * @param {string[]} [options.excludeBases] - Exclude these bases (by name)
   * @param {string[]} [options.includeTables] - Only include these tables (by name)
   * @param {string[]} [options.excludeTables] - Exclude these tables (by name)
   */
  constructor(options = {}) {
    super();

    this.apiKey = options.apiKey || process.env.AIRTABLE_API_KEY;
    if (!this.apiKey) {
      throw new Error('Airtable API key is required. Provide it via options.apiKey or AIRTABLE_API_KEY environment variable.');
    }

    this.options = {
      endpointUrl: options.endpointUrl,
      collectionNameFormatter: options.collectionNameFormatter || ((base, table) => `${base.name} - ${table.name}`),
      includeBases: options.includeBases || null,
      excludeBases: options.excludeBases || [],
      includeTables: options.includeTables || null,
      excludeTables: options.excludeTables || [],
    };

    // Configure Airtable SDK
    const airtableConfig = {
      apiKey: this.apiKey,
    };

    if (this.options.endpointUrl) {
      airtableConfig.endpointUrl = this.options.endpointUrl;
    }

    Airtable.configure(airtableConfig);

    // Store base instances
    this.bases = new Map();
  }

  /**
   * Get authorization headers for Meta API requests
   * @returns {object} Headers object
   */
  _getHeaders() {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch all accessible bases using Meta API
   * @returns {Promise<Array>} Array of base objects with workspace info
   */
  async _fetchBases() {
    try {
      const response = await axios.get(`${AIRTABLE_META_URL}/bases`, {
        headers: this._getHeaders(),
      });
      const bases = response.data.bases || [];

      // Log workspace info for debugging
      for (const base of bases) {
        console.log(`Base: ${base.name} (${base.id}), Workspace ID: ${base.workspaceId || 'N/A'}`);
      }

      return bases;
    } catch (error) {
      console.error('Error fetching Airtable bases:', error.message);
      throw new Error(`Failed to fetch Airtable bases: ${error.message}`);
    }
  }

  /**
   * Fetch schema for a specific base using Meta API
   * @param {string} baseId - Airtable base ID
   * @returns {Promise<object>} Base schema with tables
   */
  async _fetchBaseSchema(baseId) {
    try {
      const response = await axios.get(`${AIRTABLE_META_URL}/bases/${baseId}/tables`, {
        headers: this._getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching schema for base ${baseId}:`, error.message);
      throw new Error(`Failed to fetch schema for base ${baseId}: ${error.message}`);
    }
  }

  /**
   * Check if a base should be included based on configuration
   * @param {object} base - Base object with name
   * @returns {boolean}
   */
  _shouldIncludeBase(base) {
    const { includeBases, excludeBases } = this.options;

    // If includeBases is specified, only include those
    if (includeBases && includeBases.length > 0) {
      return includeBases.includes(base.name);
    }

    // Otherwise, exclude specified bases
    return !excludeBases.includes(base.name);
  }

  /**
   * Check if a table should be included based on configuration
   * @param {object} table - Table object with name
   * @returns {boolean}
   */
  _shouldIncludeTable(table) {
    const { includeTables, excludeTables } = this.options;

    // If includeTables is specified, only include those
    if (includeTables && includeTables.length > 0) {
      return includeTables.includes(table.name);
    }

    // Otherwise, exclude specified tables
    return !excludeTables.includes(table.name);
  }

  /**
   * Initialize the datasource - discover schema and register collections
   * This is called automatically by Forest Admin
   */
  async initialize() {
    console.log('Initializing Airtable datasource v2 (SDK-based)...');

    // Fetch all bases
    const bases = await this._fetchBases();
    console.log(`Found ${bases.length} Airtable bases`);

    // Process each base
    for (const baseInfo of bases) {
      // Check if base should be included
      if (!this._shouldIncludeBase(baseInfo)) {
        console.log(`Skipping base: ${baseInfo.name}`);
        continue;
      }

      console.log(`Processing base: ${baseInfo.name} (${baseInfo.id})`);

      try {
        // Create Airtable SDK base instance
        const base = Airtable.base(baseInfo.id);
        this.bases.set(baseInfo.id, base);

        // Fetch base schema
        const schema = await this._fetchBaseSchema(baseInfo.id);

        // Process each table in the base
        for (const table of schema.tables || []) {
          // Check if table should be included
          if (!this._shouldIncludeTable(table)) {
            console.log(`  Skipping table: ${table.name}`);
            continue;
          }

          // Generate collection name
          const collectionName = this.options.collectionNameFormatter(baseInfo, table);
          console.log(`  Registering collection: ${collectionName}`);

          // Create and register collection
          const collection = new AirtableCollection(
            this,
            base,
            collectionName,
            table.id,
            table.fields || []
          );

          this.addCollection(collection);
        }
      } catch (error) {
        console.error(`Error processing base ${baseInfo.name}:`, error.message);
        // Continue with other bases
      }
    }

    console.log(`Airtable datasource initialized with ${this.collections.length} collections`);
  }
}

module.exports = AirtableDataSource;
