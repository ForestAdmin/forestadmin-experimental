import { Agent } from '@forestadmin/agent';
import { buildSequelizeInstance } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import TestableAgent from '../../src/integrations/testable-agent';
import startTestableAgent from '../index';
import { STORAGE_PATH, logger } from '../utils';

describe('addOneToManyRelation', () => {
  let testableAgent: TestableAgent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;

  const relationCustomizer = (agent: Agent) => {
    // Add a one to many relation between actor and dvd
    agent.customizeCollection('actor', collection => {
      collection.addOneToManyRelation('dvd', 'dvd', {
        originKeyTarget: 'id',
        originKey: 'actorId',
      });
    });
  };

  const createTable = async () => {
    sequelize = await buildSequelizeInstance({ dialect: 'sqlite', storage: STORAGE_PATH }, logger);

    sequelize.define(
      'dvd',
      { title: { type: DataTypes.STRING }, actorId: { type: DataTypes.INTEGER } },
      { tableName: 'dvd' },
    );
    sequelize.define('actor', { name: { type: DataTypes.STRING } }, { tableName: 'actor' });
    await sequelize.sync({ force: true });
  };

  beforeAll(async () => {
    await createTable();
    testableAgent = await startTestableAgent(relationCustomizer, STORAGE_PATH);
  });

  afterAll(async () => {
    await testableAgent?.stop();
    await sequelize?.close();
  });

  it('should return the dvd list with the right actor', async () => {
    const actor = await sequelize.models.actor.create({ name: 'John Doe' });
    const anotherActor = await sequelize.models.actor.create({ name: 'Alban' });
    await sequelize.models.dvd.create({ title: 'Forest', actorId: actor.dataValues.id });
    // create a dvd with another actor, this dvd should not be returned
    await sequelize.models.dvd.create({ title: 'Lumber', actorId: anotherActor.dataValues.id });

    const dvds = await testableAgent
      .collection('actor')
      .relation('dvd', actor.dataValues.id)
      .list<{ title: string }>();

    // test the full name content
    expect(dvds.length).toEqual(1);
    expect(dvds[0].title).toEqual('Forest');
  });
});
