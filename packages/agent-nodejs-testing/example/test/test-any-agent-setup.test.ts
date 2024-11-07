import { Agent, createAgent } from '@forestadmin/agent';
import { buildSequelizeInstance, createSqlDataSource } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import { ForestServerSandbox, SchemaPathManager, createForestClient } from '../../src';
import { STORAGE_PREFIX, logger } from '../utils';

describe('test any agent setup', () => {
  let serverSandbox: ForestServerSandbox;
  let agent: Agent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;
  const storage = `${STORAGE_PREFIX}-segment.db`;

  const schemaPath =
    '/Users/albanbertolini/Projects/to-remove/agent-python/src/_example/django/django_demo/.forestadmin-schema.json';
  const authSecret = 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb';

  // create a segment to get only minor users
  const segmentCustomizer = (agentToCustomize: Agent) => {
    agentToCustomize.customizeCollection('users', collection => {
      collection.addSegment('minorUsers', () => {
        return { field: 'age', operator: 'LessThan', value: 18 };
      });
    });
  };

  // create users table with age column
  const createTable = async () => {
    sequelize = await buildSequelizeInstance({ dialect: 'sqlite', storage }, logger);

    sequelize.define('users', { age: { type: DataTypes.INTEGER } }, { tableName: 'users' });
    await sequelize.sync({ force: true });
  };

  beforeAll(async () => {
    const forestServerPort = 3001;
    const forestServerUrl = `http://localhost:${forestServerPort}`;

    // await createTable();
  });

  afterAll(async () => {
    await agent?.stop();
    await sequelize?.close();
    await serverSandbox?.stop();
    await SchemaPathManager.removeTemporarySchemaPath(schemaPath);
  });

  it('should return only minor users', async () => {
    const client = await createForestClient({
      agentForestEnvSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
      agentForestAuthSecret: 'aeba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
      agentUrl: `http://127.0.0.1:8000`,
      serverUrl: `http://127.0.0.1:3456`,
      agentSchemaPath:
        '/Users/albanbertolini/Projects/to-remove/agent-python/src/_example/django/django_demo/.forestadmin-schema.json',
    });

    const client2 = await createForestClient({
      agentForestEnvSecret: 'e2b3ad263d5a0e0eea6b373d27696dc7c52919b4c76d09c4ec776d09f12b2a48',
      agentForestAuthSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
      agentUrl: `http://127.0.0.1:3351`,
      serverUrl: `http://127.0.0.1:3456`,
      agentSchemaPath:
        '/Users/albanbertolini/Projects/agent-nodejs/packages/_example/.forestadmin-schema.json',
    });
    const address = await client.collection('address').list();
    const users = await client2.collection('customer').list();

    expect(address.length).toEqual(15);
    expect(users.length).toEqual(15);
  });
});
