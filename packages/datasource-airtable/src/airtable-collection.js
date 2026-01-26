/**
 * AirtableCollection - Forest Admin Collection implementation for Airtable tables
 */

const { BaseCollection } = require('@forestadmin/datasource-toolkit');
const axios = require('axios');

const { AIRTABLE_API_URL, BATCH_SIZE, DEFAULT_PAGE_SIZE } = require('./constants');
const { mapFieldType, getFilterOperators, isReadOnlyField, getTransformFunction, prepareValueForWrite } = require('./field-mapper');
const {
  extractSingleRecordId,
  buildFilterFormula,
  buildSortParams,
  buildFieldsParams,
} = require('./filter-builder');

/**
 * AirtableCollection - Represents a single Airtable table
 */
class AirtableCollection extends BaseCollection {
  /**
   * @param {Object} dataSource - Parent datasource instance
   * @param {string} baseId - Airtable Base ID
   * @param {string} tableId - Airtable Table ID
   * @param {string} tableName - Display name in Forest Admin
   * @param {Array} fields - Airtable field definitions
   * @param {Object} options - Additional configuration options
   */
  constructor(dataSource, baseId, tableId, tableName, fields, options = {}) {
    super(tableName, dataSource);

    this.baseId = baseId;
    this.tableId = tableId;
    this.apiToken = dataSource.apiToken;
    this.options = options;
    this.fields = fields; // Store field definitions for transformation

    // Register the id field (primary key)
    this.addField('id', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: true,
      isReadOnly: true,
      filterOperators: new Set(['Equal', 'NotEqual', 'In', 'NotIn']),
      isSortable: false,
    });

    // Register all Airtable fields
    for (const field of fields) {
      const columnType = mapFieldType(field.type);

      this.addField(field.name, {
        type: 'Column',
        columnType,
        isReadOnly: isReadOnlyField(field.type),
        filterOperators: getFilterOperators(field.type),
        isSortable: true,
      });
    }
  }

  /**
   * Get request headers for Airtable API
   */
  _getHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get the base URL for this table's API endpoint
   */
  _getBaseUrl() {
    return `${AIRTABLE_API_URL}/${this.baseId}/${encodeURIComponent(this.tableId)}`;
  }

  /**
   * Transform Airtable record format to Forest Admin format
   */
  _transformRecord(record) {
    const transformed = {
      id: record.id,
    };

    // Transform each field value
    for (const [fieldName, value] of Object.entries(record.fields)) {
      const fieldDef = this.fields.find(f => f.name === fieldName);
      if (fieldDef) {
        console.log(`Transforming field ${fieldName}, type: ${fieldDef.type}, value:`, value);
        const transform = getTransformFunction(fieldDef.type);
        transformed[fieldName] = transform ? transform(value) : value;
        console.log(`Transformed value:`, transformed[fieldName]);
      } else {
        console.log(`No fieldDef for ${fieldName}`);
        transformed[fieldName] = value;
      }
    }

    return transformed;
  }

  /**
   * Prepare data for writing to Airtable
   * Converts field values to Airtable-compatible formats
   */
  _prepareForWrite(data) {
    const prepared = {};
    for (const [fieldName, value] of Object.entries(data)) {
      if (fieldName === 'id') continue;

      const fieldDef = this.fields.find(f => f.name === fieldName);
      if (fieldDef) {
        // Skip read-only fields
        if (isReadOnlyField(fieldDef.type)) continue;
        prepared[fieldName] = prepareValueForWrite(fieldDef.type, value);
      } else {
        prepared[fieldName] = value;
      }
    }
    return prepared;
  }

  /**
   * LIST - Retrieve records
   */
  async list(caller, filter, projection) {
    // Handle single record retrieval by ID
    const singleRecordId = extractSingleRecordId(filter);
    if (singleRecordId) {
      try {
        const response = await axios.get(
          `${this._getBaseUrl()}/${singleRecordId}`,
          { headers: this._getHeaders() }
        );
        return [this._transformRecord(response.data)];
      } catch (error) {
        if (error.response?.status === 404) {
          return [];
        }
        console.error('Airtable get record error:', error.response?.data || error.message);
        throw error;
      }
    }

    // Build query parameters
    const params = {};

    if (filter?.page) {
      params.pageSize = filter.page.limit || DEFAULT_PAGE_SIZE;
    }

    const formula = buildFilterFormula(filter);
    if (formula) {
      params.filterByFormula = formula;
    }

    const sort = buildSortParams(filter?.sort);
    if (sort) {
      params.sort = sort;
    }

    const fields = buildFieldsParams(projection);
    if (fields) {
      params.fields = fields;
    }

    try {
      const response = await axios.get(this._getBaseUrl(), {
        headers: this._getHeaders(),
        params,
      });

      return response.data.records.map(record => this._transformRecord(record));
    } catch (error) {
      console.error('Airtable list error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * AGGREGATE - Perform aggregation operations
   */
  async aggregate(caller, filter, aggregation) {
    const records = await this.list(caller, filter, null);

    if (aggregation.operation === 'Count') {
      return [{ value: records.length, group: {} }];
    }

    const field = aggregation.field;
    const values = records
      .map(r => r[field])
      .filter(v => v != null && typeof v === 'number');

    let result;
    switch (aggregation.operation) {
      case 'Sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'Avg':
        result = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
        break;
      case 'Max':
        result = values.length > 0 ? Math.max(...values) : null;
        break;
      case 'Min':
        result = values.length > 0 ? Math.min(...values) : null;
        break;
      default:
        result = null;
    }

    return [{ value: result, group: {} }];
  }

  /**
   * CREATE - Create new records
   */
  async create(caller, data) {
    try {
      const response = await axios.post(
        this._getBaseUrl(),
        {
          records: data.map(item => ({
            fields: this._prepareForWrite(item),
          })),
        },
        { headers: this._getHeaders() }
      );

      return response.data.records.map(record => this._transformRecord(record));
    } catch (error) {
      console.error('Airtable create error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * UPDATE - Update existing records
   */
  async update(caller, filter, patch) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    const preparedPatch = this._prepareForWrite(patch);

    try {
      // Airtable allows max 10 records per batch
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        await axios.patch(
          this._getBaseUrl(),
          {
            records: batch.map(record => ({
              id: record.id,
              fields: preparedPatch,
            })),
          },
          { headers: this._getHeaders() }
        );
      }
    } catch (error) {
      console.error('Airtable update error:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * DELETE - Delete records
   */
  async delete(caller, filter) {
    const records = await this.list(caller, filter, null);

    if (records.length === 0) return;

    try {
      // Airtable allows max 10 records per batch
      for (let i = 0; i < records.length; i += BATCH_SIZE) {
        const batch = records.slice(i, i + BATCH_SIZE);
        const params = batch.map(r => `records[]=${r.id}`).join('&');
        await axios.delete(`${this._getBaseUrl()}?${params}`, {
          headers: this._getHeaders(),
        });
      }
    } catch (error) {
      console.error('Airtable delete error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = AirtableCollection;
