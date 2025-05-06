## Installation

```
npm install @forestadmin-experimental/openapi-agent
```
on an existing forestadmin project.

Then, replace the `import { createAgent } from @forestadmin/agent`  by

```
import { createAgentWithOpenAPIInterface } from '@forestadmin-experimental/openapi-agent';
```

Then, change your `createAgent<Schema>(...)` to `createAgentWithOpenAPIInterface<Schema>(...)`

Finally, add your own API Keys in the options,

```
{
    authSecret: process.env.FOREST_AUTH_SECRET!,
    envSecret: process.env.FOREST_ENV_SECRET!,

    isProduction: process.env.NODE_ENV === 'production',
    schemaPath: `${__dirname}/.forestadmin-schema.json`,
    typingsPath: './typings.ts',
    typingsMaxDepth: 5,
    apiKeys: ['secret', 'any_api_key_you_want'],
  }
```

And you're all set. Agent should start and work normally.

## Integration with ChatGPT

Access your agent via

`https://<any-remote-url-matching-your-agent>/forest/mcp/openapi.json`

This will display the complete OpenAPI.json contract.

As ChatGPT is restricted to 30 tools max, you may need to exclude some collections, using the following as an example:

`?exclude=mfa_user_factors,mfa_procedures,untitled_table`

Then, on the ChatGPT UI:

- Click on "Explore GPT's"
- Click on "Create" 
- At the bottom of the screen, click on "Create a new action"
- Configure Authentication using "Personnalized API Key". Header name is "x_api_key", header value is one of the value you specified in `apiKeys: ['secret', 'any_api_key_you_want'],`, then validate.
- Click on "Import URL", then use the URL crafted previously to retrieve the openapi contract.

You should then be able to test on the right side that OpenAI is able to contact the agent.

## Integration with Claude

(Still WIP)

- Download as JSON the OpenAPI contract
- In your Claude MCP server configuration, add the following:
```
    "openapi-2-mcp-fa": {
      "args": [
        "-c",
        "source /<path to your source file>/.zshrc; npx -y openapi-mcp-server@1.1.0 /<path to the contract>/contract.json"
      ],
      "command": "zsh",
      "env": {
        "OPENAPI_MCP_HEADERS": "{\"x_api_key\": \"<secret defined in the first part>\"}"
      }
    },
```

**Notice the `<path to your source file>` part of the configuration. Claude sometimes embed a NodeJS installation along with it's executable, that seems to be incompatible with most of the MCP servers I tried.). To make sure Claude uses the same version of nodejs as you, source your main zsh/bash/... file here.**

Restart the Claude app and after a while, you should notice a small chain icon indicating that the MCP server is up-and-running.

## Notes (And possible evolutions)

The base mecanism just re-use the rpc-agent - allowing to expose the route with an API KEY based authentication instead of the classic authentication flow. The main difference is in `openapi.ts` - which contains the openapi definition of the RPC Agent routes.
This agent simply expose a `/openapi.json` route, which can be plugged via ChatGPT or via `openapi-mcp-server` to expose a fully functionnal MCP Server.

- Currently, the integration don't support actions, collections charts, and datasources charts as well. However, complete CRUD & aggregation interface should be available.
- Pre-prompt/System prompt may be used to fix discrepency in the actual tool use generation. Here's the one I'm currently using:
```
You are an assistant with access to a third party application called Forest Admin.
You have access to a set of tools that allow you to create/read/update/delete/aggregate/trigger actions on this Forest Admin tool.

Be sure to fully read and understand the provided openapi.json schema.
When using the tools, make sure parameters are correct.
Example:
- When you use the create function, make sure you don't send "id" or any primary key values.
- When asked to create a distribution chart that doesn't imply dates, make sure you don't send groups.operation in the aggregate tool.
- On list, can you make sure sort & page are embbeded inside the filter.
```
- This integration is a WIP, so it's highly suggested not to use it on a production environment. This integration is able to create/update and delete one of multiple tables content.

## Todos

- [] Find a way to deal with the authentication/Caller issue. Currently, caller is emulated and filled at runtime
- [] Handle read/read-write mode, along with an actual Caller implementation
- [] Handle actions
- [] Base filter/paginated filter on the actual agent capabilities
- [] Implement deep ConditionTree component to use actual field name instead of strings
- [] Integration tests, as some AI providers are still able to generate invalid requests