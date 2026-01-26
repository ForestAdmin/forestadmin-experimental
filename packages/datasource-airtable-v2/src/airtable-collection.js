/**
 * AirtableCollection - Forest Admin Collection implementation using Airtable SDK
 * Handles all CRUD operations for a single Airtable table
 */

const { BaseCollection } = require('@forestadmin/datasource-toolkit');
const { BATCH_SIZE, DEFAULT_PAGE_SIZE } = require('./constants');
const { getColumnType, isReadOnly, getOperators, transformValue, prepareValueForWrite } = require('./field-mapper');
const { buildFilterFormula, buildSort, buildFields, extractRecordId, extractRecordIds } = require('./filter-builder');

class AirtableCollection extends BaseCollection {
  /**
   * @param {object} dataSource - Parent datasource
   * @param {object} base - Airtable SDK base instance
   * @param {string} tableName - Collection name in Forest Admin
   * @param {string} tableId - Airtable table ID
   * @param {Array} fields - Airtable field definitions
   */
  constructor(dataSource, base, tableName, tableId, fields) {
    super(tableName, dataSource);

    this.base = base;
    this.tableId = tableId;
    this.table = base(tableId);
    this.airtableFields = fields;

    // Register the schema
    this._registerSchema(fields);
  }

  /**
   * Register the collection schema with Forest Admin
   * @param {Array} fields - Airtable field definitions
   */
  _registerSchema(fields) {
    // Add the 'id' field (Airtable record ID)
    this.addField('id', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: true,
      isReadOnly: true,
      filterOperators: new Set(['Equal', 'NotEqual', 'In', 'NotIn']),
      isSortable: false,
    });

    // Add each Airtable field
    for (const field of fields) {
      const columnType = getColumnType(field.type);
      const readOnly = isReadOnly(field.type);
      const operators = getOperators(columnType);

      this.addField(field.name, {
        type: 'Column',
        columnType,
        isReadOnly: readOnly,
        filterOperators: new Set(operators),
        isSortable: true,
      });
    }
  }

  /**
   * Transform an Airtable record to Forest Admin format
   * @param {object} record - Airtable record
   * @returns {object} Transformed record
   */
  _transformRecord(record) {
    const result = {
      id: record.id,
    };

    for (const field of this.airtableFields) {
      const value = record.fields[field.name];
      result[field.name] = transformValue(field.type, value);
    }

    return result;
  }

  /**
   * Prepare a patch object for writing to Airtable
   * @param {object} patch - Forest Admin patch object
   * @returns {object} Airtable fields object
   */
  _prepareForWrite(patch) {
    const fields = {};

    for (const [fieldName, value] of Object.entries(patch)) {
      // Skip id field
      if (fieldName === 'id') continue;

      // Find field definition
      const fieldDef = this.airtableFields.find(f => f.name === fieldName);
      if (!fieldDef) {
        console.warn(`Field '${fieldName}' not found in table schema, skipping`);
        continue;
      }

      // Skip read-only fields
      if (isReadOnly(fieldDef.type)) {
        console.warn(`Field '${fieldName}' is read-only, skipping`);
        continue;
      }

      fields[fieldName] = prepareValueForWrite(fieldDef.type, value);
    }

    return fields;
  }

  /**
   * List records from Airtable
   * @param {object} caller - Forest Admin caller context
   * @param {object} filter - Filter configuration
   * @param {object} projection - Fields to return
   * @returns {Promise<Array>} Array of records
   */
  async list(caller, filter, projection) {
    try {
      // Check for single record ID lookup (optimization)
      const singleId = extractRecordId(filter);
      if (singleId) {
        try {
          const record = await this.table.find(singleId);
          return [this._transformRecord(record)];
        } catch (error) {
          if (error.statusCode === 404) {
            return [];
          }
          throw error;
        }
      }

      // Check for multiple record IDs lookup
      const multipleIds = extractRecordIds(filter);
      if (multipleIds && multipleIds.length > 0) {
        const records = await Promise.all(
          multipleIds.map(async (id) => {
            try {
              const record = await this.table.find(id);
              return this._transformRecord(record);
            } catch (error) {
              if (error.statusCode === 404) {
                return null;
              }
              throw error;
            }
          })
        );
        return records.filter(Boolean);
      }

      // Build query options
      const queryOptions = {
        pageSize: DEFAULT_PAGE_SIZE,
      };

      // Add filter formula
      const formula = buildFilterFormula(filter?.conditionTree);
      if (formula) {
        queryOptions.filterByFormula = formula;
      }

      // Add sort
      const sort = buildSort(filter?.sort);
      if (sort.length > 0) {
        queryOptions.sort = sort;
      }

      // Add field projection
      const fields = buildFields(projection);
      if (fields && fields.length > 0) {
        queryOptions.fields = fields;
      }

      // Fetch all records using .all() which handles pagination automatically
      const allRecords = await this.table.select(queryOptions).all();

      // Transform records
      let records = allRecords.map(record => this._transformRecord(record));

      // Apply skip and limit if specified
      const skip = filter?.page?.skip || 0;
      const limit = filter?.page?.limit;

      if (skip > 0 || limit) {
        records = records.slice(skip, limit ? skip + limit : undefined);
      }

      return records;
    } catch (error) {
      console.error('Error listing records:', error.message);
      throw error;
    }
  }

  /**
   * Create records in Airtable
   * @param {object} caller - Forest Admin caller context
   * @param {Array} data - Array of record data to create
   * @returns {Promise<Array>} Created records
   */
  async create(caller, data) {
    try {
      const recordsToCreate = data.map(item => ({
        fields: this._prepareForWrite(item),
      }));

      // Batch create (Airtable limits to 10 records per request)
      const createdRecords = [];

      for (let i = 0; i < recordsToCreate.length; i += BATCH_SIZE) {
        const batch = recordsToCreate.slice(i, i + BATCH_SIZE);
        const created = await this.table.create(batch);

        for (const record of created) {
          createdRecords.push(this._transformRecord(record));
        }
      }

      return createdRecords;
    } catch (error) {
      console.error('Error creating records:', error.message);
      throw error;
    }
  }

  /**
   * Update records in Airtable
   * @param {object} caller - Forest Admin caller context
   * @param {object} filter - Filter to select records to update
   * @param {object} patch - Fields to update
   * @returns {Promise<void>}
   */
  async update(caller, filter, patch) {
    try {
      // First, get the records to update
      const records = await this.list(caller, filter, ['id']);

      if (records.length === 0) {
        return;
      }

      const preparedPatch = this._prepareForWrite(patch);
      const recordsToUpdate = records.map(record => ({
        id: record.id,
        fields: preparedPatch,
      }));

      // Batch update (Airtable limits to 10 records per request)
      for (let i = 0; i < recordsToUpdate.length; i += BATCH_SIZE) {
        const batch = recordsToUpdate.slice(i, i + BATCH_SIZE);
        await this.table.update(batch);
      }
    } catch (error) {
      console.error('Error updating records:', error.message);
      throw error;
    }
  }

  /**
   * Delete records from Airtable
   * @param {object} caller - Forest Admin caller context
   * @param {object} filter - Filter to select records to delete
   * @returns {Promise<void>}
   */
  async delete(caller, filter) {
    try {
      // First, get the records to delete
      const records = await this.list(caller, filter, ['id']);

      if (records.length === 0) {
        return;
      }

      const recordIds = records.map(record => record.id);

      // Batch delete (Airtable limits to 10 records per request)
      for (let i = 0; i < recordIds.length; i += BATCH_SIZE) {
        const batch = recordIds.slice(i, i + BATCH_SIZE);
        await this.table.destroy(batch);
      }
    } catch (error) {
      console.error('Error deleting records:', error.message);
      throw error;
    }
  }

  /**
   * Aggregate records
   * @param {object} caller - Forest Admin caller context
   * @param {object} filter - Filter configuration
   * @param {object} aggregation - Aggregation configuration
   * @param {number} limit - Maximum number of results
   * @returns {Promise<Array>} Aggregation results
   */
  async aggregate(caller, filter, aggregation, limit) {
    try {
      // Fetch records matching the filter
      const records = await this.list(caller, filter, null);

      const { operation, field, groups } = aggregation;

      // Group records if needed
      const groupedRecords = {};

      if (groups && groups.length > 0) {
        for (const record of records) {
          const groupKey = groups.map(g => record[g.field]).join('|');
          if (!groupedRecords[groupKey]) {
            groupedRecords[groupKey] = {
              group: {},
              records: [],
            };
            for (const g of groups) {
              groupedRecords[groupKey].group[g.field] = record[g.field];
            }
          }
          groupedRecords[groupKey].records.push(record);
        }
      } else {
        groupedRecords['__all__'] = {
          group: {},
          records,
        };
      }

      // Calculate aggregation for each group
      const results = [];

      for (const [key, { group, records: groupRecords }] of Object.entries(groupedRecords)) {
        let value;

        switch (operation) {
          case 'Count':
            value = groupRecords.length;
            break;

          case 'Sum':
            value = groupRecords.reduce((sum, r) => sum + (Number(r[field]) || 0), 0);
            break;

          case 'Avg':
            if (groupRecords.length === 0) {
              value = null;
            } else {
              const sum = groupRecords.reduce((s, r) => s + (Number(r[field]) || 0), 0);
              value = sum / groupRecords.length;
            }
            break;

          case 'Max':
            value = groupRecords.reduce((max, r) => {
              const v = Number(r[field]);
              return v > max ? v : max;
            }, -Infinity);
            if (value === -Infinity) value = null;
            break;

          case 'Min':
            value = groupRecords.reduce((min, r) => {
              const v = Number(r[field]);
              return v < min ? v : min;
            }, Infinity);
            if (value === Infinity) value = null;
            break;

          default:
            console.warn(`Unknown aggregation operation: ${operation}`);
            value = null;
        }

        results.push({
          value,
          group,
        });
      }

      // Apply limit
      if (limit && results.length > limit) {
        return results.slice(0, limit);
      }

      return results;
    } catch (error) {
      console.error('Error aggregating records:', error.message);
      throw error;
    }
  }
}

module.exports = AirtableCollection;
