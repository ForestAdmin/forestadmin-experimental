import { Agent } from '@forestadmin/agent';
import { buildSequelizeInstance } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import TestableAgent from '../../src/integrations/testable-agent';
import startTestableAgent from '../index';
import { STORAGE_PATH, logger } from '../utils';

describe('addHook after delete', () => {
  let testableAgent: TestableAgent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;

  const createHookCustomizer = (agent: Agent) => {
    agent.customizeCollection('assets', collection => {
      collection.addHook('After', 'Delete', async context => {
        // Delete the replication assets
        await context.dataSource.getCollection('replicationAssets').delete(context.filter as any);
      });
    });
  };

  const createTable = async () => {
    sequelize = await buildSequelizeInstance({ dialect: 'sqlite', storage: STORAGE_PATH }, logger);

    sequelize.define('assets', { name: { type: DataTypes.STRING } }, { tableName: 'assets' });
    sequelize.define(
      'replicationAssets',
      { name: { type: DataTypes.STRING } },
      { tableName: 'replicationAssets' },
    );
    await sequelize.sync({ force: true });
  };

  beforeAll(async () => {
    await createTable();
    testableAgent = await startTestableAgent(createHookCustomizer, STORAGE_PATH);
  });

  afterAll(async () => {
    await testableAgent?.stop();
    await sequelize?.close();
  });

  it('should delete the replication assets when the main asset is removed', async () => {
    const asset = await sequelize.models.assets.create({ name: 'Gold' });
    await sequelize.models.replicationAssets.create({ name: 'Gold' });

    await testableAgent.collection('assets').delete([asset.dataValues.id]);

    // Check that the replication asset has been deleted
    const replicationAssets = await sequelize.models.replicationAssets.findAll();
    expect(replicationAssets.length).toEqual(0);
  });
});
