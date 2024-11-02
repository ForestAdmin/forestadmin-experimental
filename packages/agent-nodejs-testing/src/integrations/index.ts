import { Agent, TSchema, createAgent } from '@forestadmin/agent';
import { ForestSchema } from '@forestadmin/forestadmin-client';
import fs from 'fs';

import ForestAdminClientMock from './forest-admin-client-mock';
import ForestServerSandbox from './forest-server-sandbox';
import SchemaPathManager from './schema-path-manager';
import TestableAgent from './testables/testable-agent';
import TestableAgentBase from './testables/testable-agent-base';
import { TestableAgentOptions } from './types';

export { AgentOptions, Agent } from '@forestadmin/agent';
export * from './types';

export { SchemaPathManager, ForestServerSandbox, TestableAgent };
export type ForestClient = TestableAgentBase;

export default async function createForestServerSandbox(options: {
  port?: number;
  agentSchemaPath: string;
}): Promise<ForestServerSandbox> {
  return new ForestServerSandbox(options).createServer();
}

export function createForestClient(options: {
  agentAuthSecret: string;
  agentUrl: string;
  agentSchemaPath: string;
}): ForestClient {
  const { agentAuthSecret, agentUrl, agentSchemaPath } = options;
  let schema: ForestSchema;

  try {
    schema = JSON.parse(fs.readFileSync(agentSchemaPath, { encoding: 'utf-8' }));
  } catch (e) {
    throw new Error('Provide a right schema path');
  }

  const testableAgent = new TestableAgentBase({ authSecret: agentAuthSecret });
  testableAgent.init({ schema, url: agentUrl });

  return testableAgent;
}

export async function createTestableAgent<TypingsSchema extends TSchema = TSchema>(
  customizer: (agent: Agent<TypingsSchema>) => void,
  options?: TestableAgentOptions,
): Promise<TestableAgent<TypingsSchema>> {
  const agentOptions = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logger: () => {},
    schemaPath: SchemaPathManager.generateTemporarySchemaPath(),
    isProduction: false,
    ...(options || {}),
    // 0 is a random port
    port: options?.port || 0,
    forestAdminClient: new ForestAdminClientMock(),
    authSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
    envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
  };

  const agent = createAgent<TypingsSchema>(agentOptions);
  if (!agent) throw new Error('Agent is not defined');

  customizer(agent);

  return new TestableAgent<TypingsSchema>({ agent, agentOptions });
}
