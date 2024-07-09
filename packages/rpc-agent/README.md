The RPC agent is created to split your data into microservice, combined with a real agent and a RPC data source,
you wil be able to acces all your collection as this is a normal agent.

# Installation

- install the package `@forestadmin-experimental/rpc-agent`.
- give options like a real agent.

```javascript
const { createRpcAgent } = require('@forestadmin-experimental/rpc-agent');

const agent = createRpcAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
  loggerLevel: 'Info',
});
// use the agent like a real one.
```
