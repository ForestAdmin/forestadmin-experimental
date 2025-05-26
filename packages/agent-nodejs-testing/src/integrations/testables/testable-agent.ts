import type { Agent, TSchema } from '@forestadmin/agent';

import fs from 'fs/promises';

import TestableAgentBase from './testable-agent-base';
import { createHttpRequester } from '../http-requester';
import SchemaConverter from '../schema-converter';
import SchemaPathManager from '../schema-path-manager';
import { TestableAgentOptions } from '../types';

export default class TestableAgent<
  TypingsSchema extends TSchema = TSchema,
> extends TestableAgentBase {
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

    this.init({
      actionEndpoints: SchemaConverter.extractActionEndpoints(
        JSON.parse(await fs.readFile(this.agentOptions.schemaPath, 'utf8')),
      ),
      httpRequester: createHttpRequester({
        url: `http://localhost:${this.agent.standaloneServerPort}`,
        authSecret: this.agentOptions.authSecret,
      }),
    });
  }
}
