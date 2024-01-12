import { Agent } from '@forestadmin/agent';
// eslint-disable-next-line import/no-extraneous-dependencies
import { createSqlDataSource } from '@forestadmin/datasource-sql';

import { createTestableAgent } from '../src';
import TestableAgent from '../src/integrations/testable-agent';

// this function is used to start the testable agent and add a data source for the tests
// In your case, you should probably pass all your customizations as parameters
export default async function startTestableAgent(
  customizer: (agent: Agent) => void,
  storage: string,
): Promise<TestableAgent> {
  const testableAgent = await createTestableAgent();
  testableAgent.agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage }));

  customizer(testableAgent.agent);

  await testableAgent.start();

  return testableAgent;
}
