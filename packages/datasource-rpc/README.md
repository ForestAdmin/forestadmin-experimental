The RPC data source allows get and proxify data from a RPC agent.

# Installation

- install the package `@forestadmin-experimental/datasource-rpc`.
- Provide the URI and the auth secret used for authentication between the RPC agent and the gateway.

```javascript
const { createAgent } = require('@forestadmin/agent');
const { createRpcDataSource } = require('@forestadmin-experimental/datasource-rpc');

const agent = createAgent(options)
  .addDataSource(
    createRpcDataSource({
      uri: 'http://localhost:3352',
      authSecret: process.env.AUTH_SECRET,
    }),
  );
```

# Deal with RPC relationship

We recommend creating a relationship between RPC agents on your gateway. However, if you want to specify the relationship in another way, you should use the provided plugin on the gateway.

```javascript
import { reconciliateRpc } from '@forestadmin-experimental/datasource-rpc';

agent.use(reconciliateRpc);
```

To be used with [markCollectionsAsRpc](../rpc-agent/README.md#deal-with-nested-rpc-data-source-and-relationship).

# Deal with disableSearch on RPC collections

Sometimes you may disable the search behavior on some collections of your RPC datasource.
If you want to do that on the RPC agent, you should use the provided plugin on the gateway.

```javascript
import { reconciliateRpc } from '@forestadmin-experimental/datasource-rpc';

agent.use(reconciliateRpc);
```

# TODOS
- [ ] handle error properly
