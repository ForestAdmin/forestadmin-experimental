/**
 * Extract the aggregate value from a Hasura aggregate result
 */
function extractAggregateValue(
  aggregate: Record<string, unknown>,
  operation: string,
  field?: string,
): number {
  if (operation === 'Count') {
    return (aggregate.count as number) ?? 0;
  }

  const opKey = operation.toLowerCase();
  const opResult = aggregate[opKey] as Record<string, unknown> | undefined;

  if (opResult && field) {
    return (opResult[field] as number) ?? 0;
  }

  return 0;
}

/**
 * Get a nested value from a record using a field path (e.g., "user:username")
 */
function getNestedValue(record: Record<string, unknown>, fieldPath: string): unknown {
  const parts = fieldPath.split(':');
  let current: unknown = record;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return null;
    }

    if (typeof current !== 'object') {
      return null;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Group nodes by the specified group fields and compute aggregates client-side
 */
function groupAndAggregate(
  nodes: Record<string, unknown>[],
  operation: string,
  field: string | undefined,
  groups: { field: string }[],
): { value: number; group: Record<string, unknown> }[] {
  const grouped = new Map<
    string,
    { count: number; values: number[]; group: Record<string, unknown> }
  >();

  for (const node of nodes) {
    // Build group key from all group fields
    const groupValues: Record<string, unknown> = {};
    const keyParts: string[] = [];

    for (const g of groups) {
      const value = getNestedValue(node, g.field);
      groupValues[g.field] = value;
      keyParts.push(String(value));
    }

    const key = keyParts.join('|||');

    if (!grouped.has(key)) {
      grouped.set(key, { count: 0, values: [], group: groupValues });
    }

    const entry = grouped.get(key);
    entry.count += 1;

    // For Sum/Avg/Min/Max, collect the field values
    if (field) {
      const fieldValue = getNestedValue(node, field);

      if (typeof fieldValue === 'number') {
        entry.values.push(fieldValue);
      }
    }
  }

  // Compute final aggregate values
  const results: { value: number; group: Record<string, unknown> }[] = [];

  for (const entry of grouped.values()) {
    let value: number;

    switch (operation) {
      case 'Count':
        value = entry.count;
        break;
      case 'Sum':
        value = entry.values.reduce((a, b) => a + b, 0);
        break;
      case 'Avg':
        value =
          entry.values.length > 0
            ? entry.values.reduce((a, b) => a + b, 0) / entry.values.length
            : 0;
        break;
      case 'Min':
        value = entry.values.length > 0 ? Math.min(...entry.values) : 0;
        break;
      case 'Max':
        value = entry.values.length > 0 ? Math.max(...entry.values) : 0;
        break;
      default:
        value = entry.count;
    }

    results.push({ value, group: entry.group });
  }

  return results;
}

/**
 * Convert aggregate results from Hasura to Forest Admin format
 */
export default function convertAggregateResults(
  hasuraResult: {
    aggregate: Record<string, unknown>;
    nodes?: Record<string, unknown>[];
  },
  operation: string,
  field?: string,
  groups?: { field: string }[],
): { value: number; group: Record<string, unknown> }[] {
  const { aggregate, nodes } = hasuraResult;

  // Simple aggregation without grouping
  if (!groups?.length) {
    return [
      {
        value: extractAggregateValue(aggregate, operation, field),
        group: {},
      },
    ];
  }

  // With grouping - do client-side aggregation from nodes
  if (!nodes?.length) {
    return [];
  }

  return groupAndAggregate(nodes, operation, field, groups);
}
