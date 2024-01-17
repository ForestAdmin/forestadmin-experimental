import { Agent } from '@forestadmin/agent';
import { buildSequelizeInstance, createSqlDataSource } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import { ValueChartResponse, createTestableAgent } from '../../src';
import TestableAgent from '../../src/integrations/testable-agent';
import { STORAGE_PATH, logger } from '../utils';

describe('addChart on dashboard', () => {
  let testableAgent: TestableAgent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;

  const dashboardChartCustomizer = (agent: Agent) => {
    agent.addChart('countCustomersChart', async (context, resultBuilder) => {
      const userCount = await context.dataSource.getCollection('customers').list({}, ['id']);

      return resultBuilder.value(userCount.length);
    });
  };

  const createTable = async () => {
    sequelize = await buildSequelizeInstance({ dialect: 'sqlite', storage: STORAGE_PATH }, logger);

    sequelize.define(
      'customers',
      { firstName: { type: DataTypes.STRING } },
      { tableName: 'customers' },
    );
    await sequelize.sync({ force: true });
  };

  beforeAll(async () => {
    await createTable();
    testableAgent = await createTestableAgent((agent: Agent) => {
      agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage: STORAGE_PATH }));
      dashboardChartCustomizer(agent);
    });
    await testableAgent.start();
  });

  afterAll(async () => {
    await testableAgent?.stop();
    await sequelize?.close();
  });

  it('should return the customers count', async () => {
    await sequelize.models.customers.create({ firstName: 'John' });
    await sequelize.models.customers.create({ firstName: 'John' });

    const customers = await testableAgent.dashboardChart<ValueChartResponse>('countCustomersChart');

    expect(customers.countCurrent).toEqual(2);
  });
});