/**
 * Airtable API Constants
 */

/** Airtable Data API base URL */
const AIRTABLE_API_URL = 'https://api.airtable.com/v0';

/** Airtable Metadata API base URL */
const AIRTABLE_META_URL = 'https://api.airtable.com/v0/meta';

/** Maximum records per batch operation */
const BATCH_SIZE = 10;

/** Default page size for list queries */
const DEFAULT_PAGE_SIZE = 100;

module.exports = {
  AIRTABLE_API_URL,
  AIRTABLE_META_URL,
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
};
