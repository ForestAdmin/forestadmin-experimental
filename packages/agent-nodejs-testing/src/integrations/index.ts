import { Agent, TSchema, createAgent } from '@forestadmin/agent';
import { ForestSchema } from '@forestadmin/forestadmin-client';
import {
  EnvironmentCollectionAccessPermissionsV4,
  EnvironmentCollectionPermissionsV4,
  EnvironmentPermissionsV4Remote,
  EnvironmentSmartActionPermissionsV4,
} from '@forestadmin/forestadmin-client/dist/permissions/types';
import fs from 'fs/promises';
import * as http from 'node:http';
import { readFileIfExisting } from 'nx/src/utils/fileutils';

import ForestAdminClientMock, { CURRENT_USER } from './forest-admin-client-mock';
import SchemaPathManager from './schema-path-manager';
import TestableAgent from './testables/testable-agent';
import TestableAgentBase from './testables/testable-agent-base';
import { TestableAgentOptions } from './types';

export { TestableAgent };
export { AgentOptions, Agent } from '@forestadmin/agent';
export * from './types';

function transformForestSchemaToEnvironmentPermissionsV4Remote(
  schema: ForestSchema,
): EnvironmentPermissionsV4Remote {
  return {
    collections: schema.collections.reduce((collectionAcc, collection) => {
      collectionAcc[collection.name] = {
        collection: {
          browseEnabled: true,
          deleteEnabled: true,
          editEnabled: true,
          exportEnabled: true,
          addEnabled: true,
          readEnabled: true,
        } as EnvironmentCollectionAccessPermissionsV4,
        actions: collection.actions.reduce((actionAcc, action) => {
          actionAcc[action.name] = {
            approvalRequired: true,
            userApprovalEnabled: true,
            selfApprovalEnabled: true,
            triggerEnabled: true,
            triggerConditions: [],
            userApprovalConditions: [],
            approvalRequiredConditions: [],
          } as EnvironmentSmartActionPermissionsV4;

          return actionAcc;
        }, {}),
      } as EnvironmentCollectionPermissionsV4;

      return collectionAcc;
    }, {}),
  };
}

export async function createForestServerSandbox(options: {
  port?: number;
  agentSchemaPath: string;
}): Promise<{ port: number; stop: () => Promise<void> }> {
  const { port, agentSchemaPath } = options;
  const server = http.createServer((req, res) => {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (req.url === '/liana/v1/ip-whitelist-rules') {
        res.end(JSON.stringify({ data: { attributes: { use_ip_whitelist: false, rules: [] } } }));
      } else if (req.url === '/liana/v4/permissions/environment') {
        const schema = JSON.parse(readFileIfExisting(agentSchemaPath));
        const permissionsV4 = transformForestSchemaToEnvironmentPermissionsV4Remote(schema);
        res.end(JSON.stringify(permissionsV4));
      } else if (req.url === '/liana/v4/permissions/users') {
        res.end(JSON.stringify([CURRENT_USER]));
      } else if (req.url?.startsWith('/liana/v4/permissions/renderings/')) {
        res.end(
          JSON.stringify({
            team: { id: 1, name: 'admin' },
            collections: {},
            stats: [],
          }),
        );
      } else if (req.url === '/liana/model-customizations') {
        res.end(JSON.stringify({}));
      } else if (req.url === '/forest/apimaps/hashcheck') {
        res.end(JSON.stringify({ sendSchema: false }));
      } else if (req.url === '/forest/apimaps') {
        res.end(JSON.stringify({}));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } catch (error) {
      console.error('Error handling request:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });

  const fakeForestServer: http.Server = await new Promise((resolve, reject) => {
    server.listen(port ?? 0, () => resolve(server));
    server.on('error', error => {
      console.error('Server error:', error);
      reject(error);
    });
  });
  const address = fakeForestServer.address() as { port: number };

  return {
    stop: async () => {
      await new Promise((resolve, reject) => {
        fakeForestServer.close(error => {
          if (error) reject(error);
          else resolve(null);
        });
      });
    },
    port: address.port,
  };
}

export function createClient(options: {
  agentAuthSecret: string;
  agentUrl: string;
  agentSchemaPath: string;
}): TestableAgentBase {
  const { agentAuthSecret, agentUrl, agentSchemaPath } = options;

  const schema = JSON.parse(readFileIfExisting(agentSchemaPath));
  if (!schema) throw new Error('Schema not found');

  const testableAgent = new TestableAgentBase({ authSecret: agentAuthSecret });
  testableAgent.init({ schema, url: agentUrl });

  return testableAgent;
}

export async function createTestableAgent<TypingsSchema extends TSchema = TSchema>(
  customizer: (agent: Agent<TypingsSchema>) => void,
  options?: TestableAgentOptions,
): Promise<TestableAgent<TypingsSchema>> {
  const agentOptions = {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    logger: () => {},
    schemaPath: SchemaPathManager.generateSchemaPath(),
    isProduction: false,
    ...(options || {}),
    // 0 is a random port
    port: options?.port || 0,
    forestAdminClient: new ForestAdminClientMock(),
    authSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
    envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
  };

  const agent = createAgent<TypingsSchema>(agentOptions);
  if (!agent) throw new Error('Agent is not defined');

  customizer(agent);

  return new TestableAgent<TypingsSchema>({ agent, agentOptions });
}
