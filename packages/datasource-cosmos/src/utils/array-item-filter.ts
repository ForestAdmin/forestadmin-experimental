import { ConditionTree, ConditionTreeLeaf, RecordData } from '@forestadmin/datasource-toolkit';

/**
 * Utility class for filtering and sorting array items in virtual collections
 * Handles in-memory filtering when Cosmos DB queries can't be used
 */
export default class ArrayItemFilter {
  /**
   * Apply a condition tree to filter array items
   * @param items The items to filter
   * @param conditionTree The condition tree to apply
   * @param excludeFields Fields to skip filtering on (e.g., 'id', 'parentId')
   * @returns Filtered items
   */
  static applyConditionTree(
    items: RecordData[],
    conditionTree: ConditionTree,
    excludeFields: string[] = [],
  ): RecordData[] {
    if (!conditionTree) return items;

    // Use duck typing to check if it's a leaf
    const isLeaf = 'field' in conditionTree && 'operator' in conditionTree;

    // Handle ConditionTreeLeaf (single condition)
    if (isLeaf) {
      const leaf = conditionTree as ConditionTreeLeaf;
      const { field, operator, value } = leaf;

      // Skip excluded fields as they're handled separately
      if (excludeFields.includes(field)) {
        return items;
      }

      return items.filter(item => this.matchesCondition(item, field, operator, value));
    }

    // Handle ConditionTreeBranch (AND/OR logic)
    if ('aggregator' in conditionTree && conditionTree.aggregator) {
      const branch = conditionTree as unknown as {
        aggregator: string;
        conditions: ConditionTree[];
      };
      const { aggregator, conditions } = branch;

      if (aggregator === 'And') {
        return items.filter(item =>
          conditions.every(cond => this.applyConditionTree([item], cond, excludeFields).length > 0),
        );
      }

      if (aggregator === 'Or') {
        return items.filter(item =>
          conditions.some(cond => this.applyConditionTree([item], cond, excludeFields).length > 0),
        );
      }
    }

    return items;
  }

  /**
   * Check if a record matches a condition
   * @param record The record to check
   * @param field The field to check
   * @param operator The operator to apply
   * @param value The value to compare against
   * @returns true if the record matches the condition
   */
  static matchesCondition(
    record: RecordData,
    field: string,
    operator: string,
    value: unknown,
  ): boolean {
    const fieldValue = record[field];

    switch (operator) {
      case 'Equal':
        return fieldValue === value;
      case 'NotEqual':
        return fieldValue !== value;
      case 'In':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'NotIn':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'Present':
        return fieldValue !== null && fieldValue !== undefined;
      case 'Missing':
        return fieldValue === null || fieldValue === undefined;
      case 'LessThan':
        return fieldValue < value;
      case 'LessThanOrEqual':
        return fieldValue <= value;
      case 'GreaterThan':
        return fieldValue > value;
      case 'GreaterThanOrEqual':
        return fieldValue >= value;
      case 'Contains':
        return (
          typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.includes(value)
        );
      case 'NotContains':
        return (
          typeof fieldValue === 'string' && typeof value === 'string' && !fieldValue.includes(value)
        );
      case 'StartsWith':
        return (
          typeof fieldValue === 'string' &&
          typeof value === 'string' &&
          fieldValue.startsWith(value)
        );
      case 'EndsWith':
        return (
          typeof fieldValue === 'string' && typeof value === 'string' && fieldValue.endsWith(value)
        );
      case 'IContains':
        return (
          typeof fieldValue === 'string' &&
          typeof value === 'string' &&
          fieldValue.toLowerCase().includes(value.toLowerCase())
        );
      case 'Like':
      case 'ILike':
        // Simple wildcard matching (% for any characters, _ for single character)
        if (typeof fieldValue === 'string' && typeof value === 'string') {
          const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
          const regex = new RegExp(`^${pattern}$`, operator === 'ILike' ? 'i' : '');

          return regex.test(fieldValue);
        }

        return false;
      default:
        // eslint-disable-next-line no-console
        console.warn(`[ArrayItemFilter] Unsupported operator: ${operator}`);

        return true; // Don't filter out if we don't know the operator
    }
  }

  /**
   * Apply sorting to items
   * @param items The items to sort
   * @param sort Array of sort criteria (field and direction)
   * @returns Sorted items (new array)
   */
  static applySorting(
    items: RecordData[],
    sort: Array<{ field: string; ascending: boolean }>,
  ): RecordData[] {
    if (!sort || sort.length === 0) return items;

    return [...items].sort((a, b) => {
      for (const { field, ascending } of sort) {
        const aValue = a[field];
        const bValue = b[field];

        // Handle null/undefined
        if (aValue == null && bValue == null) {
          // Both null, skip to next sort field
        } else if (aValue == null) {
          return ascending ? 1 : -1;
        } else if (bValue == null) {
          return ascending ? -1 : 1;
        } else {
          // Compare values
          let comparison = 0;

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
          } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
          } else if (aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime();
          } else {
            // Fallback: convert to string and compare
            comparison = String(aValue).localeCompare(String(bValue));
          }

          if (comparison !== 0) {
            return ascending ? comparison : -comparison;
          }
        }
      }

      return 0;
    });
  }
}
