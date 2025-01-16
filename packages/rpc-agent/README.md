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

# Deal with nested RPC data source and relationship

Be cautious when using an RPC data source within an RPC agent. Since an RPC agent behaves similarly to a real one, a schema is created and utilized by the RPC data source. Therefore, all collections added to it should be within this schema, which can potentially cause duplication issues.

Unlike removeCollection, the markCollectionsAsRpc function removes the collection from the schema but retains the defined relationships. If you declare relationships on a collection marked as RPC, you should use [the provided plugin](../datasource-rpc/README.md#deal-with-rpc-relationship) on the gateway to perform the reconciliation.

## Examples

Given this structure:
* One RPC agent used to manage Users.
* One RPC agent used to manage Groups.
* One RPC agent used to manage Projects.
* One agent used as a gateway.

### Case 1 declaring relationship inside the gateway

Declare your relation as usual, like below:

```javascript
gateway
  .createRpcDataSource(/*from the user RPC agent*/)
  .createRpcDataSource(/*from the project RPC agent*/)
  .createRpcDataSource(/*from the group RPC agent*/)
  .customizeCollection('user', collection => {
    collection.addManyToOneRelation('group', 'group', {
      foreignKey: 'group_id',
    });
  })
  .customizeCollection('project', collection => {
    collection.addManyToOneRelation('group', 'group', {
      foreignKey: 'group_id',
    });
  })
  .customizeCollection('group', collection => {
    collection
      .addOneToManyRelation('users', 'user', {
        originKey: 'group_id',
      })
      .addOneToManyRelation('projects', 'project', {
        originKey: 'group_id',
      });
  });
```

### Case 2 using RPC datasource inside RPC agent

You combine data source before using it on the gateway.
In this exemple you don't use group agent on several places, only on the user agent.
Here there is no need to use `markCollectionsAsRpc`, like below:

```javascript
/* define user agent and use group agent as a RPC data source
* define some relationship between both data source
*/
userAgent
  .createcreateSqlDataSource(...)
  .createRpcDataSource(/*from the group RPC agent*/)
  .customizeCollection('user', collection => {
    collection.addManyToOneRelation('group', 'group', {
      foreignKey: 'group_id',
    });
  })
  .customizeCollection('group', collection => {
    collection.addOneToManyRelation('users', 'user', {
      originKey: 'group_id',
    });
  });

/* define the gateway and use agragated agent
* all collection and relationship defined in the user agent will be import as a datasource
*/
gateway
  .createRpcDataSource(/*from the user RPC agent*/)
  .createRpcDataSource(/*from the project RPC agent*/)
```

### Case 2 declaring relationship between RPC datasource on a RPC agent

You have complexe datasource relationship and usage, see below how to use `markCollectionsAsRpc` and the `generateRpcRelations` plugin.

```javascript
/* define user agent and use group agent as a RPC data source
* define some relationship between both data source
*/
userAgent
  .createcreateSqlDataSource(...)
  .createRpcDataSource(/*from the group RPC agent*/)
  .customizeCollection('user', collection => {
    collection.addManyToOneRelation('group', 'group', {
      foreignKey: 'group_id',
    });
  })
  .customizeCollection('group', collection => {
    collection.addOneToManyRelation('users', 'user', {
      originKey: 'group_id',
    });
  })
  .markCollectionsAsRpc('group');

/* define project agent and use group agent as a RPC data source
* define some relationship between both data source
*/
projectAgent
  .createcreateSqlDataSource(...)
  .createRpcDataSource(/*from the group RPC agent*/)
  .customizeCollection('project', collection => {
    collection.addManyToOneRelation('group', 'group', {
      foreignKey: 'group_id',
    });
  })
  .customizeCollection('group', collection => {
    collection.addOneToManyRelation('projects', 'project', {
      originKey: 'group_id',
    });
  })
  .markCollectionsAsRpc('group');

// define the gateway 
gateway
  .createRpcDataSource(/*from the user RPC agent*/)
  .createRpcDataSource(/*from the project RPC agent*/)
  .createRpcDataSource(/*from the group RPC agent*/)
  .use(generateRpcRelations);
```
