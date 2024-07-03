import { AgentOptions } from '@forestadmin/agent';
import { TSchema } from '@forestadmin/datasource-customizer';

import RpcAgent from './agent';

export function createRpcAgent<S extends TSchema = TSchema>(options: AgentOptions): RpcAgent<S> {
  return new RpcAgent(options);
}
