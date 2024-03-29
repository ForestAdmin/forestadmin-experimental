import { Agent } from '@forestadmin/agent';
import { buildSequelizeInstance, createSqlDataSource } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import { createTestableAgent } from '../../src';
import TestableAgent from '../../src/integrations/testable-agent';
import { STORAGE_PREFIX, logger } from '../utils';

describe('addAction', () => {
  let testableAgent: TestableAgent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;
  const storage = `${STORAGE_PREFIX}-action.db`;

  const actionFormCustomizer = (agent: Agent) => {
    agent.customizeCollection('restaurants', collection => {
      collection.addAction('Leave a review', {
        scope: 'Single',
        form: [
          { label: 'rating', type: 'Number' },
          {
            label: 'Put a comment',
            type: 'String',
            // Only display this field if the rating is >= 4
            if: context => Number(context.formValues.rating) >= 4,
          },
          {
            label: 'Would you recommend us?',
            type: 'String',
            widget: 'RadioGroup',
            options: [
              { value: 'yes', label: 'Yes, absolutely!' },
              { value: 'no', label: 'Not really...' },
            ],
            defaultValue: 'yes',
          },
          {
            label: 'Why do you like us?',
            type: 'StringList',
            widget: 'CheckboxGroup',
            options: [
              { value: 'price', label: 'Good price' },
              { value: 'quality', label: 'Build quality' },
              { value: 'look', label: 'It looks good' },
            ],
          },
        ],
        execute: async context => {
          const rating = Number(context.formValues.rating);
          const comment = context.formValues['Put a comment'];

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
    sequelize = await buildSequelizeInstance({ dialect: 'sqlite', storage }, logger);

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
      agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage }));
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
      expect(await action.doesFieldExist('Put a comment')).toEqual(false);

      const fieldRating = action.getFieldNumber('rating');
      await fieldRating.fill(5);

      expect(await action.doesFieldExist('Put a comment')).toEqual(true);

      const commentField = action.getFieldString('Put a comment');
      await commentField.fill('A very nice restaurant');

      await action.execute({ recordId: restaurantId });

      // fetch the restaurant to check the rating and comment
      const [restaurant] = await testableAgent.collection('restaurants').list<{ rating; comment }>({
        filters: { conditionTree: { field: 'id', value: restaurantId, operator: 'Equal' } },
      });

      expect(restaurant.rating).toEqual(5);
      expect(restaurant.comment).toEqual('A very nice restaurant');
    });

    it('should select the recommend option yes by default', async () => {
      const action = testableAgent.collection('restaurants').action('Leave a review');
      const recommendField = action.getRadioGroupField('Would you recommend us?');

      expect(await recommendField.getValue()).toEqual('yes');

      await recommendField.check('Not really...');

      expect(await recommendField.getValue()).toEqual('no');
    });

    it('should check the different choices', async () => {
      const action = testableAgent.collection('restaurants').action('Leave a review');
      const likeField = action.getCheckboxGroupField('Why do you like us?');

      expect(await likeField.getValue()).toEqual(undefined);

      await likeField.check('Build quality');
      await likeField.check('Good price');
      await likeField.check('It looks good');
      await likeField.uncheck('It looks good');

      expect(await likeField.getValue()).toEqual(['quality', 'price']);
    });
  });
});
