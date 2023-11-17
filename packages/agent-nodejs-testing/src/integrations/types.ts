import { PlainFilter, PlainSortClause } from '@forestadmin/datasource-toolkit';

export type TestableBaseOptions = {
  filters?: PlainFilter;
  sort?: PlainSortClause;
};

export type ValueChartResponse = { countCurrent: string; countPrevious: string; };
