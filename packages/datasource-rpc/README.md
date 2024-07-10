The RPC data source allows get and proxify data from a RPC agent.

# Installation

- install the package `@forestadmin-experimental/datasource-rpc`.
- give the URI, FOREST_ENV_SECRET & FOREST_AUTH_SECRET

```javascript
const { createAgent } = require('@forestadmin/agent');
const { createRpcDataSource } = require('@forestadmin-experimental/datasource-rpc');

const agent = createAgent(options).addDataSource(
  createRpcDataSource({
    uri: 'http://localhost:3352',
    authSecret: process.env.FOREST_AUTH_SECRET,
    envSecret: process.env.FOREST_ENV_SECRET,
  }),
);
```
