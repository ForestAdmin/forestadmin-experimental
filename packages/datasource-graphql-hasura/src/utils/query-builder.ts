import type { GroupRelationInfo } from './aggregation';
import type { HasuraOrderBy } from '../types';
import type { Aggregation, PaginatedFilter, Sort } from '@forestadmin/datasource-toolkit';

import { Projection } from '@forestadmin/datasource-toolkit';

import convertFilter from './filter-converter';

export interface GraphqlQuery {
  query: string;
  variables: Record<string, unknown>;
}

/**
 * Capitalize a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/**
 * Clean a record for insertion (remove undefined/null values and relations)
 */
function cleanRecordForInsert(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    // Skip null/undefined values and relationship objects
    const isNullOrUndefined = value === null || value === undefined;
    const isRelationship =
      typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

    if (!isNullOrUndefined && !isRelationship) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Clean a record for update (remove undefined values and relations)
 */
function cleanRecordForUpdate(record: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    // Skip undefined values (null is valid for clearing a field)
    const isUndefined = value === undefined;
    const isRelationship =
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date);

    if (!isUndefined && !isRelationship) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Build nested order_by for relationship fields
 */
function buildNestedOrderBy(fieldParts: string[], direction: 'asc' | 'desc'): HasuraOrderBy {
  const [relation, ...rest] = fieldParts;

  if (rest.length === 1) {
    return { [relation]: { [rest[0]]: direction } };
  }

  return { [relation]: buildNestedOrderBy(rest, direction) };
}

/**
 * Convert Forest Admin sort to Hasura order_by
 */
function convertSort(sort: Sort): HasuraOrderBy[] {
  return sort.map(s => {
    const { field } = s;
    const direction = s.ascending ? 'asc' : 'desc';

    // Handle nested fields (e.g., "author:name")
    if (field.includes(':')) {
      return buildNestedOrderBy(field.split(':'), direction);
    }

    return { [field]: direction };
  });
}

/**
 * Build GraphQL projection fields from a Forest Admin projection
 */
function buildProjectionFields(projection: Projection): string {
  const directFields: Set<string> = new Set();
  const relationFields: Map<string, Set<string>> = new Map();

  for (const field of projection) {
    if (field.includes(':')) {
      // Relationship field (e.g., "author:name")
      const parts = field.split(':');
      const [relation, ...rest] = parts;
      const subField = rest.join(':');

      if (!relationFields.has(relation)) {
        relationFields.set(relation, new Set());
      }

      const relationSet = relationFields.get(relation);

      // Handle deeply nested fields
      if (rest.length > 1 && relationSet) {
        relationSet.add(subField);
      } else if (relationSet) {
        relationSet.add(rest[0]);
      }
    } else {
      directFields.add(field);
    }
  }

  // Build the fields string
  let result = Array.from(directFields).join('\n    ');

  for (const [relation, subFields] of relationFields) {
    const nestedProjection = new Projection(...Array.from(subFields));
    const nestedFields = buildProjectionFields(nestedProjection);
    result += `\n    ${relation} {\n      ${nestedFields.split('\n').join('\n      ')}\n    }`;
  }

  return result;
}

/**
 * Build a GraphQL query for listing records
 */
export function buildListQuery(
  tableName: string,
  filter: PaginatedFilter,
  projection: Projection,
): GraphqlQuery {
  const args: string[] = [];
  const variables: Record<string, unknown> = {};
  const varDefs: string[] = [];

  // Where clause
  if (filter.conditionTree) {
    varDefs.push(`$where: ${tableName}_bool_exp`);
    args.push('where: $where');
    variables.where = convertFilter(filter.conditionTree);
  }

  // Order by
  if (filter.sort?.length) {
    varDefs.push(`$orderBy: [${tableName}_order_by!]`);
    args.push('order_by: $orderBy');
    variables.orderBy = convertSort(filter.sort);
  }

  // Pagination
  if (filter.page?.limit) {
    varDefs.push('$limit: Int');
    args.push('limit: $limit');
    variables.limit = filter.page.limit;
  }

  if (filter.page?.skip) {
    varDefs.push('$offset: Int');
    args.push('offset: $offset');
    variables.offset = filter.page.skip;
  }

  const varDefsString = varDefs.length ? `(${varDefs.join(', ')})` : '';
  const argsString = args.length ? `(${args.join(', ')})` : '';
  const fields = buildProjectionFields(projection);

  const query = `
query List${capitalize(tableName)}${varDefsString} {
  ${tableName}${argsString} {
    ${fields}
  }
}`.trim();

  return { query, variables };
}

/**
 * Build a GraphQL mutation for creating records
 */
export function buildCreateMutation(
  tableName: string,
  records: Record<string, unknown>[],
  projection: Projection,
): GraphqlQuery {
  const fields = buildProjectionFields(projection);

  const query = `
mutation Insert${capitalize(tableName)}($objects: [${tableName}_insert_input!]!) {
  insert_${tableName}(objects: $objects) {
    returning {
      ${fields}
    }
  }
}`.trim();

  // Clean records: remove null values and relationship placeholders
  const cleanedRecords = records.map(record => cleanRecordForInsert(record));

  return { query, variables: { objects: cleanedRecords } };
}

/**
 * Build a GraphQL mutation for updating records
 */
export function buildUpdateMutation(
  tableName: string,
  filter: PaginatedFilter,
  patch: Record<string, unknown>,
): GraphqlQuery {
  const variables: Record<string, unknown> = {
    where: convertFilter(filter.conditionTree) || {},
    set: cleanRecordForUpdate(patch),
  };

  const query = `
mutation Update${capitalize(
    tableName,
  )}($where: ${tableName}_bool_exp!, $set: ${tableName}_set_input!) {
  update_${tableName}(where: $where, _set: $set) {
    affected_rows
  }
}`.trim();

  return { query, variables };
}

/**
 * Build a GraphQL mutation for deleting records
 */
export function buildDeleteMutation(tableName: string, filter: PaginatedFilter): GraphqlQuery {
  const variables: Record<string, unknown> = {
    where: convertFilter(filter.conditionTree) || {},
  };

  const query = `
mutation Delete${capitalize(tableName)}($where: ${tableName}_bool_exp!) {
  delete_${tableName}(where: $where) {
    affected_rows
  }
}`.trim();

  return { query, variables };
}

/**
 * Build the aggregate operation fields for a GraphQL aggregate query
 */
function buildAggregationFields(aggregation: Aggregation): string {
  const { operation, field } = aggregation;

  if (operation === 'Count') {
    return field ? `count(columns: ${field})` : 'count';
  }

  return `${operation.toLowerCase()} {\n        ${field}\n      }`;
}

/**
 * Build a GraphQL query for simple (non-grouped) aggregation
 */
export function buildAggregateQuery(
  tableName: string,
  filter: PaginatedFilter,
  aggregation: Aggregation,
): GraphqlQuery {
  const args: string[] = [];
  const variables: Record<string, unknown> = {};
  const varDefs: string[] = [];

  if (filter.conditionTree) {
    varDefs.push(`$where: ${tableName}_bool_exp`);
    args.push('where: $where');
    variables.where = convertFilter(filter.conditionTree);
  }

  const varDefsString = varDefs.length ? `(${varDefs.join(', ')})` : '';
  const argsString = args.length ? `(${args.join(', ')})` : '';
  const aggregateFields = buildAggregationFields(aggregation);

  const query = `
query Aggregate${capitalize(tableName)}${varDefsString} {
  ${tableName}_aggregate${argsString} {
    aggregate {
      ${aggregateFields}
    }
  }
}`.trim();

  return { query, variables };
}

/**
 * Build a GraphQL query for grouped aggregation via parent collection.
 * Hasura handles grouping natively through nested _aggregate on relationships.
 *
 * Example: count posts grouped by author_id →
 *   query { users { id  posts_aggregate { aggregate { count } } } }
 */
export function buildGroupedAggregateQuery(
  childTableName: string,
  relInfo: GroupRelationInfo,
  filter: PaginatedFilter,
  aggregation: Aggregation,
): GraphqlQuery {
  const aggArgs: string[] = [];
  const variables: Record<string, unknown> = {};
  const varDefs: string[] = [];

  if (filter.conditionTree) {
    varDefs.push(`$where: ${childTableName}_bool_exp`);
    aggArgs.push('where: $where');
    variables.where = convertFilter(filter.conditionTree);
  }

  const varDefsString = varDefs.length ? `(${varDefs.join(', ')})` : '';
  const aggArgsString = aggArgs.length ? `(${aggArgs.join(', ')})` : '';
  const aggregateFields = buildAggregationFields(aggregation);

  const query = `
query Aggregate${capitalize(relInfo.parentTable)}${varDefsString} {
  ${relInfo.parentTable} {
    ${relInfo.parentPkField}
    ${relInfo.relationshipName}_aggregate${aggArgsString} {
      aggregate {
        ${aggregateFields}
      }
    }
  }
}`.trim();

  return { query, variables };
}
