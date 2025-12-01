/**
 * Error codes for query validation failures
 */
export enum QueryValidationErrorCode {
  INVALID_FIELD_NAME = 'INVALID_FIELD_NAME',
  FIELD_NOT_IN_SCHEMA = 'FIELD_NOT_IN_SCHEMA',
  INVALID_VALUE_TYPE = 'INVALID_VALUE_TYPE',
  POTENTIAL_INJECTION = 'POTENTIAL_INJECTION',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
  INVALID_SORT_FIELD = 'INVALID_SORT_FIELD',
  INVALID_PROJECTION_FIELD = 'INVALID_PROJECTION_FIELD',
}

/**
 * Security and validation errors for query operations
 */
export default class QueryValidationError extends Error {
  constructor(
    message: string,
    public readonly code: QueryValidationErrorCode,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'QueryValidationError';
  }
}
