import { ForestSchema } from '@forestadmin/forestadmin-client';
import {
  EnvironmentCollectionAccessPermissionsV4,
  EnvironmentCollectionPermissionsV4,
  EnvironmentPermissionsV4Remote,
  EnvironmentSmartActionPermissionsV4,
} from '@forestadmin/forestadmin-client/dist/permissions/types';
import http from 'node:http';

import { CURRENT_USER } from './forest-admin-client-mock';

export default class ForestServerSandbox {
  private fakeForestServer: http.Server;

  // cache the agent schema for every client to avoid to start several servers when testing agent.
  private readonly agentSchemaCache: Map<string, ForestSchema> = new Map();

  port: number;

  constructor(port: number) {
    this.port = port;
  }

  async createServer() {
    const server = http.createServer(this.routes.bind(this));

    this.fakeForestServer = await new Promise((resolve, reject) => {
      server.listen(this.port, () => resolve(server));
      server.on('error', error => {
        console.error('Server error:', error);
        reject(error);
      });
    });

    this.port = (this.fakeForestServer.address() as { port: number }).port;

    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${this.port}`);

    return this;
  }

  async stop() {
    await new Promise((resolve, reject) => {
      this.fakeForestServer.close(error => {
        if (error) reject(error);
        else resolve(null);
      });
    });
  }

  private routes(req: http.IncomingMessage, res: http.ServerResponse) {
    const agentSchemaCacheIdentifier = req.headers['forest-secret-key'] as string;
    console.log(`Handling request`, req.url);

    const sendResponse = (statusCode: number, data?: object) => {
      if (!res.headersSent) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
      }

      if (!res.writableEnded) {
        res.end(data ? JSON.stringify(data) : undefined);
      }
    };

    try {
      switch (req.url) {
        case '/agent-schema': {
          let data = '';
          req.on('data', chunk => {
            data += chunk;
          });
          req.on('end', () => {
            this.agentSchemaCache.set(agentSchemaCacheIdentifier, JSON.parse(data));
            sendResponse(200);
          });
          break;
        }

        case '/liana/v4/subscribe-to-events':
          sendResponse(200);
          break;

        case '/liana/v1/ip-whitelist-rules':
          sendResponse(200, { data: { attributes: { use_ip_whitelist: false, rules: [] } } });
          break;

        case '/liana/v4/permissions/environment': {
          try {
            const permissionsV4 = this.transformForestSchemaToEnvironmentPermissionsV4Remote(
              this.agentSchemaCache.get(agentSchemaCacheIdentifier),
            );
            sendResponse(200, permissionsV4);
          } catch {
            sendResponse(400, { error: 'Provide a valid schema path' });
          }

          break;
        }

        case '/liana/v4/permissions/users':
          sendResponse(200, [CURRENT_USER]);
          break;

        case '/forest/apimaps/hashcheck':
          sendResponse(200, { sendSchema: false });
          break;

        default:
          if (req.url?.startsWith('/liana/v4/permissions/renderings/')) {
            sendResponse(200, { team: {}, collections: {}, stats: [] });
          } else {
            sendResponse(404, { error: 'Not Found' });
          }
      }
    } catch (error) {
      console.error('Error handling request:', error);
      sendResponse(500, { error: 'Internal Server Error' });
    }
  }

  private transformForestSchemaToEnvironmentPermissionsV4Remote(
    schema: ForestSchema,
  ): EnvironmentPermissionsV4Remote {
    return {
      collections: schema.collections.reduce((collectionAcc, collection) => {
        collectionAcc[collection.name] = {
          collection: {
            browseEnabled: { roles: [1] },
            deleteEnabled: { roles: [1] },
            editEnabled: { roles: [1] },
            exportEnabled: { roles: [1] },
            addEnabled: { roles: [1] },
            readEnabled: { roles: [1] },
          } as EnvironmentCollectionAccessPermissionsV4,
          actions: collection.actions.reduce((actionAcc, action) => {
            actionAcc[action.name] = {
              approvalRequired: { roles: [0] },
              userApprovalEnabled: { roles: [1] },
              selfApprovalEnabled: { roles: [1] },
              triggerEnabled: { roles: [1] },
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
}
