/**
 * Filter Builder Module
 *
 * Converts Forest Admin filter conditions to Airtable filterByFormula
 */

/**
 * Checks if the filter is querying a single record by ID
 *
 * @param {Object} filter - Forest Admin filter condition
 * @returns {string|null} Record ID or null
 */
function extractSingleRecordId(filter) {
  if (!filter?.conditionTree) return null;

  const condition = filter.conditionTree;

  if (
    condition.field === 'id' &&
    condition.operator === 'Equal' &&
    condition.value
  ) {
    return condition.value;
  }
  return null;
}

/**
 * Converts Forest Admin filter conditions to Airtable filterByFormula
 *
 * @param {Object} filter - Forest Admin filter condition
 * @returns {string|null} Airtable filterByFormula string
 */
function buildFilterFormula(filter) {
  if (!filter || !filter.conditionTree) {
    return null;
  }

  const buildCondition = (condition) => {
    // Handle aggregate conditions (AND/OR)
    if (condition.aggregator) {
      const subConditions = condition.conditions.map(buildCondition).filter(Boolean);
      if (subConditions.length === 0) return null;
      const operator = condition.aggregator === 'And' ? 'AND' : 'OR';
      return `${operator}(${subConditions.join(', ')})`;
    }

    const { field, operator, value } = condition;

    // Skip id field - Airtable doesn't support filtering by record ID
    if (field === 'id') {
      return null;
    }

    const escapedValue = String(value).replace(/"/g, '\\"');

    switch (operator) {
      case 'Equal':
        return `{${field}} = "${escapedValue}"`;
      case 'NotEqual':
        return `{${field}} != "${escapedValue}"`;
      case 'GreaterThan':
        return `{${field}} > ${value}`;
      case 'LessThan':
        return `{${field}} < ${value}`;
      case 'GreaterThanOrEqual':
        return `{${field}} >= ${value}`;
      case 'LessThanOrEqual':
        return `{${field}} <= ${value}`;
      case 'Contains':
        return `FIND("${escapedValue}", {${field}}) > 0`;
      case 'StartsWith':
        return `LEFT({${field}}, ${value.length}) = "${escapedValue}"`;
      case 'EndsWith':
        return `RIGHT({${field}}, ${value.length}) = "${escapedValue}"`;
      default:
        return null;
    }
  };

  return buildCondition(filter.conditionTree);
}

/**
 * Builds sort parameters for Airtable API
 *
 * @param {Array} sort - Forest Admin sort configuration
 * @returns {Array|null} Airtable sort parameters
 */
function buildSortParams(sort) {
  if (!sort || sort.length === 0) return null;

  // Filter out id field - Airtable doesn't support sorting by record ID
  const validSorts = sort.filter(s => s.field !== 'id');
  if (validSorts.length === 0) return null;

  return validSorts.map((s) => ({
    field: s.field,
    direction: s.ascending ? 'asc' : 'desc',
  }));
}

/**
 * Builds field projection parameters for Airtable API
 *
 * @param {Array} projection - List of fields to return
 * @returns {Array|null} Airtable fields parameter
 */
function buildFieldsParams(projection) {
  if (!projection || projection.length === 0) return null;

  // Filter out id field - Airtable returns it automatically
  const airtableFields = projection.filter(f => f !== 'id');
  return airtableFields.length > 0 ? airtableFields : null;
}

module.exports = {
  extractSingleRecordId,
  buildFilterFormula,
  buildSortParams,
  buildFieldsParams,
};
