import { CosmosDataType } from '../utils/type-converter';

/**
 * Represents a field definition in a manual schema
 */
export interface FieldDefinition {
  /**
   * The name of the field
   */
  name: string;

  /**
   * The type of the field
   * Supported types: String, Number, Boolean, Date, Dateonly, Timeonly, Json, Point, Array, Object
   */
  type: CosmosDataType;

  /**
   * Whether the field can be null
   * Default: false
   */
  nullable?: boolean;

  /**
   * Whether the field is indexed in Cosmos DB
   * Default: true
   */
  indexed?: boolean;

  /**
   * For Array type: the type of elements in the array
   * For primitive arrays: 'string', 'number', 'boolean', etc.
   * For object arrays: 'object'
   */
  subType?: CosmosDataType;

  /**
   * For Object type or Array of objects: nested field definitions
   * This allows defining complex nested structures
   */
  fields?: FieldDefinition[];
}

/**
 * Represents a collection definition in a manual schema
 * This can be exported from separate files to enable modular collection definitions
 */
export interface CollectionDefinition {
  /**
   * The name of the collection in Forest Admin
   */
  name: string;

  /**
   * The database name in Cosmos DB
   * Optional: if not provided, will use the database name from datasource creation
   */
  databaseName?: string;

  /**
   * The container name in Cosmos DB
   */
  containerName: string;

  /**
   * The partition key path (e.g., '/userId')
   * If not provided, will be fetched from Cosmos DB at runtime
   */
  partitionKeyPath?: string;

  /**
   * Field definitions for this collection
   */
  fields: FieldDefinition[];

  /**
   * Whether to enable count operations (pagination with total count)
   * Default: true
   */
  enableCount?: boolean;
}

/**
 * Manual schema configuration
 * Allows users to define their schema explicitly instead of using introspection
 */
export interface ManualSchemaConfig {
  /**
   * Array of collection definitions
   * Collections can be defined inline or imported from separate files
   */
  collections: CollectionDefinition[];
}
