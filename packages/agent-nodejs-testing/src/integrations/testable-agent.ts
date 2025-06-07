import type { Agent, TSchema } from '@forestadmin/agent';

import fs from 'fs/promises';

import { createHttpRequester } from './http-requester-mock';
import { SchemaPathManager, TestableAgentOptions } from './index';
import SchemaConverter from './schema-converter';
import TestableCollection from './testable-collection';
import RemoteControlAgent from '../remote-control-agent/domains/remote-controle-agent';

export default class TestableAgent<
  TypingsSchema extends TSchema = TSchema,
> extends RemoteControlAgent<TypingsSchema> {
  private readonly agent: Agent<TypingsSchema>;
  private readonly agentOptions: TestableAgentOptions;

  constructor({
    agent,
    agentOptions,
  }: {
    agent: Agent<TypingsSchema>;
    agentOptions: TestableAgentOptions;
  }) {
    super();
    this.agent = agent;
    this.agentOptions = agentOptions;
  }

  async stop(): Promise<void> {
    await this.agent.stop();

    await SchemaPathManager.removeTemporarySchemaPath(this.agentOptions.schemaPath);
  }

  async start(): Promise<void> {
    await this.agent.mountOnStandaloneServer(this.agentOptions.port ?? 0).start();
    if (!this.agentOptions.schemaPath) throw new Error('schemaPath is required');
    this.actionEndpoints = SchemaConverter.extractActionEndpoints(
      JSON.parse(await fs.readFile(this.agentOptions.schemaPath, 'utf8')),
    );
    this.httpRequester = createHttpRequester({
      url: `http://localhost:${this.agent.standaloneServerPort}`,
      authSecret: this.agentOptions.authSecret,
    });
  }

  override collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.actionEndpoints);
  }
}
