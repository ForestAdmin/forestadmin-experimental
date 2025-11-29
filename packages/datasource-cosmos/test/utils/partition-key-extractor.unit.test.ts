import { ConditionTreeBranch, ConditionTreeLeaf } from '@forestadmin/datasource-toolkit';

import { extractPartitionKeyFromFilter } from '../../src/utils/partition-key-extractor';

describe('extractPartitionKeyFromFilter', () => {
  describe('with simple partition key path', () => {
    const partitionKeyPath = '/tenantId';

    it('should return undefined when conditionTree is undefined', () => {
      const result = extractPartitionKeyFromFilter(undefined, partitionKeyPath);

      expect(result).toBeUndefined();
    });

    it('should extract string partition key from simple equality condition', () => {
      const conditionTree = new ConditionTreeLeaf('tenantId', 'Equal', 'tenant-123');

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBe('tenant-123');
    });

    it('should extract number partition key from simple equality condition', () => {
      const conditionTree = new ConditionTreeLeaf('tenantId', 'Equal', 42);

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBe(42);
    });

    it('should extract partition key from AND condition', () => {
      const conditionTree = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('tenantId', 'Equal', 'tenant-123'),
        new ConditionTreeLeaf('status', 'Equal', 'active'),
      ]);

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBe('tenant-123');
    });

    it('should extract partition key from nested AND conditions', () => {
      const conditionTree = new ConditionTreeBranch('And', [
        new ConditionTreeBranch('And', [
          new ConditionTreeLeaf('tenantId', 'Equal', 'tenant-456'),
          new ConditionTreeLeaf('category', 'Equal', 'books'),
        ]),
        new ConditionTreeLeaf('status', 'Equal', 'active'),
      ]);

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBe('tenant-456');
    });

    it('should return undefined for OR condition (requires multiple partitions)', () => {
      const conditionTree = new ConditionTreeBranch('Or', [
        new ConditionTreeLeaf('tenantId', 'Equal', 'tenant-1'),
        new ConditionTreeLeaf('tenantId', 'Equal', 'tenant-2'),
      ]);

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBeUndefined();
    });

    it('should return undefined for In operator (multiple values)', () => {
      const conditionTree = new ConditionTreeLeaf('tenantId', 'In', ['tenant-1', 'tenant-2']);

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBeUndefined();
    });

    it('should return undefined for NotEqual operator', () => {
      const conditionTree = new ConditionTreeLeaf('tenantId', 'NotEqual', 'tenant-123');

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBeUndefined();
    });

    it('should return undefined when partition key field is not in filter', () => {
      const conditionTree = new ConditionTreeLeaf('status', 'Equal', 'active');

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBeUndefined();
    });

    it('should return undefined for null value', () => {
      const conditionTree = new ConditionTreeLeaf('tenantId', 'Equal', null);

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBeUndefined();
    });

    it('should return undefined for object value', () => {
      const conditionTree = new ConditionTreeLeaf('tenantId', 'Equal', { nested: 'value' });

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBeUndefined();
    });
  });

  describe('with nested partition key path', () => {
    const partitionKeyPath = '/address/city';

    it('should extract partition key from nested path equality condition', () => {
      const conditionTree = new ConditionTreeLeaf('address->city', 'Equal', 'Paris');

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBe('Paris');
    });

    it('should extract partition key from nested path in AND condition', () => {
      const conditionTree = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('address->city', 'Equal', 'London'),
        new ConditionTreeLeaf('status', 'Equal', 'active'),
      ]);

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBe('London');
    });
  });

  describe('with deeply nested partition key path', () => {
    const partitionKeyPath = '/user/profile/region';

    it('should extract partition key from deeply nested path', () => {
      const conditionTree = new ConditionTreeLeaf('user->profile->region', 'Equal', 'EU');

      const result = extractPartitionKeyFromFilter(conditionTree, partitionKeyPath);

      expect(result).toBe('EU');
    });
  });

  describe('edge cases', () => {
    it('should handle partition key path without leading slash', () => {
      const conditionTree = new ConditionTreeLeaf('tenantId', 'Equal', 'tenant-123');

      // Some implementations might not include leading slash
      const result = extractPartitionKeyFromFilter(conditionTree, 'tenantId');

      expect(result).toBe('tenant-123');
    });

    it('should return first matching partition key in AND with multiple matches', () => {
      const conditionTree = new ConditionTreeBranch('And', [
        new ConditionTreeLeaf('tenantId', 'Equal', 'first'),
        new ConditionTreeLeaf('tenantId', 'Equal', 'second'),
      ]);

      const result = extractPartitionKeyFromFilter(conditionTree, '/tenantId');

      // Should return the first one found
      expect(result).toBe('first');
    });
  });
});
