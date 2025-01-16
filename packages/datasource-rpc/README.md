The RPC data source allows get and proxify data from a RPC agent.

# Installation

- install the package `@forestadmin-experimental/datasource-rpc`.
- Provide the URI and the auth secret used for authentication between the RPC agent and the gateway.

```javascript
const { createAgent } = require('@forestadmin/agent');
const { createRpcDataSource } = require('@forestadmin-experimental/datasource-rpc');

const agent = createAgent(options).addDataSource(
  createRpcDataSource({
    uri: 'http://localhost:3352',
    authSecret: process.env.AUTH_SECRET,
  }),
);
```

# Deal with RPC relationship

We preconize creating relationship between RPC agents on your gateway.
But if you want to specify relationship in another way, you should use the given plugin on the gateway.

```javascript
import { generateRpcRelations } from '@forestadmin-experimental/datasource-rpc';

agent.use(generateRpcRelations);
```

To be used with [markCollectionsAsRpc](../rpc-agent/README.md#deal-with-nested-rpc-data-source-and-relationship).
