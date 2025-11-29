import {
  ConditionTree,
  ConditionTreeBranch,
  ConditionTreeLeaf,
} from '@forestadmin/datasource-toolkit';

export type PartitionKeyValue = string | number | undefined;

function extractFromTree(
  conditionTree: ConditionTree,
  partitionKeyField: string,
): PartitionKeyValue {
  // Handle leaf nodes (single conditions)
  if ((conditionTree as ConditionTreeLeaf).operator !== undefined) {
    const leaf = conditionTree as ConditionTreeLeaf;

    // Only extract if it's an equality condition on the partition key field
    if (leaf.field === partitionKeyField && leaf.operator === 'Equal') {
      const { value } = leaf;

      // Partition keys must be string or number
      if (typeof value === 'string' || typeof value === 'number') {
        return value;
      }
    }

    return undefined;
  }

  // Handle branch nodes (AND/OR conditions)
  if ((conditionTree as ConditionTreeBranch).aggregator !== undefined) {
    const branch = conditionTree as ConditionTreeBranch;

    // Only extract from AND branches - OR branches require multiple partitions
    if (branch.aggregator === 'And') {
      for (const condition of branch.conditions) {
        const extracted = extractFromTree(condition, partitionKeyField);

        if (extracted !== undefined) {
          return extracted;
        }
      }
    }

    // For OR branches, we cannot optimize as we'd need multiple partitions
    return undefined;
  }

  return undefined;
}

/**
 * Extracts the partition key value from a ConditionTree if present.
 *
 * This optimization allows Cosmos DB to target a single partition instead of
 * performing a cross-partition query, significantly reducing RU consumption.
 *
 * The extraction works when:
 * - There's an equality condition (operator = 'Equal') on the partition key field
 * - The condition is at the root level or within an AND branch
 *
 * The extraction does NOT work when:
 * - The partition key is filtered with IN, NotEqual, or range operators
 * - The partition key condition is inside an OR branch (multiple partitions needed)
 * - No filter on partition key exists
 */
export function extractPartitionKeyFromFilter(
  conditionTree: ConditionTree | undefined,
  partitionKeyPath: string,
): PartitionKeyValue {
  if (!conditionTree) return undefined;

  // Convert partition key path (e.g., "/tenantId" or "/address/city")
  // to field notation (e.g., "tenantId" or "address->city")
  const partitionKeyField = partitionKeyPath
    .replace(/^\//, '') // Remove leading slash
    .replace(/\//g, '->'); // Convert nested paths to arrow notation

  return extractFromTree(conditionTree, partitionKeyField);
}
