import type { Agent, TSchema } from '@forestadmin/agent';
import type { ForestSchema } from '@forestadmin/forestadmin-client/';

import fs from 'fs/promises';

import Benchmark from './benchmark';
import { createHttpRequester } from './http-requester';
import SchemaPathManager from './schema-path-manager';
import TestableChart from './testable-chart';
import TestableCollection from './testable-collection';
import { TestableAgentOptions } from './types';

/**
 * This class can be used to do integration tests on an agent.
 */
export default class TestableAgent<TypingsSchema extends TSchema = TSchema> extends TestableChart {
  private readonly agent: Agent<TypingsSchema>;
  private schema?: ForestSchema;
  private readonly agentOptions: TestableAgentOptions;

  constructor({
    agent,
    agentOptions,
  }: {
    agent: Agent<TypingsSchema>;
    agentOptions: TestableAgentOptions;
  }) {
    const httpRequester = createHttpRequester({ agentOptions });
    super({ httpRequester });
    this.agent = agent;
    this.agentOptions = agentOptions;
  }

  async stop(): Promise<void> {
    await this.agent.stop();

    if (SchemaPathManager.isTemporarySchemaPath(this.agentOptions.schemaPath)) {
      await fs.rm(this.agentOptions.schemaPath, { force: true });
    }
  }

  async start(): Promise<void> {
    await this.agent.mountOnStandaloneServer(this.agentOptions.port).start();
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
