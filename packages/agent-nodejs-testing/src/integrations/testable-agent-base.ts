import Benchmark from './benchmark';
import RemoteControlAgent from '../remote-control-agent/domains/remote-controle-agent';

export default class TestableAgentBase extends RemoteControlAgent {
  benchmark(): Benchmark {
    return new Benchmark();
  }
}
