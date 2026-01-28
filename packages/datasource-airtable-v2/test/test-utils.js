/**
 * Test utilities and helpers for datasource-airtable-v2 tests
 */

/**
 * Create a mock Forest Admin caller context
 * @param {object} overrides - Properties to override
 * @returns {object} Mock caller object
 */
function createMockCaller(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    team: 'Test Team',
    renderingId: 1,
    tags: {},
    timezone: 'UTC',
    ...overrides,
  };
}

/**
 * Create a mock Forest Admin filter
 * @param {object} options - Filter options
 * @returns {object} Mock filter object
 */
function createMockFilter(options = {}) {
  const filter = {};

  if (options.conditionTree) {
    filter.conditionTree = options.conditionTree;
  }

  if (options.sort) {
    filter.sort = options.sort;
  }

  if (options.page) {
    filter.page = options.page;
  }

  return filter;
}

/**
 * Create a simple condition for filtering
 * @param {string} field - Field name
 * @param {string} operator - Operator
 * @param {any} value - Value
 * @returns {object} Condition object
 */
function createCondition(field, operator, value) {
  return { field, operator, value };
}

/**
 * Create an AND condition tree
 * @param {Array} conditions - Array of conditions
 * @returns {object} Condition tree
 */
function createAndCondition(conditions) {
  return {
    aggregator: 'and',
    conditions,
  };
}

/**
 * Create an OR condition tree
 * @param {Array} conditions - Array of conditions
 * @returns {object} Condition tree
 */
function createOrCondition(conditions) {
  return {
    aggregator: 'or',
    conditions,
  };
}

/**
 * Create mock Airtable field definitions
 * @param {Array} fieldConfigs - Array of {name, type} objects
 * @returns {Array} Airtable field definitions
 */
function createMockFields(fieldConfigs) {
  return fieldConfigs.map((config, i) => ({
    id: `fld${i}`,
    name: config.name,
    type: config.type,
    ...config,
  }));
}

/**
 * Create a mock Airtable record
 * @param {string} id - Record ID
 * @param {object} fields - Record fields
 * @returns {object} Mock record
 */
function createMockRecord(id, fields) {
  return {
    id,
    fields,
    _table: { name: 'TestTable' },
  };
}

/**
 * Create mock Airtable base info
 * @param {string} id - Base ID
 * @param {string} name - Base name
 * @returns {object} Mock base info
 */
function createMockBaseInfo(id, name) {
  return {
    id,
    name,
    permissionLevel: 'create',
    workspaceId: 'wspTest',
  };
}

/**
 * Create mock Airtable table schema
 * @param {string} id - Table ID
 * @param {string} name - Table name
 * @param {Array} fields - Field definitions
 * @returns {object} Mock table schema
 */
function createMockTableSchema(id, name, fields) {
  return {
    id,
    name,
    fields,
    primaryFieldId: fields[0]?.id || 'fld0',
  };
}

/**
 * Wait for a specified number of milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Resolves after delay
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Suppress console output during a function execution
 * @param {Function} fn - Function to execute
 * @returns {Promise} Result of function
 */
async function suppressConsole(fn) {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();

  try {
    return await fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }
}

/**
 * Capture console output during a function execution
 * @param {Function} fn - Function to execute
 * @returns {Promise<{result: any, logs: string[], errors: string[], warns: string[]}>}
 */
async function captureConsole(fn) {
  const logs = [];
  const errors = [];
  const warns = [];

  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errors.push(args.join(' '));
  console.warn = (...args) => warns.push(args.join(' '));

  let result;

  try {
    result = await fn();
  } finally {
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;
  }

  return { result, logs, errors, warns };
}

module.exports = {
  createMockCaller,
  createMockFilter,
  createCondition,
  createAndCondition,
  createOrCondition,
  createMockFields,
  createMockRecord,
  createMockBaseInfo,
  createMockTableSchema,
  delay,
  suppressConsole,
  captureConsole,
};
