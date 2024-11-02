import { ForestSchema } from '@forestadmin/forestadmin-client';
import {
  EnvironmentCollectionAccessPermissionsV4,
  EnvironmentCollectionPermissionsV4,
  EnvironmentPermissionsV4Remote,
  EnvironmentSmartActionPermissionsV4,
} from '@forestadmin/forestadmin-client/dist/permissions/types';
import fs from 'fs';
import http from 'node:http';

export default class ForestServerSandbox {
  private fakeForestServer: http.Server;
  private readonly agentSchemaPath: string;

  port: number;

  constructor(options: { port?: number; agentSchemaPath: string }) {
    this.port = options.port;
    this.agentSchemaPath = options.agentSchemaPath;
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
    try {
      res.writeHead(200, { 'Content-Type': 'application/json' });

      if (req.url === '/liana/v1/ip-whitelist-rules') {
        res.end(JSON.stringify({ data: { attributes: { use_ip_whitelist: false, rules: [] } } }));
      } else if (req.url === '/liana/v4/permissions/environment') {
        try {
          const schema = JSON.parse(fs.readFileSync(this.agentSchemaPath, { encoding: 'utf-8' }));
          const permissionsV4 = this.transformForestSchemaToEnvironmentPermissionsV4Remote(schema);
          res.end(JSON.stringify(permissionsV4));
        } catch (e) {
          res.end(JSON.stringify({ error: 'Provide a right schema path' }));
        }
      } else if (req.url === '/liana/v4/permissions/users') {
        res.end(JSON.stringify([]));
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
        res.writeHead(200, { 'Content-Type': 'application/json' });
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
}
