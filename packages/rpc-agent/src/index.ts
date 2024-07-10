import { AgentOptions } from '@forestadmin/agent';
import { TSchema } from '@forestadmin/datasource-customizer';

import RpcAgent from './agent';

// eslint-disable-next-line import/prefer-default-export
export function createRpcAgent<S extends TSchema = TSchema>(options: AgentOptions): RpcAgent<S> {
  return new RpcAgent(options);
}
