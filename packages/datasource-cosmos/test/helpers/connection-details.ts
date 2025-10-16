/**
 * Cosmos DB Emulator connection details
 * The emulator uses a fixed endpoint and key
 */
export const COSMOS_EMULATOR_ENDPOINT = process.env.COSMOS_ENDPOINT || 'https://localhost:8081';
export const COSMOS_EMULATOR_KEY =
  process.env.COSMOS_KEY ||
  'C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==';
export const COSMOS_TEST_DATABASE = process.env.COSMOS_DATABASE || 'test-database';
export const COSMOS_TEST_CONTAINER = process.env.COSMOS_CONTAINER || 'test-container';
