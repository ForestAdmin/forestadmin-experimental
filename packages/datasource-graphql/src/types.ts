/**
 * Configuration options for the GraphQL datasource
 */
export interface GraphqlDataSourceOptions {
  /** URL of the Hasura GraphQL API */
  uri: string;

  /** Authentication headers (e.g., x-hasura-admin-secret) */
  headers?: Record<string, string>;

  /** Collections to include (all if not specified) */
  includedTables?: string[];

  /** Collections to exclude */
  excludedTables?: string[];

  /** Type prefix for Hasura types (default: '') */
  typePrefix?: string;

  /** Enable live queries support */
  liveQueriesEnabled?: boolean;

  /** Hasura metadata endpoint URL (default: inferred from uri, e.g., /v1/metadata) */
  metadataUri?: string;
}

/**
 * Hasura metadata response
 */
export interface HasuraMetadata {
  version: number;
  sources: HasuraSource[];
}

export interface HasuraSource {
  name: string;
  kind: string;
  tables: HasuraTableMetadata[];
}

export interface HasuraTableMetadata {
  table: { name: string; schema: string };
  object_relationships?: HasuraObjectRelationship[];
  array_relationships?: HasuraArrayRelationship[];
}

export interface HasuraObjectRelationship {
  name: string;
  using: {
    foreign_key_constraint_on?: string;
    manual_configuration?: {
      remote_table: { name: string; schema: string };
      column_mapping: Record<string, string>;
    };
  };
}

export interface HasuraArrayRelationship {
  name: string;
  using: {
    foreign_key_constraint_on?: {
      column: string;
      table: { name: string; schema: string };
    };
    manual_configuration?: {
      remote_table: { name: string; schema: string };
      column_mapping: Record<string, string>;
    };
  };
}

/**
 * Hasura WHERE clause structure
 */
export interface HasuraWhereClause {
  _and?: HasuraWhereClause[];
  _or?: HasuraWhereClause[];
  _not?: HasuraWhereClause;
  [field: string]: HasuraOperator | HasuraWhereClause[] | HasuraWhereClause | undefined;
}

/**
 * Hasura comparison operators
 */
export interface HasuraOperator {
  _eq?: unknown;
  _neq?: unknown;
  _gt?: unknown;
  _gte?: unknown;
  _lt?: unknown;
  _lte?: unknown;
  _in?: unknown[];
  _nin?: unknown[];
  _like?: string;
  _nlike?: string;
  _ilike?: string;
  _nilike?: string;
  _similar?: string;
  _nsimilar?: string;
  _regex?: string;
  _iregex?: string;
  _is_null?: boolean;
  _contains?: unknown;
  _contained_in?: unknown;
  _has_key?: string;
  _has_keys_any?: string[];
  _has_keys_all?: string[];
}

export type HasuraSortOrder =
  | 'asc'
  | 'desc'
  | 'asc_nulls_first'
  | 'asc_nulls_last'
  | 'desc_nulls_first'
  | 'desc_nulls_last';

/**
 * Hasura ORDER BY structure - supports nested relations
 */
export interface HasuraOrderBy {
  [field: string]: HasuraSortOrder | HasuraNestedOrderBy;
}

export interface HasuraNestedOrderBy {
  [field: string]: HasuraSortOrder | HasuraNestedOrderBy;
}

/**
 * Introspected schema from GraphQL
 */
export interface IntrospectedSchema {
  tables: IntrospectedTable[];
  version: string;
}

/**
 * Introspected table definition
 */
export interface IntrospectedTable {
  name: string;
  graphqlName: string;
  columns: IntrospectedColumn[];
  primaryKey: string[];
  relationships: IntrospectedRelationship[];
}

/**
 * Introspected column definition
 */
export interface IntrospectedColumn {
  name: string;
  type: string;
  graphqlType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isArray: boolean;
  defaultValue?: unknown;
}

/**
 * Introspected relationship definition
 */
export interface IntrospectedRelationship {
  name: string;
  type: 'object' | 'array';
  remoteTable: string;
  mapping: Record<string, string>;
}

/**
 * GraphQL introspection query response types
 */
export interface GraphqlIntrospectionResponse {
  __schema: {
    types: GraphqlType[];
    queryType: {
      name: string;
      fields: GraphqlField[];
    };
    mutationType?: {
      name: string;
      fields: GraphqlField[];
    };
  };
}

export interface GraphqlType {
  name: string;
  kind: 'OBJECT' | 'SCALAR' | 'ENUM' | 'INPUT_OBJECT' | 'LIST' | 'NON_NULL' | 'INTERFACE' | 'UNION';
  fields?: GraphqlField[];
  inputFields?: GraphqlInputField[];
  enumValues?: { name: string }[];
}

export interface GraphqlField {
  name: string;
  type: GraphqlTypeRef;
  args?: GraphqlInputField[];
}

export interface GraphqlInputField {
  name: string;
  type: GraphqlTypeRef;
  defaultValue?: string;
}

export interface GraphqlTypeRef {
  name: string | null;
  kind: string;
  ofType?: GraphqlTypeRef | null;
}
