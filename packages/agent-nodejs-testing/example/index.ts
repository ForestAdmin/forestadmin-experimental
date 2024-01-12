import { Agent } from '@forestadmin/agent';
import { createSqlDataSource } from '@forestadmin/datasource-sql';

import { createTestableAgent } from '../src';
import TestableAgent from '../src/integrations/testable-agent';

export default async function startTestableAgent(
  customizer: (agent: Agent) => void,
  storage: string,
): Promise<TestableAgent> {
  const testableAgent = await createTestableAgent();
  testableAgent.agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage }));

  customizer(testableAgent.agent);

  await testableAgent.start();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return testableAgent as never as TestableAgent;
}
