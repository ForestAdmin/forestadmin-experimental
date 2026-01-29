/**
 * Filter converter utility for converting Forest Admin filters to Airtable formula syntax
 */

import {
  ConditionTree,
  ConditionTreeBranch,
  ConditionTreeLeaf,
} from '@forestadmin/datasource-toolkit';

/**
 * Convert Forest Admin condition tree to Airtable filter formula
 */
export function buildFilterFormula(conditionTree?: ConditionTree): string | undefined {
  if (!conditionTree) {
    return undefined;
  }

  return convertConditionTree(conditionTree);
}

/**
 * Convert a condition tree node to Airtable formula
 */
function convertConditionTree(node: ConditionTree): string {
  if ('aggregator' in node) {
    return convertBranch(node as ConditionTreeBranch);
  }

  return convertLeaf(node as ConditionTreeLeaf);
}

/**
 * Convert a branch (AND/OR) to Airtable formula
 */
function convertBranch(branch: ConditionTreeBranch): string {
  const conditions = branch.conditions.map(c => convertConditionTree(c));

  if (conditions.length === 0) {
    return '';
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  const aggregator = branch.aggregator === 'And' ? 'AND' : 'OR';

  return `${aggregator}(${conditions.join(', ')})`;
}

/**
 * Convert a leaf condition to Airtable formula
 */
function convertLeaf(leaf: ConditionTreeLeaf): string {
  const { field, operator, value } = leaf;

  // Skip id field - handled separately
  if (field === 'id') {
    return '';
  }

  const escapedField = escapeFieldName(field);

  switch (operator) {
    case 'Equal':
      return formatEquality(escapedField, value);

    case 'NotEqual':
      return formatNotEquality(escapedField, value);

    case 'Present':
      return `NOT({${escapedField}} = BLANK())`;

    case 'Blank':
      return `{${escapedField}} = BLANK()`;

    case 'GreaterThan':
      return `{${escapedField}} > ${formatValue(value)}`;

    case 'GreaterThanOrEqual':
      return `{${escapedField}} >= ${formatValue(value)}`;

    case 'LessThan':
      return `{${escapedField}} < ${formatValue(value)}`;

    case 'LessThanOrEqual':
      return `{${escapedField}} <= ${formatValue(value)}`;

    case 'Contains':
      return `FIND(${formatStringValue(String(value))}, {${escapedField}}) > 0`;

    case 'NotContains':
      return `FIND(${formatStringValue(String(value))}, {${escapedField}}) = 0`;

    case 'StartsWith':
      return `LEFT({${escapedField}}, ${String(value).length}) = ${formatStringValue(String(value))}`;

    case 'EndsWith':
      return `RIGHT({${escapedField}}, ${String(value).length}) = ${formatStringValue(String(value))}`;

    case 'In':
      return formatIn(escapedField, value as unknown[]);

    case 'NotIn':
      return `NOT(${formatIn(escapedField, value as unknown[])})`;

    case 'Today':
      return `IS_SAME({${escapedField}}, TODAY(), 'day')`;

    case 'Yesterday':
      return `IS_SAME({${escapedField}}, DATEADD(TODAY(), -1, 'days'), 'day')`;

    case 'Before':
      return `IS_BEFORE({${escapedField}}, ${formatDateValue(value)})`;

    case 'After':
      return `IS_AFTER({${escapedField}}, ${formatDateValue(value)})`;

    case 'PreviousXDays': {
      const days = typeof value === 'number' ? value : parseInt(String(value), 10);

      return `AND(IS_AFTER({${escapedField}}, DATEADD(TODAY(), -${days}, 'days')), ` +
        `IS_BEFORE({${escapedField}}, DATEADD(TODAY(), 1, 'days')))`;
    }

    case 'PreviousWeek':
      return `AND(IS_AFTER({${escapedField}}, DATEADD(TODAY(), -7, 'days')), ` +
        `IS_BEFORE({${escapedField}}, TODAY()))`;

    case 'PreviousMonth':
      return `AND(IS_AFTER({${escapedField}}, DATEADD(TODAY(), -1, 'months')), ` +
        `IS_BEFORE({${escapedField}}, TODAY()))`;

    case 'PreviousQuarter':
      return `AND(IS_AFTER({${escapedField}}, DATEADD(TODAY(), -3, 'months')), ` +
        `IS_BEFORE({${escapedField}}, TODAY()))`;

    case 'PreviousYear':
      return `AND(IS_AFTER({${escapedField}}, DATEADD(TODAY(), -1, 'years')), ` +
        `IS_BEFORE({${escapedField}}, TODAY()))`;

    case 'Like':
      // Convert SQL LIKE pattern to Airtable REGEX
      return convertLikeToRegex(escapedField, String(value));

    default:
      console.warn(`Unsupported filter operator: ${operator}`);

      return '';
  }
}

/**
 * Format equality comparison
 */
function formatEquality(field: string, value: unknown): string {
  if (value === null || value === undefined) {
    return `{${field}} = BLANK()`;
  }

  return `{${field}} = ${formatValue(value)}`;
}

/**
 * Format not equality comparison
 */
function formatNotEquality(field: string, value: unknown): string {
  if (value === null || value === undefined) {
    return `NOT({${field}} = BLANK())`;
  }

  return `{${field}} != ${formatValue(value)}`;
}

/**
 * Format IN operator
 */
function formatIn(field: string, values: unknown[]): string {
  if (!values || values.length === 0) {
    return 'FALSE()';
  }

  if (values.length === 1) {
    return formatEquality(field, values[0]);
  }

  const conditions = values.map(v => `{${field}} = ${formatValue(v)}`);

  return `OR(${conditions.join(', ')})`;
}

/**
 * Format a value for Airtable formula
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'BLANK()';
  }

  if (typeof value === 'string') {
    return formatStringValue(value);
  }

  if (typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE()' : 'FALSE()';
  }

  if (value instanceof Date) {
    return formatDateValue(value);
  }

  return formatStringValue(String(value));
}

/**
 * Format a string value with proper escaping
 */
function formatStringValue(value: string): string {
  // Escape double quotes by doubling them
  const escaped = value.replace(/"/g, '\\"');

  return `"${escaped}"`;
}

/**
 * Format a date value for Airtable
 */
function formatDateValue(value: unknown): string {
  if (value instanceof Date) {
    return `DATETIME_PARSE("${value.toISOString()}")`;
  }

  if (typeof value === 'string') {
    return `DATETIME_PARSE("${value}")`;
  }

  return 'BLANK()';
}

/**
 * Escape field name for use in Airtable formula
 */
function escapeFieldName(fieldName: string): string {
  // Airtable field names in formulas are wrapped in {}
  // Special characters don't need additional escaping inside {}
  return fieldName;
}

/**
 * Convert SQL LIKE pattern to Airtable REGEX_MATCH
 */
function convertLikeToRegex(field: string, pattern: string): string {
  // Convert SQL LIKE wildcards to regex
  let regexPattern = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars first
    .replace(/%/g, '.*') // % -> .*
    .replace(/_/g, '.'); // _ -> .

  // Anchor the pattern
  regexPattern = `^${regexPattern}$`;

  return `REGEX_MATCH({${field}}, "${regexPattern}")`;
}

/**
 * Build sort configuration for Airtable
 */
export function buildSort(
  sort?: Array<{ field: string; ascending: boolean }>,
): Array<{ field: string; direction: 'asc' | 'desc' }> {
  if (!sort || sort.length === 0) {
    return [];
  }

  return sort
    .filter(s => s.field !== 'id') // Airtable doesn't support sorting by record ID
    .map(s => ({
      field: s.field,
      direction: s.ascending ? 'asc' as const : 'desc' as const,
    }));
}

/**
 * Build fields projection for Airtable
 */
export function buildFields(projection?: string[] | null): string[] | undefined {
  if (!projection || projection.length === 0) {
    return undefined;
  }

  // Filter out 'id' as it's always returned
  return projection.filter(f => f !== 'id');
}

/**
 * Extract single record ID from filter (for optimization)
 */
export function extractRecordId(filter?: { conditionTree?: ConditionTree }): string | null {
  if (!filter?.conditionTree) {
    return null;
  }

  const tree = filter.conditionTree as ConditionTreeLeaf;

  // Check if it's a simple Equal condition on 'id'
  if ('field' in tree && tree.field === 'id' && tree.operator === 'Equal') {
    return String(tree.value);
  }

  return null;
}

/**
 * Extract multiple record IDs from filter (for optimization)
 */
export function extractRecordIds(filter?: { conditionTree?: ConditionTree }): string[] | null {
  if (!filter?.conditionTree) {
    return null;
  }

  const tree = filter.conditionTree as ConditionTreeLeaf;

  // Check if it's an In condition on 'id'
  if ('field' in tree && tree.field === 'id' && tree.operator === 'In') {
    const values = tree.value as unknown[];

    return values.map(v => String(v));
  }

  return null;
}
