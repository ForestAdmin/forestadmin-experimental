import type { HttpRequester } from './http-requester';
import type { Agent, AgentOptions, TSchema } from '@forestadmin/agent';
import type { ForestSchema } from '@forestadmin/forestadmin-client/';

import fs from 'fs';

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
    httpRequester,
    port,
  }: {
    agent: Agent<TypingsSchema>;
    agentOptions: AgentOptions;
    httpRequester: HttpRequester;
    port: number;
  }) {
    super({ httpRequester });
    this.agent = agent;
    this.port = port;
    this.agentOptions = agentOptions;
  }

  async stop(): Promise<void> {
    await this.agent.stop();

    // try to remove the typings and schema files
    try {
      fs.unlinkSync(this.agentOptions.typingsPath);
      fs.unlinkSync(this.agentOptions.schemaPath);
    } catch (error) {
      /* empty */
    }
  }

  async start(): Promise<void> {
    await this.agent.mountOnStandaloneServer(this.port).start();
    this.schema = JSON.parse(fs.readFileSync(this.agentOptions.schemaPath, 'utf8'));
  }

  collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.schema);
  }
}
