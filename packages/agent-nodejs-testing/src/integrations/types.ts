import { AgentOptions } from '@forestadmin/agent';
import { PlainFilter, PlainSortClause } from '@forestadmin/datasource-toolkit';

export type TestableBaseOptions = {
  filters?: PlainFilter;
  sort?: PlainSortClause;
};

export type TestableAgentOptions = AgentOptions & { port?: number };
