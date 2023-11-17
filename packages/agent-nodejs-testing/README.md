# Agent Node JS Testing Library

This library provides a set of utilities for testing Node JS agents.
It's only available for [Node JS agents](https://docs.forestadmin.com/developer-guide-agents-nodejs/).

It is in alpha version and is subject to breaking changes.
For the moment, it only provides an incomplete set of utilities for integration and unit testing, but it will be
extended in the future.

## Installation

```bash
npm install @forestadmin-experimental/agent-nodejs-testing
```

or for Yarn users:

```bash
yarn add @forestadmin-experimental/agent-nodejs-testing
```

# Integration Tests

# Setup

```javascript
const { createTestableAgent } = require('@forestadmin-experimental/agent-nodejs-testing');

// customizations to apply to your agent
export function addAgentCustomizations(agent) {
  agent.addDataSource(createSequelizeDataSource(connection));
};

// setup and start a testable agent
export async function setupAndStartTestableAgent() {
  // if you have a database, or a server to start, do it here
  // ...
  
  // create a testable agent
  const testableAgent = await createTestableAgent();

  // apply all the customizations to the testable agent
  addAgentCustomizations(testableAgent.agent);

  // start the testable agent
  await testableAgent.start();

  return testableAgent;
}
```

# Usage

```javascript
describe('billing collection', () => {
  let agent;

  beforeAll(async () => {
    agent = await setupAndStartTestableAgent();
  });

  afterAll(async () => {
    await agent?.stop();
  });

  it('should return all the records of the billing collection', async () => {
    // create records in the database
    // ...

    // call the billing collection from the agent to get the records
    const result = await agent.collection('billing').list();

    // check the result
    expect(result).toHaveLength(2);
  });
});
```

# Unit Tests

WIP
