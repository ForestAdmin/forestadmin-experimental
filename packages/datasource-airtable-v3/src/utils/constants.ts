/**
 * Constants for the Airtable DataSource
 */

/**
 * Airtable Meta API base URL
 */
export const AIRTABLE_META_URL = 'https://api.airtable.com/v0/meta';

/**
 * Airtable Data API base URL
 */
export const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

/**
 * Maximum records per batch for create/update/delete operations
 * Airtable limits batch operations to 10 records
 */
export const BATCH_SIZE = 10;

/**
 * Default page size for list operations
 */
export const DEFAULT_PAGE_SIZE = 100;

/**
 * Maximum page size allowed by Airtable
 */
export const MAX_PAGE_SIZE = 100;

/**
 * Default retry options
 */
export const DEFAULT_RETRY_OPTIONS = {
  maxRetries: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  TOO_MANY_REQUESTS: 429,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
};
