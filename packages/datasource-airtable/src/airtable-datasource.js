/**
 * AirtableDataSource - Forest Admin DataSource implementation for Airtable
 */

const { BaseDataSource } = require('@forestadmin/datasource-toolkit');
const axios = require('axios');

const { AIRTABLE_META_URL } = require('./constants');
const AirtableCollection = require('./airtable-collection');

/**
 * AirtableDataSource - Main datasource class
 *
 * Automatically discovers and imports all bases and tables from an Airtable workspace
 */
class AirtableDataSource extends BaseDataSource {
  /**
   * @param {Object} options - Configuration options
   * @param {string} options.apiToken - Airtable API Token (optional, defaults to env var)
   * @param {Function} options.collectionNameFormatter - Custom collection name formatter
   * @param {Array<string>} options.includeBases - Only include specified bases (by name or ID)
   * @param {Array<string>} options.excludeBases - Exclude specified bases
   * @param {Array<string>} options.includeTables - Only include specified tables
   * @param {Array<string>} options.excludeTables - Exclude specified tables
   */
  constructor(options = {}) {
    super();

    this.apiToken = options.apiToken || process.env.AIRTABLE_API_KEY;
    this.options = {
      collectionNameFormatter: options.collectionNameFormatter || ((base, table) => `${base.name} - ${table.name}`),
      includeBases: options.includeBases || null,
      excludeBases: options.excludeBases || [],
      includeTables: options.includeTables || null,
      excludeTables: options.excludeTables || [],
      ...options,
    };
  }

  /**
   * Check if a base should be included
   */
  _shouldIncludeBase(base) {
    const { includeBases, excludeBases } = this.options;

    // Check exclusion list
    if (excludeBases.includes(base.id) || excludeBases.includes(base.name)) {
      return false;
    }

    // Check inclusion list
    if (includeBases) {
      return includeBases.includes(base.id) || includeBases.includes(base.name);
    }

    return true;
  }

  /**
   * Check if a table should be included
   */
  _shouldIncludeTable(table) {
    const { includeTables, excludeTables } = this.options;

    // Check exclusion list
    if (excludeTables.includes(table.id) || excludeTables.includes(table.name)) {
      return false;
    }

    // Check inclusion list
    if (includeTables) {
      return includeTables.includes(table.id) || includeTables.includes(table.name);
    }

    return true;
  }

  /**
   * Initialize the datasource - discover and register all Airtable tables
   */
  async initialize() {
    if (!this.apiToken) {
      throw new Error(
        'Airtable API Token is required. ' +
        'Set AIRTABLE_API_KEY environment variable or pass apiToken in options.'
      );
    }

    const headers = {
      Authorization: `Bearer ${this.apiToken}`,
    };

    try {
      // Fetch all bases
      console.log('[AirtableDataSource] Fetching bases...');
      const basesResponse = await axios.get(`${AIRTABLE_META_URL}/bases`, { headers });
      const bases = basesResponse.data.bases;

      console.log(`[AirtableDataSource] Found ${bases.length} base(s)`);

      // Process each base
      for (const base of bases) {
        if (!this._shouldIncludeBase(base)) {
          console.log(`[AirtableDataSource] Skipping base: ${base.name}`);
          continue;
        }

        console.log(`[AirtableDataSource] Processing base: ${base.name} (${base.id})`);

        try {
          // Fetch base schema
          const schemaResponse = await axios.get(
            `${AIRTABLE_META_URL}/bases/${base.id}/tables`,
            { headers }
          );

          const tables = schemaResponse.data.tables;
          console.log(`[AirtableDataSource]   Found ${tables.length} table(s)`);

          // Process each table
          for (const table of tables) {
            if (!this._shouldIncludeTable(table)) {
              console.log(`[AirtableDataSource]   Skipping table: ${table.name}`);
              continue;
            }

            const collectionName = this.options.collectionNameFormatter(base, table);
            console.log(`[AirtableDataSource]   Adding collection: ${collectionName}`);

            this.addCollection(
              new AirtableCollection(
                this,
                base.id,
                table.id,
                collectionName,
                table.fields,
                { base, table }
              )
            );
          }
        } catch (schemaError) {
          console.error(`[AirtableDataSource]   Error fetching schema for ${base.name}:`, schemaError.message);
        }
      }

      console.log(`[AirtableDataSource] Initialized with ${this.collections.length} collection(s)`);
    } catch (error) {
      console.error('[AirtableDataSource] Failed to initialize:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = AirtableDataSource;
