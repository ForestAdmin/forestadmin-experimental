import { Agent } from '@forestadmin/agent';
import { buildSequelizeInstance, createSqlDataSource } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import { createTestableAgent } from '../../src';
import TestableAgent from '../../src/integrations/testable-agent';
import { STORAGE_PATH, logger } from '../utils';

describe('addAction', () => {
  let testableAgent: TestableAgent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;

  const actionFormCustomizer = (agent: Agent) => {
    agent.customizeCollection('restaurants', collection => {
      collection.addAction('Leave a review', {
        scope: 'Single',
        form: [
          { label: 'rating', type: 'Number' },
          {
            label: 'put a comment',
            type: 'String',
            // Only display this field if the rating is > 4
            if: context => Number(context.formValues.rating) >= 4,
          },
        ],
        execute: async context => {
          const rating = Number(context.formValues.rating);
          const comment = context.formValues['put a comment'];

          const { id } = await context.getRecord(['id']);
          await context.dataSource.getCollection('restaurants').update(
            {
              conditionTree: { field: 'id', operator: 'Equal', value: id },
            },
            { comment, rating },
          );
        },
      });
    });
  };

  const createTable = async () => {
    sequelize = await buildSequelizeInstance({ dialect: 'sqlite', storage: STORAGE_PATH }, logger);

    sequelize.define(
      'restaurants',
      {
        name: { type: DataTypes.STRING },
        rating: { type: DataTypes.INTEGER },
        comment: { type: DataTypes.STRING },
      },
      { tableName: 'restaurants' },
    );
    await sequelize.sync({ force: true });
  };

  beforeAll(async () => {
    await createTable();
    testableAgent = await createTestableAgent((agent: Agent) => {
      agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage: STORAGE_PATH }));
      actionFormCustomizer(agent);
    });
    await testableAgent.start();
  });

  afterAll(async () => {
    await testableAgent?.stop();
    await sequelize?.close();
  });

  describe('when the rating is > 4', () => {
    it('should add a comment and a rating', async () => {
      const createdRestaurant = await sequelize.models.restaurants.create({
        name: 'Best Forest Restaurant',
        rating: null,
        comment: null,
      });
      const restaurantId = createdRestaurant.dataValues.id;

      const action = testableAgent.collection('restaurants').action('Leave a review');
      expect(action.doesFieldExist('put a comment')).toEqual(false);

      const fieldRating = await action.getFieldNumber('rating');
      await fieldRating.fill(5);

      expect(action.doesFieldExist('put a comment')).toEqual(true);

      const commentField = await action.getFieldString('put a comment');
      await commentField.fill('A very nice restaurant');

      await action.execute({ recordId: restaurantId });

      // fetch the restaurant to check the rating and comment
      const [restaurant] = await testableAgent.collection('restaurants').list<{ rating; comment }>({
        filters: { conditionTree: { field: 'id', value: restaurantId, operator: 'Equal' } },
      });

      expect(restaurant.rating).toEqual(5);
      expect(restaurant.comment).toEqual('A very nice restaurant');
    });
  });
});
