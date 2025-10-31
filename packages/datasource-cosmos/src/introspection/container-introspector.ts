import { CosmosClient } from '@azure/cosmos';

import { OverrideTypeConverter } from './builder';
import ModelCosmos, { CosmosSchema } from '../model-builder/model';
import TypeConverter, { CosmosDataType } from '../utils/type-converter';

export interface IntrospectionOptions {
  /**
   * Whether to flatten nested objects into arrow-notation fields
   * Example: { address: { city: 'NYC' } } becomes { 'address->city': 'NYC' }
   * Default: true (recommended for Forest Admin compatibility)
   */
  flattenNestedObjects?: boolean;

  /**
   * Maximum depth for nested object introspection
   * Default: 5
   */
  maxDepth?: number;

  /**
   * Whether to include array items introspection
   * Default: false (arrays are treated as Json type)
   */
  introspectArrayItems?: boolean;

  /**
   * Array fields to expose as virtual collections
   * Default: [] (no virtual collections)
   */
  virtualArrayCollections?: string[];
}

export interface ArrayCollectionMetadata {
  arrayFieldPath: string;
  schema: CosmosSchema;
}

/**
 * Check if an object is a GeoJSON Point
 */
function isGeoPointInternal(value: unknown): boolean {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const obj = value as Record<string, unknown>;

  return obj.type === 'Point' && Array.isArray(obj.coordinates) && obj.coordinates.length === 2;
}

/**
 * Recursively analyze a document to collect field types with nested object support
 */
function analyzeDocumentInternal(
  obj: unknown,
  fieldTypes: Record<string, CosmosDataType[]>,
  prefix: string,
  depth: number,
  maxDepth: number,
  flattenNestedObjects: boolean,
  introspectArrayItems: boolean,
  fieldsInDoc?: Set<string>,
): void {
  // Helper to record a field type
  const recordField = (fieldName: string, type: CosmosDataType) => {
    if (!fieldTypes[fieldName]) {
      fieldTypes[fieldName] = [];
    }

    fieldTypes[fieldName].push(type);

    if (fieldsInDoc && fieldName) {
      fieldsInDoc.add(fieldName);
    }
  };

  if (obj === null || obj === undefined) {
    if (prefix) {
      recordField(prefix, 'null');
    }

    return;
  }

  // Stop recursion if max depth reached
  if (depth >= maxDepth) {
    if (prefix) {
      recordField(prefix, 'object');
    }

    return;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    if (prefix) {
      recordField(prefix, 'array');
    }

    // Optionally introspect array items
    if (introspectArrayItems && obj.length > 0) {
      // Analyze first few items to infer array item type
      const itemsToAnalyze = obj.slice(0, Math.min(5, obj.length));

      for (const item of itemsToAnalyze) {
        if (typeof item === 'object' && item !== null) {
          analyzeDocumentInternal(
            item,
            fieldTypes,
            `${prefix}[]`,
            depth + 1,
            maxDepth,
            flattenNestedObjects,
            introspectArrayItems,
            fieldsInDoc,
          );
        }
      }
    }

    return;
  }

  // Handle objects
  if (typeof obj === 'object') {
    // Check for special types first
    if (obj instanceof Date) {
      if (prefix) {
        recordField(prefix, 'date');
      }

      return;
    }

    if (isGeoPointInternal(obj)) {
      if (prefix) {
        recordField(prefix, 'point');
      }

      return;
    }

    // Regular object - recursively analyze properties
    for (const [key, value] of Object.entries(obj)) {
      const fieldName = prefix ? `${prefix}->${key}` : key;

      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        flattenNestedObjects &&
        !(value instanceof Date) &&
        !isGeoPointInternal(value)
      ) {
        // Recursively analyze nested objects if flattening is enabled
        analyzeDocumentInternal(
          value,
          fieldTypes,
          fieldName,
          depth + 1,
          maxDepth,
          flattenNestedObjects,
          introspectArrayItems,
          fieldsInDoc,
        );
      } else {
        // For non-nested or non-flatten mode
        const inferredType = TypeConverter.inferTypeFromValue(value);

        recordField(fieldName, inferredType);
      }
    }

    return;
  }

  // Primitive values
  if (prefix) {
    const inferredType = TypeConverter.inferTypeFromValue(obj);

    recordField(prefix, inferredType);
  }
}

/**
 * Infer schema from a collection of sample documents with nested support
 */
function inferSchemaFromDocumentsInternal(
  documents: Array<Record<string, unknown>>,
  flattenNestedObjects: boolean,
  maxDepth: number,
  introspectArrayItems: boolean,
): CosmosSchema {
  if (documents.length === 0) {
    return {};
  }

  const schema: CosmosSchema = {};
  const fieldTypes: Record<string, CosmosDataType[]> = {};
  const fieldPresence: Record<string, number> = {}; // Track how many docs have each field

  // Analyze each document to collect field types
  for (const doc of documents) {
    const fieldsInDoc = new Set<string>();
    analyzeDocumentInternal(
      doc,
      fieldTypes,
      '',
      0,
      maxDepth,
      flattenNestedObjects,
      introspectArrayItems,
      fieldsInDoc,
    );

    // Track field presence
    for (const field of fieldsInDoc) {
      fieldPresence[field] = (fieldPresence[field] || 0) + 1;
    }
  }

  // Convert collected field types to schema
  for (const [fieldName, types] of Object.entries(fieldTypes)) {
    // Skip Cosmos DB system fields (start with _)
    if (!fieldName.startsWith('_') || fieldName === '_id') {
      // Skip parent fields if we have child fields (when flattening is enabled)
      if (flattenNestedObjects) {
        const childFieldPattern = `${fieldName}->`;
        const hasDirectChildFields = Object.keys(fieldTypes).some(
          otherField => otherField !== fieldName && otherField.startsWith(childFieldPattern),
        );

        const wasFlattened = types.includes('object');

        if (!(hasDirectChildFields && wasFlattened)) {
          // Get the most specific common type
          const commonType = TypeConverter.getMostSpecificType(types);
          // Field is nullable if it contains null OR is not present in all documents
          const nullable = types.includes('null') || fieldPresence[fieldName] < documents.length;

          schema[fieldName] = {
            type: commonType,
            nullable,
            indexed: true, // Assume all fields can be indexed in Cosmos DB
          };
        }
      }
    }
  }

  return schema;
}

/**
 * Introspect a Cosmos DB container to infer the schema from sample documents
 * with support for complex nested objects
 */
export default async function introspectContainer(
  cosmosClient: CosmosClient,
  collectionName: string,
  databaseName: string,
  containerName: string,
  partitionKeyPath?: string,
  sampleSize = 100,
  overrideTypeConverter?: OverrideTypeConverter,
  enableCount?: boolean,
  options: IntrospectionOptions = {},
): Promise<ModelCosmos> {
  const { flattenNestedObjects = true, maxDepth = 5, introspectArrayItems = false } = options;

  const database = cosmosClient.database(databaseName);
  const container = database.container(containerName);

  // Get container metadata to determine partition key if not provided
  let actualPartitionKeyPath = partitionKeyPath;

  if (!actualPartitionKeyPath) {
    const { resource: containerDef } = await container.read();
    actualPartitionKeyPath = containerDef.partitionKey?.paths?.[0] || '/id';
  }

  // Sample documents to infer schema
  const querySpec = {
    query: `SELECT TOP ${sampleSize} * FROM c`,
  };

  const { resources: sampleDocuments } = await container.items.query(querySpec).fetchAll();

  // Infer schema from sample documents with nested object support
  const schema = inferSchemaFromDocumentsInternal(
    sampleDocuments,
    flattenNestedObjects,
    maxDepth,
    introspectArrayItems,
  );

  return new ModelCosmos(
    cosmosClient,
    collectionName,
    databaseName,
    containerName,
    actualPartitionKeyPath,
    schema,
    overrideTypeConverter,
    enableCount,
  );
}
