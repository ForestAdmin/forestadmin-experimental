/**
 * Constants for Airtable SDK datasource
 */

// Airtable API limits
export const BATCH_SIZE = 10; // Max records per batch operation
export const DEFAULT_PAGE_SIZE = 100; // Default page size for list operations
export const MAX_PAGE_SIZE = 100; // Airtable max page size

// Airtable Meta API URL (SDK doesn't support meta API)
export const AIRTABLE_META_URL = 'https://api.airtable.com/v0/meta';
