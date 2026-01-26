/**
 * Filter builder for converting Forest Admin filters to Airtable formula syntax
 * Airtable uses a formula-based filtering system
 */

/**
 * Escape a string value for use in Airtable formula
 * @param {string} value - The value to escape
 * @returns {string} Escaped value
 */
export function escapeFormulaString(value) {
  if (typeof value !== 'string') {
    return String(value);
  }

  // Escape double quotes and backslashes
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Format a value for Airtable formula based on type
 * @param {any} value - The value to format
 * @returns {string} Formatted value for formula
 */
export function formatValue(value) {
  if (value === null || value === undefined) {
    return 'BLANK()';
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE()' : 'FALSE()';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (value instanceof Date) {
    return `"${value.toISOString()}"`;
  }

  // String value
  return `"${escapeFormulaString(value)}"`;
}

/**
 * Build a single condition formula
 * @param {string} field - Field name
 * @param {string} operator - Forest Admin operator
 * @param {any} value - Filter value
 * @returns {string} Airtable formula condition
 */
export function buildCondition(field, operator, value) {
  const fieldRef = `{${field}}`;

  switch (operator) {
    case 'Equal':
      if (value === null || value === undefined) {
        return `${fieldRef} = BLANK()`;
      }

      return `${fieldRef} = ${formatValue(value)}`;

    case 'NotEqual':
      if (value === null || value === undefined) {
        return `${fieldRef} != BLANK()`;
      }

      return `${fieldRef} != ${formatValue(value)}`;

    case 'GreaterThan':
      return `${fieldRef} > ${formatValue(value)}`;

    case 'LessThan':
      return `${fieldRef} < ${formatValue(value)}`;

    case 'GreaterThanOrEqual':
      return `${fieldRef} >= ${formatValue(value)}`;

    case 'LessThanOrEqual':
      return `${fieldRef} <= ${formatValue(value)}`;

    case 'Contains':
      return `FIND("${escapeFormulaString(value)}", ${fieldRef}) > 0`;

    case 'NotContains':
      return `FIND("${escapeFormulaString(value)}", ${fieldRef}) = 0`;

    case 'StartsWith':
      return `LEFT(${fieldRef}, ${String(value).length}) = "${escapeFormulaString(value)}"`;

    case 'EndsWith':
      return `RIGHT(${fieldRef}, ${String(value).length}) = "${escapeFormulaString(value)}"`;

    case 'Present':
      return `${fieldRef} != BLANK()`;

    case 'Blank':
      return `${fieldRef} = BLANK()`;

    case 'Before':
      return `IS_BEFORE(${fieldRef}, ${formatValue(value)})`;

    case 'After':
      return `IS_AFTER(${fieldRef}, ${formatValue(value)})`;

    case 'In':
      if (Array.isArray(value) && value.length > 0) {
        const conditions = value.map(v => `${fieldRef} = ${formatValue(v)}`);

        return `OR(${conditions.join(', ')})`;
      }

      return 'FALSE()';

    case 'NotIn':
      if (Array.isArray(value) && value.length > 0) {
        const conditions = value.map(v => `${fieldRef} != ${formatValue(v)}`);

        return `AND(${conditions.join(', ')})`;
      }

      return 'TRUE()';

    default:
      return `${fieldRef} = ${formatValue(value)}`;
  }
}

/**
 * Build Airtable formula from Forest Admin condition tree
 * @param {object} conditionTree - Forest Admin condition tree
 * @returns {string|null} Airtable filterByFormula string or null
 */
export function buildFilterFormula(conditionTree) {
  if (!conditionTree) {
    return null;
  }

  // Leaf node (single condition)
  if (conditionTree.field) {
    // Skip 'id' field as Airtable doesn't support filtering by record ID in formula
    if (conditionTree.field === 'id') {
      return null;
    }

    return buildCondition(conditionTree.field, conditionTree.operator, conditionTree.value);
  }

  // Branch node (AND/OR)
  if (conditionTree.aggregator && conditionTree.conditions) {
    const validConditions = conditionTree.conditions.map(buildFilterFormula).filter(Boolean);

    if (validConditions.length === 0) {
      return null;
    }

    if (validConditions.length === 1) {
      return validConditions[0];
    }

    const aggregator = conditionTree.aggregator.toUpperCase();

    return `${aggregator}(${validConditions.join(', ')})`;
  }

  return null;
}

/**
 * Build sort configuration for Airtable SDK
 * @param {Array} sortClauses - Forest Admin sort clauses
 * @returns {Array} Airtable sort configuration
 */
export function buildSort(sortClauses) {
  if (!sortClauses || sortClauses.length === 0) {
    return [];
  }

  return sortClauses
    .filter(clause => clause.field !== 'id') // Cannot sort by record ID
    .map(clause => ({
      field: clause.field,
      direction: clause.ascending ? 'asc' : 'desc',
    }));
}

/**
 * Build fields array for projection
 * @param {Array} projection - Forest Admin projection
 * @returns {Array|null} Airtable fields array or null for all fields
 */
export function buildFields(projection) {
  if (!projection || projection.length === 0) {
    return null;
  }

  // Filter out 'id' as it's always returned by Airtable
  return projection.filter(field => field !== 'id');
}

/**
 * Extract record ID from filter if it's a simple ID equality filter
 * @param {object} filter - Forest Admin filter
 * @returns {string|null} Record ID or null
 */
export function extractRecordId(filter) {
  const conditionTree = filter?.conditionTree;

  if (
    conditionTree &&
    conditionTree.field === 'id' &&
    conditionTree.operator === 'Equal' &&
    conditionTree.value
  ) {
    return conditionTree.value;
  }

  return null;
}

/**
 * Extract multiple record IDs from filter if it's an ID In filter
 * @param {object} filter - Forest Admin filter
 * @returns {Array|null} Record IDs or null
 */
export function extractRecordIds(filter) {
  const conditionTree = filter?.conditionTree;

  if (
    conditionTree &&
    conditionTree.field === 'id' &&
    conditionTree.operator === 'In' &&
    Array.isArray(conditionTree.value)
  ) {
    return conditionTree.value;
  }

  return null;
}
