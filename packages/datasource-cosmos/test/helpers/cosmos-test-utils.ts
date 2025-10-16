/* eslint-disable no-await-in-loop, no-underscore-dangle, @typescript-eslint/no-explicit-any */
import { Container, CosmosClient, Database } from '@azure/cosmos';

import {
  COSMOS_EMULATOR_ENDPOINT,
  COSMOS_EMULATOR_KEY,
  COSMOS_TEST_CONTAINER,
  COSMOS_TEST_DATABASE,
} from './connection-details';

/**
 * Create a test Cosmos DB client
 */
export function createTestCosmosClient(): CosmosClient {
  return new CosmosClient({
    endpoint: COSMOS_EMULATOR_ENDPOINT,
    key: COSMOS_EMULATOR_KEY,
    connectionPolicy: {
      requestTimeout: 30000,
    },
  });
}

/**
 * Setup a test database and container
 */
export async function setupTestDatabase(
  client: CosmosClient,
  databaseName: string = COSMOS_TEST_DATABASE,
  containerName: string = COSMOS_TEST_CONTAINER,
  partitionKey = '/id',
): Promise<{ database: Database; container: Container }> {
  // Create database if it doesn't exist
  const { database } = await client.databases.createIfNotExists({
    id: databaseName,
  });

  // Create container if it doesn't exist
  const { container } = await database.containers.createIfNotExists({
    id: containerName,
    partitionKey: {
      paths: [partitionKey],
    },
  });

  return { database, container };
}

/**
 * Clean up test database
 */
export async function cleanupTestDatabase(
  client: CosmosClient,
  databaseName: string = COSMOS_TEST_DATABASE,
): Promise<void> {
  try {
    await client.database(databaseName).delete();
  } catch (error) {
    // Ignore errors if database doesn't exist
    if (error.code !== 404) {
      throw error;
    }
  }
}

/**
 * Seed test data into a container
 */
export async function seedTestData(container: Container, data: any[]): Promise<void> {
  for (const item of data) {
    await container.items.create(item);
  }
}

/**
 * Clear all items from a container
 */
export async function clearContainer(container: Container): Promise<void> {
  const { resources } = await container.items
    .query('SELECT c.id, c._partitionKey FROM c')
    .fetchAll();

  for (const item of resources) {
    await container.item(item.id, item._partitionKey).delete();
  }
}
