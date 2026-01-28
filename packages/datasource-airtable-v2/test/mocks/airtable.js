/**
 * Mock for the Airtable SDK
 * Provides a full mock implementation for testing
 */

// Store for mock data - can be configured per test
let mockBases = new Map();
let mockRecords = new Map();
let mockErrors = new Map();

/**
 * Reset all mock state
 */
function resetMocks() {
  mockBases.clear();
  mockRecords.clear();
  mockErrors.clear();
}

/**
 * Configure mock base with tables and records
 * @param {string} baseId - Base ID
 * @param {object} config - Configuration object
 */
function configureMockBase(baseId, config = {}) {
  mockBases.set(baseId, config);
}

/**
 * Set mock records for a table
 * @param {string} baseId - Base ID
 * @param {string} tableId - Table ID
 * @param {Array} records - Array of records
 */
function setMockRecords(baseId, tableId, records) {
  const key = `${baseId}:${tableId}`;
  mockRecords.set(key, records.map((r, i) => ({
    id: r.id || `rec${i}`,
    fields: r.fields || r,
    ...r,
  })));
}

/**
 * Set a mock error for a specific operation
 * @param {string} operation - Operation name (find, create, update, destroy, select)
 * @param {Error} error - Error to throw
 */
function setMockError(operation, error) {
  mockErrors.set(operation, error);
}

/**
 * Mock table instance
 */
class MockTable {
  constructor(baseId, tableId) {
    this.baseId = baseId;
    this.tableId = tableId;
  }

  _getRecords() {
    const key = `${this.baseId}:${this.tableId}`;

    return mockRecords.get(key) || [];
  }

  _setRecords(records) {
    const key = `${this.baseId}:${this.tableId}`;
    mockRecords.set(key, records);
  }

  async find(recordId) {
    if (mockErrors.has('find')) {
      throw mockErrors.get('find');
    }

    const records = this._getRecords();
    const record = records.find(r => r.id === recordId);

    if (!record) {
      const error = new Error('Record not found');
      error.statusCode = 404;
      throw error;
    }

    return record;
  }

  async create(recordsOrFields) {
    if (mockErrors.has('create')) {
      throw mockErrors.get('create');
    }

    const records = this._getRecords();
    const input = Array.isArray(recordsOrFields) ? recordsOrFields : [recordsOrFields];

    const created = input.map((item, i) => ({
      id: `recNew${records.length + i}`,
      fields: item.fields || item,
    }));

    this._setRecords([...records, ...created]);

    return created;
  }

  async update(recordsOrId, fieldsOrUndefined) {
    if (mockErrors.has('update')) {
      throw mockErrors.get('update');
    }

    const records = this._getRecords();

    // Handle both array and single record update
    const updates = Array.isArray(recordsOrId)
      ? recordsOrId
      : [{ id: recordsOrId, fields: fieldsOrUndefined }];

    const updatedRecords = records.map(record => {
      const update = updates.find(u => u.id === record.id);

      if (update) {
        return {
          ...record,
          fields: { ...record.fields, ...update.fields },
        };
      }

      return record;
    });

    this._setRecords(updatedRecords);

    return updates.map(u => updatedRecords.find(r => r.id === u.id));
  }

  async destroy(recordIds) {
    if (mockErrors.has('destroy')) {
      throw mockErrors.get('destroy');
    }

    const records = this._getRecords();
    const ids = Array.isArray(recordIds) ? recordIds : [recordIds];

    const remaining = records.filter(r => !ids.includes(r.id));
    this._setRecords(remaining);

    return ids.map(id => ({ id, deleted: true }));
  }

  select(options = {}) {
    return {
      options,
      all: async () => {
        if (mockErrors.has('select')) {
          throw mockErrors.get('select');
        }

        let records = this._getRecords();

        // Apply filterByFormula (basic simulation)
        if (options.filterByFormula) {
          // For testing, we'll just return all records
          // Real filtering would need formula parsing
        }

        // Apply sort
        if (options.sort && options.sort.length > 0) {
          records = [...records].sort((a, b) => {
            for (const clause of options.sort) {
              const aVal = a.fields[clause.field];
              const bVal = b.fields[clause.field];

              if (aVal < bVal) return clause.direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return clause.direction === 'asc' ? 1 : -1;
            }

            return 0;
          });
        }

        return records;
      },
      eachPage: async callback => {
        if (mockErrors.has('select')) {
          throw mockErrors.get('select');
        }

        const records = this._getRecords();
        const pageSize = options.pageSize || 100;

        for (let i = 0; i < records.length; i += pageSize) {
          const page = records.slice(i, i + pageSize);
          await callback(page, () => {});
        }
      },
    };
  }
}

/**
 * Mock base instance
 */
class MockBase {
  constructor(baseId) {
    this.baseId = baseId;
    this._tables = new Map();
  }

  // Called as base(tableId) to get table instance
  call(tableId) {
    if (!this._tables.has(tableId)) {
      this._tables.set(tableId, new MockTable(this.baseId, tableId));
    }

    return this._tables.get(tableId);
  }
}

// Make MockBase callable
function createMockBase(baseId) {
  const instance = new MockBase(baseId);

  // Return a function that acts as the base
  const baseFunction = tableId => instance.call(tableId);
  baseFunction.baseId = baseId;

  return baseFunction;
}

/**
 * Mock Airtable SDK
 */
const mockAirtable = {
  configure: jest.fn(),
  base: jest.fn(baseId => createMockBase(baseId)),
};

module.exports = mockAirtable;
module.exports.resetMocks = resetMocks;
module.exports.configureMockBase = configureMockBase;
module.exports.setMockRecords = setMockRecords;
module.exports.setMockError = setMockError;
module.exports.MockTable = MockTable;
module.exports.MockBase = MockBase;
