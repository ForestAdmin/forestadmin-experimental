import { AgentOptions, TSchema, createAgent } from '@forestadmin/agent';

import ForestAdminClientMock from './forest-admin-client-mock';
import { createHttpRequester } from './http-requester';
import TestableAgent from './testable-agent';

// eslint-disable-next-line import/export
export * from './testable-agent';
export { AgentOptions, Agent } from '@forestadmin/agent';
export * from './types';

export async function createTestableAgent<TypingsSchema extends TSchema = TSchema>(
  options?: AgentOptions,
  port = 9997,
): Promise<TestableAgent<TypingsSchema>> {
  const agentOptions: AgentOptions = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logger: () => {},
    typingsPath: 'typings-test.ts',
    schemaPath: 'schema-test.json',
    ...options,
    forestAdminClient: new ForestAdminClientMock(),
    authSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
    envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
  };

  const agent = createAgent<TypingsSchema>(agentOptions);
  if (!agent) throw new Error('Agent is not defined');

  const httpRequester = await createHttpRequester({ agentOptions, port });

  return new TestableAgent<TypingsSchema>({ agent, httpRequester, agentOptions, port });
}
