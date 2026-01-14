import type {
  GraphqlDataSourceOptions,
  GraphqlField,
  GraphqlIntrospectionResponse,
  GraphqlType,
  GraphqlTypeRef,
  HasuraMetadata,
  IntrospectedColumn,
  IntrospectedRelationship,
  IntrospectedSchema,
  IntrospectedTable,
} from '../types';

import { GraphQLClient } from 'graphql-request';

/**
 * Relationship mapping from Hasura metadata
 * Key: "tableName.relationName", Value: { localColumn: remoteColumn }
 */
type RelationshipMappings = Map<string, Record<string, string>>;

const INTROSPECTION_QUERY = `
  query IntrospectSchema {
    __schema {
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                  ofType {
                    name
                    kind
                  }
                }
              }
            }
          }
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
        inputFields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
            }
          }
        }
        enumValues {
          name
        }
      }
      queryType {
        name
        fields {
          name
          type {
            name
            kind
            ofType {
              name
              kind
              ofType {
                name
                kind
                ofType {
                  name
                  kind
                }
              }
            }
          }
          args {
            name
            type {
              name
              kind
              ofType {
                name
                kind
              }
            }
          }
        }
      }
      mutationType {
        name
        fields {
          name
        }
      }
    }
  }
`;

/** Known scalar types in Hasura/PostgreSQL */
const SCALAR_TYPES = new Set([
  // GraphQL built-in
  'Int',
  'Float',
  'String',
  'Boolean',
  'ID',
  // PostgreSQL common types
  'uuid',
  'timestamptz',
  'timestamp',
  'date',
  'time',
  'timetz',
  'jsonb',
  'json',
  'numeric',
  'bigint',
  'smallint',
  'integer',
  'real',
  'double_precision',
  'text',
  'varchar',
  'char',
  'bpchar',
  'bytea',
  'inet',
  'cidr',
  'macaddr',
  'money',
  'interval',
  'point',
  'line',
  'lseg',
  'box',
  'path',
  'polygon',
  'circle',
  'bit',
  'bit_varying',
  'xml',
  // Hasura custom
  '_text',
  '_int4',
  '_uuid',
  '_jsonb',
]);

/** System tables to exclude */
const EXCLUDED_PREFIXES = ['__', 'hdb_', 'pg_', 'information_schema'];

/**
 * Fetch Hasura metadata from the metadata API
 */
async function fetchHasuraMetadata(
  options: GraphqlDataSourceOptions,
): Promise<HasuraMetadata | null> {
  // Derive metadata URI from GraphQL URI if not provided
  const metadataUri = options.metadataUri || options.uri.replace('/v1/graphql', '/v1/metadata');

  try {
    const response = await fetch(metadataUri, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: JSON.stringify({
        type: 'export_metadata',
        version: 2,
        args: {},
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    // Handle both direct response and wrapped response (version 2 API returns { metadata: ... })
    const metadata = data.metadata || data;

    if (!metadata.sources) {
      return null;
    }

    return metadata as HasuraMetadata;
  } catch {
    // Metadata API not available, will use inference
    return null;
  }
}

/**
 * Parse Hasura metadata to extract relationship mappings
 */
function parseRelationshipMappings(metadata: HasuraMetadata): RelationshipMappings {
  const mappings: RelationshipMappings = new Map();

  for (const source of metadata.sources) {
    for (const table of source.tables) {
      const tableName = table.table.name;

      // Parse object relationships (ManyToOne)
      for (const rel of table.object_relationships || []) {
        const key = `${tableName}.${rel.name}`;

        if (rel.using.foreign_key_constraint_on) {
          // FK constraint: local column -> 'id' (assumed)
          mappings.set(key, { [rel.using.foreign_key_constraint_on]: 'id' });
        } else if (rel.using.manual_configuration) {
          mappings.set(key, rel.using.manual_configuration.column_mapping);
        }
      }

      // Parse array relationships (OneToMany)
      for (const rel of table.array_relationships || []) {
        const key = `${tableName}.${rel.name}`;

        if (rel.using.foreign_key_constraint_on) {
          // FK is on remote table: 'id' (local) -> remote column
          mappings.set(key, { id: rel.using.foreign_key_constraint_on.column });
        } else if (rel.using.manual_configuration) {
          mappings.set(key, rel.using.manual_configuration.column_mapping);
        }
      }
    }
  }

  return mappings;
}

/**
 * Get the base type name from a GraphQL type reference
 */
function getBaseTypeName(typeRef: GraphqlTypeRef): string {
  if (typeRef.name) {
    return typeRef.name;
  }

  if (typeRef.ofType) {
    return getBaseTypeName(typeRef.ofType);
  }

  return 'Unknown';
}

/**
 * Check if a type is a scalar type
 */
function isScalarType(typeName: string, typeMap: Map<string, GraphqlType>): boolean {
  if (SCALAR_TYPES.has(typeName)) {
    return true;
  }

  const type = typeMap.get(typeName);

  if (type) {
    return type.kind === 'SCALAR' || type.kind === 'ENUM';
  }

  return false;
}

/**
 * Check if a type reference is an array type
 */
function isArrayType(typeRef: GraphqlTypeRef): boolean {
  if (typeRef.kind === 'LIST') {
    return true;
  }

  if (typeRef.ofType) {
    return isArrayType(typeRef.ofType);
  }

  return false;
}

/**
 * Map GraphQL type to internal type representation
 */
function mapGraphqlTypeToInternal(graphqlType: string): string {
  const typeMapping: Record<string, string> = {
    Int: 'Number',
    Float: 'Number',
    numeric: 'Number',
    bigint: 'Number',
    smallint: 'Number',
    integer: 'Number',
    real: 'Number',
    double_precision: 'Number',
    String: 'String',
    text: 'String',
    varchar: 'String',
    char: 'String',
    bpchar: 'String',
    Boolean: 'Boolean',
    ID: 'String',
    uuid: 'Uuid',
    timestamptz: 'Date',
    timestamp: 'Date',
    date: 'Dateonly',
    time: 'Time',
    timetz: 'Time',
    jsonb: 'Json',
    json: 'Json',
    bytea: 'Binary',
    inet: 'String',
    money: 'Number',
  };

  return typeMapping[graphqlType] || 'String';
}

/**
 * Convert table name to singular form (simple heuristic)
 */
function singularize(name: string): string {
  if (name.endsWith('ies')) {
    return `${name.slice(0, -3)}y`;
  }

  if (name.endsWith('s') && !name.endsWith('ss')) {
    return name.slice(0, -1);
  }

  return name;
}

/**
 * Infer relationship field mapping based on naming conventions
 */
function inferRelationshipMapping(
  fieldName: string,
  isArray: boolean,
  currentTableName: string,
): Record<string, string> {
  if (isArray) {
    // One-to-many: the remote table has a foreign key to this table
    // e.g., users.posts -> posts.user_id references users.id
    const singularOrigin = singularize(currentTableName);

    return { id: `${singularOrigin}_id` };
  }

  // Many-to-one: this table has a foreign key to the remote table
  // e.g., posts.author -> author_id references users.id
  return { [`${fieldName}_id`]: 'id' };
}

/**
 * Parse a column from a GraphQL field
 */
function parseColumn(field: GraphqlField): IntrospectedColumn {
  const baseTypeName = getBaseTypeName(field.type);
  const isNonNull = field.type.kind === 'NON_NULL';
  const isArray = isArrayType(field.type);

  return {
    name: field.name,
    type: mapGraphqlTypeToInternal(baseTypeName),
    graphqlType: baseTypeName,
    nullable: !isNonNull,
    isPrimaryKey: field.name === 'id',
    isArray,
  };
}

/**
 * Determine if a query field should be skipped
 */
function shouldSkipField(fieldName: string, options: GraphqlDataSourceOptions): boolean {
  // Skip aggregate and by_pk queries
  if (
    fieldName.endsWith('_aggregate') ||
    fieldName.endsWith('_by_pk') ||
    fieldName.endsWith('_stream') ||
    fieldName.endsWith('_connection')
  ) {
    return true;
  }

  // Skip system tables
  for (const prefix of EXCLUDED_PREFIXES) {
    if (fieldName.startsWith(prefix)) {
      return true;
    }
  }

  // Apply user filters
  if (options.includedTables && !options.includedTables.includes(fieldName)) {
    return true;
  }

  if (options.excludedTables?.includes(fieldName)) {
    return true;
  }

  return false;
}

/**
 * Parse a single table from its GraphQL type
 */
function parseTable(
  name: string,
  tableType: GraphqlType,
  typeMap: Map<string, GraphqlType>,
  options: GraphqlDataSourceOptions,
  knownPrimaryKeys?: string[],
  relationshipMappings?: RelationshipMappings,
): IntrospectedTable {
  const columns: IntrospectedColumn[] = [];
  const relationships: IntrospectedRelationship[] = [];
  const primaryKey: string[] = [];

  for (const field of tableType.fields || []) {
    // Skip internal fields, process non-internal fields
    if (!field.name.startsWith('__')) {
      const fieldTypeName = getBaseTypeName(field.type);
      const isScalar = isScalarType(fieldTypeName, typeMap);
      const isArray = isArrayType(field.type);

      if (isScalar) {
        const column = parseColumn(field);

        // Use known primary keys from _by_pk if available
        if (knownPrimaryKeys) {
          column.isPrimaryKey = knownPrimaryKeys.includes(field.name);
        }

        columns.push(column);

        if (column.isPrimaryKey) {
          primaryKey.push(column.name);
        }
      } else if (!shouldSkipField(fieldTypeName.toLowerCase(), options)) {
        // It's a relationship - use metadata mapping if available
        const mappingKey = `${name}.${field.name}`;
        const metadataMapping = relationshipMappings?.get(mappingKey);

        relationships.push({
          name: field.name,
          type: isArray ? 'array' : 'object',
          remoteTable: fieldTypeName.toLowerCase(),
          mapping: metadataMapping || inferRelationshipMapping(field.name, isArray, name),
        });
      }
    }
  }

  // If no primary key was found and no known PKs, fallback to heuristics
  if (primaryKey.length === 0 && !knownPrimaryKeys) {
    const idColumn = columns.find(c => c.name === 'id');

    if (idColumn) {
      idColumn.isPrimaryKey = true;
      primaryKey.push('id');
    } else {
      // For join tables without 'id', use *_id fields as composite primary key
      const idColumns = columns.filter(c => c.name.endsWith('_id'));

      for (const col of idColumns) {
        col.isPrimaryKey = true;
        primaryKey.push(col.name);
      }
    }
  }

  return {
    name,
    graphqlName: tableType.name,
    columns,
    primaryKey,
    relationships,
  };
}

/**
 * Extract primary key fields from a _by_pk query
 */
function extractPrimaryKeysFromByPk(byPkField: GraphqlField): string[] {
  if (!byPkField.args) {
    return [];
  }

  return byPkField.args.map(arg => arg.name);
}

/**
 * Parse Hasura tables from introspection result
 */
function parseHasuraTables(
  result: GraphqlIntrospectionResponse,
  options: GraphqlDataSourceOptions,
  relationshipMappings?: RelationshipMappings,
): IntrospectedTable[] {
  const { __schema: schema } = result;
  const { types, queryType } = schema;
  const queryFields = queryType?.fields || [];
  const tables: IntrospectedTable[] = [];

  // Build a map of types for quick lookup
  const typeMap = new Map<string, GraphqlType>();

  for (const type of types) {
    if (type.name) {
      typeMap.set(type.name, type);
    }
  }

  // Build a map of primary keys from _by_pk queries
  const primaryKeyMap = new Map<string, string[]>();

  for (const field of queryFields) {
    if (field.name.endsWith('_by_pk')) {
      const tableName = field.name.replace('_by_pk', '');
      const pkFields = extractPrimaryKeysFromByPk(field);

      if (pkFields.length > 0) {
        primaryKeyMap.set(tableName, pkFields);
      }
    }
  }

  // Find all table query fields (excluding aggregates and by_pk)
  for (const field of queryFields) {
    if (!shouldSkipField(field.name, options)) {
      const tableName = field.name;
      const typeName = getBaseTypeName(field.type);
      const tableType = typeMap.get(typeName);

      if (tableType && tableType.kind === 'OBJECT') {
        const knownPrimaryKeys = primaryKeyMap.get(tableName);
        const table = parseTable(
          tableName,
          tableType,
          typeMap,
          options,
          knownPrimaryKeys,
          relationshipMappings,
        );

        if (table.columns.length > 0) {
          tables.push(table);
        }
      }
    }
  }

  return tables;
}

/**
 * Introspect a Hasura GraphQL schema
 */
export default async function introspect(
  options: GraphqlDataSourceOptions,
): Promise<IntrospectedSchema> {
  const client = new GraphQLClient(options.uri, {
    headers: options.headers,
  });

  // Fetch metadata and introspection in parallel
  const [result, metadata] = await Promise.all([
    client.request<GraphqlIntrospectionResponse>(INTROSPECTION_QUERY),
    fetchHasuraMetadata(options),
  ]);

  // Parse relationship mappings from metadata if available
  const relationshipMappings = metadata ? parseRelationshipMappings(metadata) : undefined;

  const tables = parseHasuraTables(result, options, relationshipMappings);

  return {
    tables,
    version: '1.0.1',
  };
}
