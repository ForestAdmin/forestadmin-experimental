import type { TSchema } from '@forestadmin/agent';

import Benchmark from './benchmark';
import RemoteControlAgent from '../remote-agent-client/domains/remote-agent-client';

export default class TestableAgentBase<
  TypingsSchema extends TSchema = TSchema,
> extends RemoteControlAgent<TypingsSchema> {
  benchmark(): Benchmark {
    return new Benchmark();
  }
}
