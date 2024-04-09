import type { Agent, AgentOptions, TSchema } from '@forestadmin/agent';
import type { ForestSchema } from '@forestadmin/forestadmin-client/';

import fs from 'fs/promises';

import Benchmark from './benchmark';
import { createHttpRequester } from './http-requester';
import TestableChart from './testable-chart';
import TestableCollection from './testable-collection';

/**
 * This class can be used to do integration tests on an agent.
 */
export default class TestableAgent<TypingsSchema extends TSchema = TSchema> extends TestableChart {
  private readonly agent: Agent<TypingsSchema>;
  private schema?: ForestSchema;
  private readonly port: number;
  private readonly agentOptions: AgentOptions;

  constructor({
    agent,
    agentOptions,
    port,
  }: {
    agent: Agent<TypingsSchema>;
    agentOptions: AgentOptions;
    port: number;
  }) {
    const httpRequester = createHttpRequester({ agentOptions, port });
    super({ httpRequester });
    this.agent = agent;
    this.port = port;
    this.agentOptions = agentOptions;
  }

  async stop(): Promise<void> {
    await this.agent.stop();
    if (this.agentOptions.typingsPath) await fs.rm(this.agentOptions.typingsPath, { force: true });
    if (this.agentOptions.schemaPath) await fs.rm(this.agentOptions.schemaPath, { force: true });
  }

  async start(): Promise<void> {
    await this.agent.mountOnStandaloneServer(this.port).start();
    if (!this.agentOptions.schemaPath) throw new Error('schemaPath is required');

    this.schema = JSON.parse(await fs.readFile(this.agentOptions.schemaPath, 'utf8'));
  }

  collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.schema);
  }

  benchmark(): Benchmark {
    return new Benchmark();
  }
}
