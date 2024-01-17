import { AgentOptions } from '@forestadmin/agent';
import { PlainFilter, PlainSortClause } from '@forestadmin/datasource-toolkit';

export type TestableBaseOptions = {
  filters?: PlainFilter;
  sort?: PlainSortClause;
};

export type ValueChartResponse = { countCurrent: string; countPrevious: string };

export type TestableAgentOptions = AgentOptions & { port?: number };
