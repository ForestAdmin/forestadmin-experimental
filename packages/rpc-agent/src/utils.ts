import ConditionTreeParser from '@forestadmin/agent/dist/utils/condition-tree-parser';
import {
  Caller,
  Collection,
  Filter,
  Page,
  PaginatedFilter,
  PlainFilter,
  PlainPaginatedFilter,
  Sort,
} from '@forestadmin/datasource-toolkit';

function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase();
}

function cameliseKeys(obj: any) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const newKey = toCamelCase(key);
    acc[newKey] = value;

    return acc;
  }, {});
}

export function keysToSnake(obj: any) {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToSnake(v));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const newKey = toSnakeCase(key);
      acc[newKey] = keysToSnake(value);

      return acc;
    }, {});
  }

  return obj;
}

export function transformFilteroperator(filterOperators: Set<string>): string[] {
  return Array.from(filterOperators).map(toSnakeCase);
}

export function parseCaller(context: any): Caller {
  const caller = JSON.parse((context.headers.forest_caller as string) || '{}');

  return cameliseKeys(caller) as Caller;
}

export function parseFilter(collection: Collection, queryFilter: any): Filter {
  const filter = cameliseKeys(queryFilter || {}) as PlainFilter;

  return new Filter({
    ...filter,
    conditionTree: filter?.conditionTree
      ? ConditionTreeParser.fromPlainObject(collection, filter.conditionTree)
      : undefined,
  });
}

export function parsePaginatedFilter(collection: Collection, queryFilter: any): PaginatedFilter {
  const filter = cameliseKeys(queryFilter) as PlainPaginatedFilter;

  return new PaginatedFilter({
    ...filter,
    conditionTree: filter?.conditionTree
      ? ConditionTreeParser.fromPlainObject(collection, filter.conditionTree)
      : undefined,
    sort: filter?.sort ? new Sort(...filter.sort) : undefined,
    page: filter?.page ? new Page(filter.page.skip, filter.page.limit) : undefined,
  });
}
