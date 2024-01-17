import type { HttpRequester } from './http-requester';
import type { Agent, AgentOptions, TSchema } from '@forestadmin/agent';
import type { ForestSchema } from '@forestadmin/forestadmin-client/';

import fs from 'fs';

import TestableCollection from './testable-collection';

/**
 * This class can be used to do integration tests on an agent.
 */
export default class TestableAgent<TypingsSchema extends TSchema = TSchema> {
  private readonly agent: Agent<TypingsSchema>;

  private schema?: ForestSchema;

  private readonly httpRequester: HttpRequester;

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
    this.agent = agent;
    this.httpRequester = httpRequester;
    this.port = port;
    this.agentOptions = agentOptions;
  }

  async stop(): Promise<void> {
    await this.agent.stop();
  }

  async start(): Promise<void> {
    await this.agent.mountOnStandaloneServer(this.port).start();
    this.schema = JSON.parse(fs.readFileSync(this.agentOptions.schemaPath, 'utf8'));
  }

  collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.schema);
  }

  dashboardChart<Data = unknown>(chartName: string): Promise<Data> {
    return this.httpRequester.query<Data>({
      method: 'get',
      path: `/forest/_charts/${chartName}`,
    });
  }
}