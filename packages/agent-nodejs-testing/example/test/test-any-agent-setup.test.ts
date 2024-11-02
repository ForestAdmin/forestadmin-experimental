import { Agent, createAgent } from '@forestadmin/agent';
import { buildSequelizeInstance, createSqlDataSource } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import { ForestServerSandbox, SchemaPathManager, createForestClient } from '../../src';
import createForestServerSandbox from '../../src/integrations';
import { STORAGE_PREFIX, logger } from '../utils';

describe('test any agent setup', () => {
  let serverSandbox: ForestServerSandbox;
  let agent: Agent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;
  const storage = `${STORAGE_PREFIX}-segment.db`;

  const schemaPath = SchemaPathManager.generateTemporarySchemaPath();
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

    serverSandbox = await createForestServerSandbox({
      port: forestServerPort,
      agentSchemaPath: schemaPath,
    });

    await createTable();

    agent = createAgent({
      envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
      authSecret,
      logger: () => {},
      isProduction: false,
      forestServerUrl,
      schemaPath,
    });
    agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage }));
    segmentCustomizer(agent);
    await agent.mountOnStandaloneServer(0).start();
  });

  afterAll(async () => {
    await agent?.stop();
    await sequelize?.close();
    await serverSandbox?.stop();
    await SchemaPathManager.removeTemporarySchemaPath(schemaPath);
  });

  it('should return only minor users', async () => {
    await sequelize.models.users.create({ age: 19 });
    await sequelize.models.users.create({ age: 17 });

    const client = createForestClient({
      agentAuthSecret: authSecret,
      agentUrl: `http://localhost:${agent.standaloneServerPort}`,
      agentSchemaPath: schemaPath,
    });

    // get the created user
    const users = await client.collection('users').segment('minorUsers').list<{ age }>();

    // test the full name content
    expect(users.length).toEqual(1);
    expect(users[0].age).toEqual(17);
  });
});
