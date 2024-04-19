import { Agent, TSchema, createAgent } from '@forestadmin/agent';

import ForestAdminClientMock from './forest-admin-client-mock';
import getAvailablePort from './get-port';
import SchemaPathManager from './schema-path-manager';
import TestableAgent from './testables/testable-agent';
import { TestableAgentOptions } from './types';

export { TestableAgent };
export { AgentOptions, Agent } from '@forestadmin/agent';
export * from './types';

export async function createTestableAgent<TypingsSchema extends TSchema = TSchema>(
  customizer: (agent: Agent<TypingsSchema>) => void,
  options?: TestableAgentOptions,
): Promise<TestableAgent<TypingsSchema>> {
  const port = options?.port || (await getAvailablePort());

  const agentOptions = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logger: () => {},
    schemaPath: SchemaPathManager.generateSchemaPath(port),
    isProduction: false,
    ...(options || {}),
    port,
    forestAdminClient: new ForestAdminClientMock(),
    authSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
    envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
  };

  const agent = createAgent<TypingsSchema>(agentOptions);
  if (!agent) throw new Error('Agent is not defined');

  customizer(agent);

  return new TestableAgent<TypingsSchema>({ agent, agentOptions });
}
