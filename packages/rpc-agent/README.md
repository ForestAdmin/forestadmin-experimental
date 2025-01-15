The RPC agent is created to split your data into microservice, combined with a real agent and a RPC data source,
you wil be able to acces all your collection as this is a normal agent.

# Installation

- install the package `@forestadmin-experimental/rpc-agent`.
- give options like a real agent.

```javascript
const { createRpcAgent } = require('@forestadmin-experimental/rpc-agent');

const agent = createRpcAgent({
  authSecret: process.env.AUTH_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
  loggerLevel: 'Info',
});
// use the agent like a real one.
```

# Deal with nested RPC datas ource

Be careful when you want to use RPC data source inside an RPC agent.
Two solution:
* you want to combine data sources before use it to the gateway agent, and you not use the imported data source anywhere.
  
  => No action is need use agent and data source as usual.

* you want to use an RPC data source at several places and declare relationship on it.

  => use `markCollectionsAsRpc` function
  ```javascript
  agent.createRpcDataSource({
    uri: 'http://localhost:3352',
    authSecret: process.env.AUTH_SECRET,
  })
  .markCollectionsAsRpc('user', 'group');
  ```
