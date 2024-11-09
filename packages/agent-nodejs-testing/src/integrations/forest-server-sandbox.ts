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
  private readonly agentSchema: Map<string, ForestSchema> = new Map();

  port: number;

  constructor(port: number) {
    this.port = port;
  }

  async createServer() {
    const server = http.createServer(this.routes.bind(this));

    this.fakeForestServer = await new Promise((resolve, reject) => {
      server.listen(this.port, 0, () => resolve(server));
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
    const forestSecretKey = req.headers['forest-secret-key'] as string;
    // eslint-disable-next-line no-console
    console.log(`Handling request`, req.url);

    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (req.url === '/agent-schema') {
        // read schema from post
        let data = '';
        req.on('data', chunk => {
          data += chunk;
        });
        req.on('end', () => {
          this.agentSchema.set(forestSecretKey, JSON.parse(data));
          res.end();
        });
      } else if (req.url === '/liana/v4/subscribe-to-events') {
        res.end();
      } else if (req.url === '/liana/v1/ip-whitelist-rules') {
        res.end(JSON.stringify({ data: { attributes: { use_ip_whitelist: false, rules: [] } } }));
      } else if (req.url === '/liana/v4/permissions/environment') {
        try {
          const permissionsV4 = this.transformForestSchemaToEnvironmentPermissionsV4Remote(
            this.agentSchema.get(forestSecretKey),
          );
          res.end(JSON.stringify(permissionsV4));
        } catch (e) {
          res.end(JSON.stringify({ error: 'Provide a right schema path' }));
        }
      } else if (req.url === '/liana/v4/permissions/users') {
        res.end(JSON.stringify([CURRENT_USER]));
      } else if (req.url?.startsWith('/liana/v4/permissions/renderings/')) {
        res.end(
          JSON.stringify({
            team: {},
            collections: {},
            stats: [],
          }),
        );
      } else if (req.url === '/forest/apimaps/hashcheck') {
        res.end(JSON.stringify({ sendSchema: false }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } catch (error) {
      console.error('Error handling request:', error);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
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
              approvalRequired: { roles: [1] },
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
