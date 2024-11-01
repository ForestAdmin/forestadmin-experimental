import { Agent, TSchema, createAgent } from '@forestadmin/agent';
import fs from 'fs/promises';
import * as http from 'node:http';

import ForestAdminClientMock, { CURRENT_USER } from './forest-admin-client-mock';
import SchemaPathManager from './schema-path-manager';
import TestableAgent from './testables/testable-agent';
import TestableAgentBase from './testables/testable-agent-base';
import { TestableAgentOptions } from './types';

export { TestableAgent };
export { AgentOptions, Agent } from '@forestadmin/agent';
export * from './types';

export type AgentSandbox = {
  port: number;
  forestServerUrl: string;
  schemaPath: string;
  authSecret: string;
  envSecret: string;
  exec: TestableAgentBase;
  down: () => Promise<void>;
  removeSchema: () => Promise<void>;
};

export async function createAgentSandbox(options?: { schemaPath?: string }): Promise<AgentSandbox> {
  const server = http.createServer((req, res) => {
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (req.url === '/liana/v1/ip-whitelist-rules') {
        res.end(JSON.stringify({ data: { attributes: { use_ip_whitelist: false, rules: [] } } }));
      } else if (req.url === '/liana/v4/permissions/environment') {
        res.end(JSON.stringify({ collections: [] }));
      } else if (req.url === '/liana/v4/permissions/users') {
        res.end(JSON.stringify([CURRENT_USER]));
      } else if (req.url?.startsWith('/liana/v4/permissions/renderings/')) {
        res.end(JSON.stringify({}));
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
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    }
  });

  const fakeForestServer: http.Server = await new Promise((resolve, reject) => {
    server.listen(0, () => resolve(server));
    server.on('error', error => {
      console.error('Server error:', error);
      reject(error);
    });
  });

  const agentOptions: TestableAgentOptions = {
    schemaPath: options.schemaPath ?? SchemaPathManager.generateSchemaPath(),
    authSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
    envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
    isProduction: false,
  };

  const { port } = fakeForestServer.address() as { port: number };

  return {
    forestServerUrl: `http://localhost:${port}`,
    schemaPath: agentOptions.schemaPath,
    authSecret: agentOptions.authSecret,
    envSecret: agentOptions.envSecret,
    port: (fakeForestServer.address() as { port: number }).port,
    exec: new TestableAgentBase({ agentOptions }),
    down: async () => {
      await new Promise((resolve, reject) => {
        fakeForestServer.close(error => {
          if (error) reject(error);
          else resolve(null);
        });
      });
    },
    removeSchema: async () => fs.rm(this.agentOptions.schemaPath, { force: true }),
  };
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
