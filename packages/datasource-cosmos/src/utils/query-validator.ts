import {
  ConditionTree,
  ConditionTreeBranch,
  ConditionTreeLeaf,
  Sort,
} from '@forestadmin/datasource-toolkit';

import QueryValidationError, { QueryValidationErrorCode } from './query-validation-error';

export { QueryValidationError, QueryValidationErrorCode };

export interface QueryValidatorOptions {
  /**
   * Maximum allowed nesting depth for field paths (e.g., 'a->b->c' has depth 3)
   * Default: 10
   */
  maxFieldDepth?: number;

  /**
   * Whether to validate fields against schema (requires schema to be provided)
   * Default: true when schema is provided
   */
  validateAgainstSchema?: boolean;

  /**
   * Whether to allow unknown fields not in schema
   * Default: false (strict mode)
   */
  allowUnknownFields?: boolean;

  /**
   * Maximum length for field names
   * Default: 256
   */
  maxFieldNameLength?: number;

  /**
   * Maximum number of conditions in a condition tree
   * Default: 100
   */
  maxConditions?: number;
}

// Characters that are dangerous in Cosmos DB SQL queries
// These patterns could be used for injection attacks
const DANGEROUS_PATTERNS = [
  /[;'"\\]/, // SQL injection characters
  /--/, // SQL comment
  /\/\*/, // Block comment start
  /\*\//, // Block comment end
  /\bSELECT\b/i, // SQL keyword
  /\bFROM\b/i, // SQL keyword
  /\bWHERE\b/i, // SQL keyword
  /\bDROP\b/i, // SQL keyword
  /\bDELETE\b/i, // SQL keyword
  /\bUPDATE\b/i, // SQL keyword
  /\bINSERT\b/i, // SQL keyword
  /\bEXEC\b/i, // SQL keyword
  /\bUNION\b/i, // SQL keyword
  /\0/, // Null byte
];

// Valid field name pattern: alphanumeric, underscore, and arrow notation for nesting
// Must start with a letter or underscore
const VALID_FIELD_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*(?:->?[a-zA-Z_][a-zA-Z0-9_]*)*$/;

// Special Cosmos DB system fields that are always valid
const SYSTEM_FIELDS = new Set(['id', '_ts', '_etag', '_rid', '_self', '_attachments']);

export default class QueryValidator {
  private options: Required<QueryValidatorOptions>;
  private schema: Map<string, boolean> | null = null;
  private conditionCount = 0;

  constructor(schemaFields?: string[], options: QueryValidatorOptions = {}) {
    this.options = {
      maxFieldDepth: options.maxFieldDepth ?? 10,
      validateAgainstSchema: options.validateAgainstSchema ?? schemaFields !== undefined,
      allowUnknownFields: options.allowUnknownFields ?? false,
      maxFieldNameLength: options.maxFieldNameLength ?? 256,
      maxConditions: options.maxConditions ?? 100,
    };

    if (schemaFields) {
      this.schema = new Map();

      for (const field of schemaFields) {
        this.schema.set(field, true);
        // Also add parent paths as valid for nested fields
        // e.g., for 'address->city', 'address' is also valid
        const parts = field.split('->');

        for (let i = 1; i < parts.length; i += 1) {
          const parentPath = parts.slice(0, i).join('->');
          this.schema.set(parentPath, true);
        }
      }
    }
  }

  /**
   * Validate a field name for security and correctness
   */
  public validateFieldName(field: string, context = 'field'): void {
    // Check length
    if (field.length > this.options.maxFieldNameLength) {
      throw new QueryValidationError(
        `${context} name exceeds maximum length of ${this.options.maxFieldNameLength} characters`,
        QueryValidationErrorCode.INVALID_FIELD_NAME,
        field,
      );
    }

    // Check for empty field
    if (!field || field.trim() === '') {
      throw new QueryValidationError(
        `${context} name cannot be empty`,
        QueryValidationErrorCode.INVALID_FIELD_NAME,
        field,
      );
    }

    // Check for dangerous patterns (potential injection)
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(field)) {
        throw new QueryValidationError(
          `${context} contains potentially dangerous characters or patterns`,
          QueryValidationErrorCode.POTENTIAL_INJECTION,
          field,
        );
      }
    }

    // Skip further validation for system fields
    if (SYSTEM_FIELDS.has(field)) {
      return;
    }

    // Check valid field name pattern
    if (!VALID_FIELD_NAME_PATTERN.test(field)) {
      throw new QueryValidationError(
        `${context} '${field}' contains invalid characters. ` +
          `Field names must start with a letter or underscore and contain only ` +
          `alphanumeric characters, underscores, and '->' for nesting.`,
        QueryValidationErrorCode.INVALID_FIELD_NAME,
        field,
      );
    }

    // Check nesting depth
    const depth = (field.match(/->/g) || []).length + 1;

    if (depth > this.options.maxFieldDepth) {
      throw new QueryValidationError(
        `${context} '${field}' exceeds maximum nesting depth of ${this.options.maxFieldDepth}`,
        QueryValidationErrorCode.MAX_DEPTH_EXCEEDED,
        field,
      );
    }

    // Validate against schema if enabled
    if (this.options.validateAgainstSchema && this.schema && !this.options.allowUnknownFields) {
      if (!this.schema.has(field) && !SYSTEM_FIELDS.has(field)) {
        throw new QueryValidationError(
          `${context} '${field}' is not defined in the collection schema`,
          QueryValidationErrorCode.FIELD_NOT_IN_SCHEMA,
          field,
        );
      }
    }
  }

  /**
   * Validate a complete condition tree
   */
  public validateConditionTree(conditionTree?: ConditionTree): void {
    if (!conditionTree) return;

    this.conditionCount = 0;
    this.validateConditionTreeRecursive(conditionTree);
  }

  private validateConditionTreeRecursive(conditionTree: ConditionTree): void {
    // Check condition count limit
    this.conditionCount += 1;

    if (this.conditionCount > this.options.maxConditions) {
      throw new QueryValidationError(
        `Condition tree exceeds maximum of ${this.options.maxConditions} conditions`,
        QueryValidationErrorCode.MAX_DEPTH_EXCEEDED,
      );
    }

    if ((conditionTree as ConditionTreeBranch).aggregator !== undefined) {
      const { conditions } = conditionTree as ConditionTreeBranch;

      if (conditions) {
        for (const condition of conditions) {
          this.validateConditionTreeRecursive(condition);
        }
      }

      return;
    }

    if ((conditionTree as ConditionTreeLeaf).operator !== undefined) {
      const { field, value } = conditionTree as ConditionTreeLeaf;
      this.validateFieldName(field, 'Filter field');
      this.validateValue(value, field);
    }
  }

  /**
   * Validate a value for potential injection
   */
  public validateValue(value: unknown, field?: string): void {
    if (value === null || value === undefined) {
      return;
    }

    // Check string values for injection attempts
    if (typeof value === 'string') {
      // Only check for null bytes in string values - other characters are safe
      // when used with parameterized queries
      if (value.includes('\0')) {
        throw new QueryValidationError(
          `Value for field '${field}' contains null bytes`,
          QueryValidationErrorCode.POTENTIAL_INJECTION,
          field,
        );
      }
    }

    // Recursively check array values
    if (Array.isArray(value)) {
      for (const item of value) {
        this.validateValue(item, field);
      }
    }

    // Check object values (for complex filters)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      for (const key of Object.keys(value)) {
        this.validateFieldName(key, `Object key in value for '${field}'`);
        this.validateValue((value as Record<string, unknown>)[key], `${field}.${key}`);
      }
    }
  }

  /**
   * Validate sort fields
   */
  public validateSort(sort?: Sort): void {
    if (!sort || sort.length === 0) return;

    for (const sortClause of sort) {
      this.validateFieldName(sortClause.field, 'Sort field');

      // Ensure ascending is a boolean
      if (typeof sortClause.ascending !== 'boolean') {
        throw new QueryValidationError(
          `Sort direction for '${sortClause.field}' must be a boolean`,
          QueryValidationErrorCode.INVALID_SORT_FIELD,
          sortClause.field,
        );
      }
    }
  }

  /**
   * Validate projection fields
   */
  public validateProjection(projection?: string[]): void {
    if (!projection || projection.length === 0) return;

    for (const field of projection) {
      this.validateFieldName(field, 'Projection field');
    }
  }

  /**
   * Validate all query parameters at once
   */
  public validateQuery(conditionTree?: ConditionTree, sort?: Sort, projection?: string[]): void {
    this.validateConditionTree(conditionTree);
    this.validateSort(sort);
    this.validateProjection(projection);
  }
}

/**
 * Create a validator instance for a given schema
 */
export function createQueryValidator(
  schemaFields?: string[],
  options?: QueryValidatorOptions,
): QueryValidator {
  return new QueryValidator(schemaFields, options);
}
