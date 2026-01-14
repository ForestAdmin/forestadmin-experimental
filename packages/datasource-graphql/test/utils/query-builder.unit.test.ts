import { Projection } from '@forestadmin/datasource-toolkit';

import {
  buildAggregateQuery,
  buildCreateMutation,
  buildDeleteMutation,
  buildListQuery,
  buildUpdateMutation,
} from '../../src/utils/query-builder';

describe('QueryBuilder', () => {
  describe('buildListQuery', () => {
    it('should build a simple list query', () => {
      const filter = {} as any;
      const projection = new Projection('id', 'name', 'email');

      const { query, variables } = buildListQuery('users', filter, projection);

      expect(query).toContain('query ListUsers');
      expect(query).toContain('users');
      expect(query).toContain('id');
      expect(query).toContain('name');
      expect(query).toContain('email');
      expect(variables).toEqual({});
    });

    it('should include where clause when filter has conditionTree', () => {
      const filter = {
        conditionTree: {
          field: 'status',
          operator: 'Equal',
          value: 'active',
        },
      } as any;
      const projection = new Projection('id', 'name');

      const { query, variables } = buildListQuery('users', filter, projection);

      expect(query).toContain('$where: users_bool_exp');
      expect(query).toContain('where: $where');
      expect(variables.where).toEqual({ status: { _eq: 'active' } });
    });

    it('should include order_by when filter has sort', () => {
      const filter = {
        sort: [{ field: 'name', ascending: true }],
      } as any;
      const projection = new Projection('id', 'name');

      const { query, variables } = buildListQuery('users', filter, projection);

      expect(query).toContain('$orderBy: [users_order_by!]');
      expect(query).toContain('order_by: $orderBy');
      expect(variables.orderBy).toEqual([{ name: 'asc' }]);
    });

    it('should include descending sort', () => {
      const filter = {
        sort: [{ field: 'created_at', ascending: false }],
      } as any;
      const projection = new Projection('id');

      const { variables } = buildListQuery('users', filter, projection);

      expect(variables.orderBy).toEqual([{ created_at: 'desc' }]);
    });

    it('should include pagination', () => {
      const filter = {
        page: { limit: 10, skip: 20 },
      } as any;
      const projection = new Projection('id');

      const { query, variables } = buildListQuery('users', filter, projection);

      expect(query).toContain('$limit: Int');
      expect(query).toContain('$offset: Int');
      expect(query).toContain('limit: $limit');
      expect(query).toContain('offset: $offset');
      expect(variables.limit).toBe(10);
      expect(variables.offset).toBe(20);
    });

    it('should handle nested projection fields', () => {
      const projection = new Projection('id', 'author:id', 'author:name');

      const { query } = buildListQuery('posts', {} as any, projection);

      expect(query).toContain('id');
      expect(query).toContain('author {');
      expect(query).toContain('name');
    });
  });

  describe('buildCreateMutation', () => {
    it('should build a create mutation', () => {
      const records = [{ name: 'John', email: 'john@example.com' }];
      const projection = new Projection('id', 'name', 'email');

      const { query, variables } = buildCreateMutation('users', records, projection);

      expect(query).toContain('mutation InsertUsers');
      expect(query).toContain('insert_users(objects: $objects)');
      expect(query).toContain('returning');
      expect(variables.objects).toEqual([{ name: 'John', email: 'john@example.com' }]);
    });

    it('should filter out null values from records', () => {
      const records = [{ name: 'John', email: null, phone: undefined }];
      const projection = new Projection('id', 'name');

      const { variables } = buildCreateMutation('users', records, projection);

      expect(variables.objects).toEqual([{ name: 'John' }]);
    });
  });

  describe('buildUpdateMutation', () => {
    it('should build an update mutation', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'Equal',
          value: '123',
        },
      } as any;
      const patch = { name: 'Updated Name' };

      const { query, variables } = buildUpdateMutation('users', filter, patch);

      expect(query).toContain('mutation UpdateUsers');
      expect(query).toContain('update_users(where: $where, _set: $set)');
      expect(query).toContain('affected_rows');
      expect(variables.where).toEqual({ id: { _eq: '123' } });
      expect(variables.set).toEqual({ name: 'Updated Name' });
    });

    it('should filter undefined values but keep null', () => {
      const filter = {} as any;
      const patch = { name: 'Test', email: null, phone: undefined };

      const { variables } = buildUpdateMutation('users', filter, patch);

      expect(variables.set).toEqual({ name: 'Test', email: null });
    });
  });

  describe('buildDeleteMutation', () => {
    it('should build a delete mutation', () => {
      const filter = {
        conditionTree: {
          field: 'id',
          operator: 'In',
          value: ['1', '2', '3'],
        },
      } as any;

      const { query, variables } = buildDeleteMutation('users', filter);

      expect(query).toContain('mutation DeleteUsers');
      expect(query).toContain('delete_users(where: $where)');
      expect(query).toContain('affected_rows');
      expect(variables.where).toEqual({ id: { _in: ['1', '2', '3'] } });
    });
  });

  describe('buildAggregateQuery', () => {
    it('should build a count aggregation query', () => {
      const filter = {} as any;
      const aggregation = { operation: 'Count' } as any;

      const { query } = buildAggregateQuery('users', filter, aggregation);

      expect(query).toContain('query AggregateUsers');
      expect(query).toContain('users_aggregate');
      expect(query).toContain('aggregate');
      expect(query).toContain('count');
    });

    it('should build a sum aggregation query', () => {
      const filter = {} as any;
      const aggregation = { operation: 'Sum', field: 'amount' } as any;

      const { query } = buildAggregateQuery('orders', filter, aggregation);

      expect(query).toContain('orders_aggregate');
      expect(query).toContain('sum');
      expect(query).toContain('amount');
    });

    it('should include where clause for filtered aggregation', () => {
      const filter = {
        conditionTree: {
          field: 'status',
          operator: 'Equal',
          value: 'completed',
        },
      } as any;
      const aggregation = { operation: 'Count' } as any;

      const { query, variables } = buildAggregateQuery('orders', filter, aggregation);

      expect(query).toContain('$where: orders_bool_exp');
      expect(query).toContain('where: $where');
      expect(variables.where).toEqual({ status: { _eq: 'completed' } });
    });

    it('should include group by fields in nodes', () => {
      const filter = {} as any;
      const aggregation = {
        operation: 'Count',
        groups: [{ field: 'status' }],
      } as any;

      const { query } = buildAggregateQuery('orders', filter, aggregation);

      expect(query).toContain('nodes');
      expect(query).toContain('status');
    });
  });
});
