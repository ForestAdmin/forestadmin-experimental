import { ValidationError } from '@forestadmin/datasource-toolkit';

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
 * Security and validation errors for query operations.
 * Extends ValidationError so the agent returns 400 (Bad Request) instead of 500.
 */
export default class QueryValidationError extends ValidationError {
  constructor(
    message: string,
    public readonly code: QueryValidationErrorCode,
    public readonly field?: string,
  ) {
    super(message, undefined, 'QueryValidationError');
  }
}
