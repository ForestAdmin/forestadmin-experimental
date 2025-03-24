import { AgentOptions } from '@forestadmin/agent';
import { TSchema } from '@forestadmin/datasource-customizer';

import AgentWithOpenAPIInterface from './agent';

export type AgentWithOpenAPIInterfaceOptions = AgentOptions & { apiKeys: Array<string> };

export function createAgentWithOpenAPIInterface<S extends TSchema = TSchema>(
  options: AgentWithOpenAPIInterfaceOptions,
): AgentWithOpenAPIInterface<S> {
  return new AgentWithOpenAPIInterface(options);
}
