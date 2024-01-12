import { Agent } from '@forestadmin/agent';
import { buildSequelizeInstance } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import TestableAgent from '../../src/integrations/testable-agent';
import startTestableAgent from '../index';
import { STORAGE_PATH, logger } from '../utils';

describe('addSegment', () => {
  let testableAgent: TestableAgent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;

  // create a segment to get only minor users
  const segmentCustomizer = (agent: Agent) => {
    agent.customizeCollection('users', collection => {
      collection.addSegment('minorUsers', () => {
        return { field: 'age', operator: 'LessThan', value: 18 };
      });
    });
  };

  // create users table with age column
  const createTable = async () => {
    sequelize = await buildSequelizeInstance({ dialect: 'sqlite', storage: STORAGE_PATH }, logger);

    sequelize.define('users', { age: { type: DataTypes.INTEGER } }, { tableName: 'users' });
    await sequelize.sync({ force: true });
  };

  beforeAll(async () => {
    await createTable();
    testableAgent = await startTestableAgent(segmentCustomizer, STORAGE_PATH);
  });

  afterAll(async () => {
    await testableAgent?.stop();
    await sequelize?.close();
  });

  it('should return only minor users', async () => {
    await sequelize.models.users.create({ age: 19 });
    await sequelize.models.users.create({ age: 17 });

    // get the created user
    const users = await testableAgent.collection('users').segment('minorUsers').list<{ age }>();

    // test the full name content
    expect(users.length).toEqual(1);
    expect(users[0].age).toEqual(17);
  });
});
