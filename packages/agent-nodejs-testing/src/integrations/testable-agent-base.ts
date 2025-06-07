import type { TSchema } from '@forestadmin/agent';

import Benchmark from './benchmark';
import RemoteControlAgent from '../remote-control-agent/domains/remote-controle-agent';

export default class TestableAgentBase<
  TypingsSchema extends TSchema = TSchema,
> extends RemoteControlAgent<TypingsSchema> {
  benchmark(): Benchmark {
    return new Benchmark();
  }
}
