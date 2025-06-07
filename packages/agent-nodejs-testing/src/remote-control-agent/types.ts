import { PlainFilter, PlainSortClause } from '@forestadmin/datasource-toolkit';

export type SelectOptions = {
  filters?: PlainFilter;
  sort?: PlainSortClause;
  search?: string;
};
