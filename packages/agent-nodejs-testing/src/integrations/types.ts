import { AgentOptions } from '@forestadmin/agent';
import { PlainFilter, PlainSortClause } from '@forestadmin/datasource-toolkit';

export type TestableBaseOptions = {
  filters?: PlainFilter;
  sort?: PlainSortClause;
  search?: string;
};

export type TestableAgentOptions = AgentOptions & { port?: number };
