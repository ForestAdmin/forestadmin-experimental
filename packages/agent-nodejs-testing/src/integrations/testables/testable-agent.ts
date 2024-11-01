import type { Agent, TSchema } from '@forestadmin/agent';

import fs from 'fs/promises';

import TestableAgentBase from './testable-agent-base';
import SchemaPathManager from '../schema-path-manager';
import { TestableAgentOptions } from '../types';

export default class TestableAgent<
  TypingsSchema extends TSchema = TSchema,
> extends TestableAgentBase {
  private readonly agent: Agent<TypingsSchema>;

  constructor({
    agent,
    agentOptions,
  }: {
    agent: Agent<TypingsSchema>;
    agentOptions: TestableAgentOptions;
  }) {
    super({ agentOptions });
    this.agent = agent;
  }

  async stop(): Promise<void> {
    await this.agent.stop();

    if (SchemaPathManager.isTemporarySchemaPath(this.agentOptions.schemaPath)) {
      await fs.rm(this.agentOptions.schemaPath, { force: true });
    }
  }

  async start(): Promise<void> {
    await this.agent.mountOnStandaloneServer(this.agentOptions.port).start();
    this.agentOptions.port = this.agent.standaloneServerPort;
    if (!this.agentOptions.schemaPath) throw new Error('schemaPath is required');

    this.schema = JSON.parse(await fs.readFile(this.agentOptions.schemaPath, 'utf8'));
  }
}
