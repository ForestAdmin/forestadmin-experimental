import { AgentOptions } from '@forestadmin/agent';
import { TSchema } from '@forestadmin/datasource-customizer';
import * as crypto from 'crypto';

import RpcAgent from './agent';

export type RpcAgentOptions = Omit<
  AgentOptions,
  'envSecret' | 'instantCacheRefresh' | 'forestAdminClient'
>;

export function createRpcAgent<S extends TSchema = TSchema>(options: RpcAgentOptions): RpcAgent<S> {
  return new RpcAgent({
    ...options,
    envSecret: crypto.randomBytes(32).toString('hex'),
    instantCacheRefresh: false,
    forestAdminClient: null,
  });
}
