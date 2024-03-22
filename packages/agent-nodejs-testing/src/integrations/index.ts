import { Agent, AgentOptions, TSchema, createAgent } from '@forestadmin/agent';

import ForestAdminClientMock from './forest-admin-client-mock';
import getAvailablePort from './get-port';
import { createHttpRequester } from './http-requester';
import TestableAgent from './testable-agent';
import { TestableAgentOptions } from './types';

export { TestableAgent };
export { AgentOptions, Agent } from '@forestadmin/agent';
export * from './types';

export async function createTestableAgent<TypingsSchema extends TSchema = TSchema>(
  customizer: (agent: Agent<TypingsSchema>) => void,
  options?: TestableAgentOptions,
): Promise<TestableAgent<TypingsSchema>> {
  const port = options?.port || (await getAvailablePort());
  // We don't want to pass the port to the agent because the port is not a valid agent option
  delete options?.port;

  const agentOptions: AgentOptions = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logger: () => {},
    typingsPath: `/tmp/typings-test-${port}.ts`,
    schemaPath: `/tmp/schema-test-${port}.json`,
    ...options,
    forestAdminClient: new ForestAdminClientMock(),
    authSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
    envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
  };

  const agent = createAgent<TypingsSchema>(agentOptions);
  if (!agent) throw new Error('Agent is not defined');

  customizer(agent);

  const httpRequester = await createHttpRequester({ agentOptions, port });

  return new TestableAgent<TypingsSchema>({ agent, httpRequester, agentOptions, port });
}
