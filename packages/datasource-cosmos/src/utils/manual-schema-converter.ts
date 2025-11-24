import type { CosmosDataType } from './type-converter';

import { CosmosClient } from '@azure/cosmos';
import { Logger } from '@forestadmin/datasource-toolkit';

import ModelCosmos, { CosmosSchema } from '../model-builder/model';
import { FieldDefinition, ManualSchemaConfig } from '../types/manual-schema';

/**
 * Validates a manual schema configuration
 * @param schema The manual schema to validate
 * @param defaultDatabaseName Optional default database name for collections without one
 * @throws Error if the schema is invalid
 */
export function validateManualSchema(
  schema: ManualSchemaConfig,
  defaultDatabaseName?: string,
): void {
  if (!schema || !schema.collections) {
    throw new Error('Manual schema must have a collections array');
  }

  if (!Array.isArray(schema.collections)) {
    throw new Error('Manual schema collections must be an array');
  }

  if (schema.collections.length === 0) {
    throw new Error('Manual schema must have at least one collection');
  }

  const collectionNames = new Set<string>();

  for (const collection of schema.collections) {
    // Validate collection structure
    if (!collection.name) {
      throw new Error('Collection must have a name');
    }

    if (!collection.databaseName && !defaultDatabaseName) {
      throw new Error(
        `Collection '${collection.name}' must have a databaseName, or provide a default ` +
          `database name when calling convertManualSchemaToModels`,
      );
    }

    if (!collection.containerName) {
      throw new Error(`Collection '${collection.name}' must have a containerName`);
    }

    // Check for duplicate collection names
    if (collectionNames.has(collection.name)) {
      throw new Error(`Duplicate collection name: '${collection.name}'`);
    }

    collectionNames.add(collection.name);

    // Validate fields
    if (!collection.fields || !Array.isArray(collection.fields)) {
      throw new Error(`Collection '${collection.name}' must have a fields array`);
    }

    if (collection.fields.length === 0) {
      throw new Error(`Collection '${collection.name}' must have at least one field`);
    }

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    validateFields(collection.fields, collection.name);
  }
}

/**
 * Validates field definitions
 * @param fields The fields to validate
 * @param collectionName The name of the parent collection (for error messages)
 * @param path The current path (for nested fields)
 */
function validateFields(fields: FieldDefinition[], collectionName: string, path = ''): void {
  const fieldNames = new Set<string>();

  for (const field of fields) {
    const fullPath = path ? `${path}.${field.name}` : field.name;

    if (!field.name) {
      throw new Error(`Field in collection '${collectionName}' at path '${path}' must have a name`);
    }

    if (!field.type) {
      throw new Error(`Field '${fullPath}' in collection '${collectionName}' must have a type`);
    }

    // Check for duplicate field names at this level
    if (fieldNames.has(field.name)) {
      throw new Error(`Duplicate field name: '${fullPath}' in collection '${collectionName}'`);
    }

    fieldNames.add(field.name);

    // Validate type
    const validTypes: CosmosDataType[] = [
      'string',
      'number',
      'boolean',
      'date',
      'dateonly',
      'timeonly',
      'array',
      'object',
      'null',
      'point',
      'binary',
    ];

    if (!validTypes.includes(field.type)) {
      throw new Error(
        `Field '${fullPath}' in collection '${collectionName}' has invalid type '${field.type}'. ` +
          `Valid types: ${validTypes.join(', ')}`,
      );
    }

    // Validate array fields
    if (field.type === 'array') {
      if (!field.subType) {
        throw new Error(
          `Array field '${fullPath}' in collection '${collectionName}' must have a subType`,
        );
      }

      if (field.subType === 'object' && (!field.fields || field.fields.length === 0)) {
        throw new Error(
          `Array field '${fullPath}' in collection '${collectionName}' with subType ` +
            `'object' must have nested field definitions`,
        );
      }

      // Recursively validate nested fields for object arrays
      if (field.subType === 'object' && field.fields) {
        validateFields(field.fields, collectionName, fullPath);
      }
    }

    // Validate object fields
    if (field.type === 'object') {
      if (!field.fields || field.fields.length === 0) {
        throw new Error(
          `Object field '${fullPath}' in collection '${collectionName}' ` +
            `must have nested field definitions`,
        );
      }

      // Recursively validate nested fields
      validateFields(field.fields, collectionName, fullPath);
    }

    // Ensure subType is only used with arrays
    if (field.subType && field.type !== 'array') {
      throw new Error(
        `Field '${fullPath}' in collection '${collectionName}' has subType but is not an array`,
      );
    }

    // Ensure fields is only used with objects or arrays of objects
    if (
      field.fields &&
      field.type !== 'object' &&
      !(field.type === 'array' && field.subType === 'object')
    ) {
      throw new Error(
        `Field '${fullPath}' in collection '${collectionName}' has nested fields ` +
          `but is not an object or array of objects`,
      );
    }
  }
}

/**
 * Converts manual schema definitions to Cosmos schema format
 * This flattens nested objects using arrow notation (->) to match the introspection format
 * @param fields The field definitions
 * @param prefix The prefix for nested fields
 * @returns The flattened Cosmos schema
 */
function convertFieldsToCosmosSchema(fields: FieldDefinition[], prefix = ''): CosmosSchema {
  const schema: CosmosSchema = {};

  for (const field of fields) {
    const fieldName = prefix ? `${prefix}->${field.name}` : field.name;

    if (field.type === 'object' && field.fields) {
      // For object fields, create BOTH the parent object field AND the flattened nested fields
      // This matches introspection behavior
      schema[fieldName] = {
        type: 'object',
        nullable: field.nullable ?? false,
        indexed: field.indexed ?? true,
      };
      const nestedSchema = convertFieldsToCosmosSchema(field.fields, fieldName);
      Object.assign(schema, nestedSchema);
    } else if (field.type === 'array' && field.subType === 'object' && field.fields) {
      // For arrays of objects, we still add the array field itself
      // but also flatten the nested structure for potential virtual collections
      schema[fieldName] = {
        type: field.type,
        nullable: field.nullable ?? false,
        indexed: field.indexed ?? true,
      };

      // Also add flattened nested fields for array items
      // This allows virtual array collections to work properly
      const nestedSchema = convertFieldsToCosmosSchema(field.fields, fieldName);
      Object.assign(schema, nestedSchema);
    } else {
      // Regular field (string, number, boolean, date, array of primitives, etc.)
      schema[fieldName] = {
        type: field.type,
        nullable: field.nullable ?? false,
        indexed: field.indexed ?? true,
      };
    }
  }

  return schema;
}

/**
 * Converts manual schema configuration to ModelCosmos instances
 * @param client The Cosmos DB client
 * @param schema The manual schema configuration
 * @param logger Optional logger
 * @param defaultDatabaseName Optional default database name for collections without one
 * @returns Array of ModelCosmos instances
 */
export async function convertManualSchemaToModels(
  client: CosmosClient,
  schema: ManualSchemaConfig,
  logger?: Logger,
  defaultDatabaseName?: string,
): Promise<ModelCosmos[]> {
  validateManualSchema(schema, defaultDatabaseName);

  const models: ModelCosmos[] = [];

  for (const collection of schema.collections) {
    logger?.('Info', `Creating collection '${collection.name}' from manual schema definition`);

    // Use collection's database name if provided, otherwise use the default
    const databaseName = collection.databaseName || defaultDatabaseName!;

    // Convert field definitions to Cosmos schema format
    const cosmosSchema = convertFieldsToCosmosSchema(collection.fields);

    // Fetch partition key path if not provided
    let { partitionKeyPath } = collection;

    if (!partitionKeyPath) {
      try {
        const container = client.database(databaseName).container(collection.containerName);

        // eslint-disable-next-line no-await-in-loop
        const containerDef = await container.read();
        const paths = containerDef.resource?.partitionKey?.paths;
        partitionKeyPath = paths ? paths[0] : undefined;

        if (!partitionKeyPath) {
          logger?.(
            'Warn',
            `Could not determine partition key path for collection ` +
              `'${collection.name}'. Using default '/id'`,
          );
          partitionKeyPath = '/id';
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger?.(
          'Warn',
          `Failed to fetch partition key path for collection '${collection.name}': ` +
            `${errorMessage}. Using default '/id'`,
        );
        partitionKeyPath = '/id';
      }
    }

    // Create ModelCosmos instance
    const model = new ModelCosmos(
      client,
      collection.name,
      databaseName,
      collection.containerName,
      partitionKeyPath,
      cosmosSchema,
      undefined, // overrideTypeConverter
      collection.enableCount ?? true,
    );

    models.push(model);

    const fieldCount = Object.keys(cosmosSchema).length;
    logger?.(
      'Info',
      `Successfully created collection '${collection.name}' with ${fieldCount} fields`,
    );
  }

  return models;
}
