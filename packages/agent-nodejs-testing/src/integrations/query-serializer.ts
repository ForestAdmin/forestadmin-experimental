import type { TestableBaseOptions } from './types';
import type { PlainFilter } from '@forestadmin/datasource-toolkit';
import type { PlainSortClause } from '@forestadmin/datasource-toolkit/dist/src/interfaces/query/sort';

export default class QuerySerializer {
  static serialize(query: TestableBaseOptions): Record<string, unknown> | null {
    return query
      ? {
          ...query,
          ...query.filters,
          sort: QuerySerializer.formatSort(query.sort),
          filters: QuerySerializer.formatFilters(query.filters),
        }
      : null;
  }

  private static formatSort(sort: PlainSortClause): string {
    if (!sort) return undefined;

    return sort.ascending ? sort.field : `-${sort.field}`;
  }

  private static formatFilters(filters: PlainFilter): string {
    if (!filters) return undefined;

    return JSON.stringify(filters.conditionTree);
  }
}
