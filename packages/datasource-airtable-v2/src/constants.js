/**
 * Constants for Airtable SDK datasource
 */

// Airtable API limits
const BATCH_SIZE = 10; // Max records per batch operation
const DEFAULT_PAGE_SIZE = 100; // Default page size for list operations
const MAX_PAGE_SIZE = 100; // Airtable max page size

// Airtable Meta API URL (SDK doesn't support meta API)
const AIRTABLE_META_URL = 'https://api.airtable.com/v0/meta';

module.exports = {
  BATCH_SIZE,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  AIRTABLE_META_URL
};
