import { AggregateResult, Aggregation } from '@forestadmin/datasource-toolkit';

export interface GroupRelationInfo {
  parentTable: string;
  relationshipName: string;
  parentPkField: string;
  fkField: string;
}

/**
 * Extract value from Hasura aggregate response
 */
export function extractAggregateValue(
  aggregate: Record<string, unknown>,
  aggregation: Aggregation,
): unknown {
  if (aggregation.operation === 'Count') {
    return aggregate.count;
  }

  const opResult = aggregate[aggregation.operation.toLowerCase()] as
    | Record<string, unknown>
    | undefined;

  return aggregation.field ? opResult?.[aggregation.field] : undefined;
}

export function executeGroupedAggregate(
  result,
  relInfo: GroupRelationInfo,
  groupField: string,
  aggregation: Aggregation,
  limit?: number,
) {
  const parentRows = (result[relInfo.parentTable] || []) as Record<string, unknown>[];

  const results: AggregateResult[] = parentRows.reduce<AggregateResult[]>((acc, row) => {
    const nested = row[`${relInfo.relationshipName}_aggregate`] as
      | { aggregate: Record<string, unknown> }
      | undefined;

    if (nested?.aggregate) {
      const value = extractAggregateValue(nested.aggregate, aggregation);

      if (value !== null && value !== undefined) {
        acc.push({
          value,
          group: { [groupField]: row[relInfo.parentPkField] },
        });
      }
    }

    return acc;
  }, []);

  results.sort((a, b) => (b.value as number) - (a.value as number));

  if (limit && limit > 0) {
    return results.slice(0, limit);
  }

  return results;
}
