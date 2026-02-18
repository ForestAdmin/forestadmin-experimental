import type { HasuraOperator, HasuraWhereClause } from '../types';
import type {
  ConditionTree,
  ConditionTreeBranch,
  ConditionTreeLeaf,
} from '@forestadmin/datasource-toolkit';

/**
 * Escape special wildcard characters in LIKE patterns
 */
function escapeWildcards(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * Convert a Forest Admin operator to a Hasura operator
 */
function convertOperator(operator: string, value: unknown): HasuraOperator {
  const converters: Record<string, (v: unknown) => HasuraOperator> = {
    // Equality operators
    Equal: v => ({ _eq: v }),
    NotEqual: v => ({ _neq: v }),

    // Comparison operators
    LessThan: v => ({ _lt: v }),
    GreaterThan: v => ({ _gt: v }),
    LessThanOrEqual: v => ({ _lte: v }),
    GreaterThanOrEqual: v => ({ _gte: v }),

    // Set operators
    In: v => ({ _in: v as unknown[] }),
    NotIn: v => ({ _nin: v as unknown[] }),

    // String operators
    Contains: v => ({ _ilike: `%${escapeWildcards(String(v))}%` }),
    NotContains: v => ({ _nilike: `%${escapeWildcards(String(v))}%` }),
    StartsWith: v => ({ _ilike: `${escapeWildcards(String(v))}%` }),
    EndsWith: v => ({ _ilike: `%${escapeWildcards(String(v))}` }),
    Like: v => ({ _like: String(v) }),
    ILike: v => ({ _ilike: String(v) }),

    // Null operators
    Present: () => ({ _is_null: false }),
    Missing: () => ({ _is_null: true }),
    Blank: () => ({ _is_null: true }),

    // Date operators (translated to comparison)
    Before: v => ({ _lt: v }),
    After: v => ({ _gt: v }),

    // Array operators for JSON/Array fields
    IncludesAll: v => ({ _has_keys_all: v as string[] }),
    IncludesNone: v => ({ _has_keys_any: v as string[] }), // Will need _not wrapper

    // JSON operators
    ContainsKey: v => ({ _has_key: String(v) }),
  };

  const converter = converters[operator];

  if (!converter) {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  return converter(value);
}

/**
 * Build a nested condition for relationship fields
 */
function buildNestedCondition(
  fieldParts: string[],
  operator: string,
  value: unknown,
): HasuraWhereClause {
  const [relation, ...rest] = fieldParts;
  const nestedField = rest.join(':');

  if (rest.length === 1) {
    return { [relation]: { [nestedField]: convertOperator(operator, value) } };
  }

  return { [relation]: buildNestedCondition(rest, operator, value) };
}

/**
 * Convert a leaf condition (field operator value)
 */
function convertLeaf(leaf: ConditionTreeLeaf): HasuraWhereClause {
  const { field, operator, value } = leaf;

  // Handle nested fields (e.g., "author:name" -> { author: { name: ... } })
  const fieldParts = field.split(':');

  if (fieldParts.length > 1) {
    return buildNestedCondition(fieldParts, operator, value);
  }

  return { [field]: convertOperator(operator, value) };
}

/**
 * Convert a Forest Admin ConditionTree to a Hasura WHERE clause
 * Handles both leaf conditions and branch conditions (AND/OR) recursively
 */
export default function convertFilter(
  conditionTree: ConditionTree | null,
): HasuraWhereClause | undefined {
  if (!conditionTree) {
    return undefined;
  }

  // Handle leaf condition
  if (!('aggregator' in conditionTree)) {
    return convertLeaf(conditionTree as ConditionTreeLeaf);
  }

  // Handle branch condition (AND/OR) - inline to avoid mutual recursion
  const branch = conditionTree as ConditionTreeBranch;
  const conditions = branch.conditions
    .map(c => convertFilter(c))
    .filter((c): c is HasuraWhereClause => c !== undefined);

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  if (branch.aggregator === 'And') {
    return { _and: conditions };
  }

  return { _or: conditions };
}
