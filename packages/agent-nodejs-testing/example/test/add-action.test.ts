import { Agent, createAgent } from '@forestadmin/agent';
import { buildSequelizeInstance, createSqlDataSource } from '@forestadmin/datasource-sql';
import { DataTypes } from 'sequelize';

import { TestableAgent, createClient, createForestServerSandbox } from '../../src';
import { STORAGE_PREFIX, logger } from '../utils';

describe('addAction', () => {
  let testableAgent: TestableAgent;
  let sequelize: Awaited<ReturnType<typeof buildSequelizeInstance>>;
  let restaurantId: number;
  const storage = `${STORAGE_PREFIX}-action.db`;

  const actionFormCustomizer = (agent: Agent) => {
    agent.customizeCollection('restaurants', collection => {
      collection.addAction('Leave a review', {
        scope: 'Single',
        form: [
          {
            type: 'Layout',
            component: 'Page',
            nextButtonLabel: 'Next',
            previousButtonLabel: 'Back',
            elements: [
              {
                component: 'Separator',
                type: 'Layout',
              },
              { component: 'HtmlBlock', content: '<h1>Welcome</h1>', type: 'Layout' },
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
              {
                label: 'Current id',
                type: 'Number',
                defaultValue: async context => Number(await context.getRecordId()),
              },
            ],
          },

          {
            type: 'Layout',
            component: 'Page',
            nextButtonLabel: 'Bye',
            previousButtonLabel: 'Back',
            elements: [
              { component: 'Separator', type: 'Layout' },
              { type: 'Layout', component: 'HtmlBlock', content: '<h1>Thank you</h1>' },
              { component: 'Separator', type: 'Layout' },
              {
                component: 'Row',
                type: 'Layout',
                fields: [
                  { label: 'Rating again', type: 'Number' },
                  { label: 'Put a comment again', type: 'String' },
                ],
              },
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
    // testableAgent = await createTestableAgent((agent: Agent) => {
    //   agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage }));
    //   actionFormCustomizer(agent);
    // });
    // await testableAgent.start();
  });

  afterAll(async () => {
    await testableAgent?.stop();
    await sequelize?.close();
  });

  beforeEach(async () => {
    const createdRestaurant = await sequelize.models.restaurants.create({
      name: 'Best Forest Restaurant',
      rating: null,
      comment: null,
    });
    restaurantId = createdRestaurant.dataValues.id;
  });

  describe('when the rating is > 4', () => {
    it('should add a comment and a rating', async () => {
      const action = await testableAgent
        .collection('restaurants')
        .action('Leave a review', { recordIds: [restaurantId] });
      expect(action.doesFieldExist('Put a comment')).toEqual(false);

      const fieldRating = action.getFieldNumber('rating');
      await fieldRating.fill(5);

      expect(action.doesFieldExist('Put a comment')).toEqual(true);

      const commentField = action.getFieldString('Put a comment');
      await commentField.fill('A very nice restaurant');

      await action.execute();

      // fetch the restaurant to check the rating and comment
      const [restaurant] = await testableAgent.collection('restaurants').list<{ rating; comment }>({
        filters: { conditionTree: { field: 'id', value: restaurantId, operator: 'Equal' } },
      });

      expect(restaurant.rating).toEqual(5);
      expect(restaurant.comment).toEqual('A very nice restaurant');
    });

    it('should select the recommend option yes by default', async () => {
      const action = await testableAgent
        .collection('restaurants')
        .action('Leave a review', { recordId: restaurantId });
      const recommendField = action.getRadioGroupField('Would you recommend us?');

      expect(recommendField.getValue()).toEqual('yes');

      await recommendField.check('Not really...');

      expect(recommendField.getValue()).toEqual('no');
    });

    it('should check the different choices', async () => {
      const action = await testableAgent
        .collection('restaurants')
        .action('Leave a review', { recordId: restaurantId });
      const likeField = action.getCheckboxGroupField('Why do you like us?');

      expect(likeField.getValue()).toBeUndefined();

      await likeField.check('Build quality');
      await likeField.check('Good price');
      await likeField.check('It looks good');
      await likeField.uncheck('It looks good');

      expect(likeField.getValue()).toEqual(['quality', 'price']);
    });
  });

  it('should handle defaultValue with handler', async () => {
    const action = await testableAgent
      .collection('restaurants')
      .action('Leave a review', { recordId: restaurantId });
    const currentIdField = action.getFieldNumber('Current id');

    expect(currentIdField.getValue()).toBe(restaurantId);
  });

  it('check layout on page 0', async () => {
    const forestServerPort = 3001;
    const forestServerUrl = `http://localhost:${forestServerPort}`;
    const schemaPath = './.test-forestadmin-schema.json';
    const authSecret = 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb';
    const agentPort = 3004;

    const serverSandbox = await createForestServerSandbox({
      port: forestServerPort,
      agentSchemaPath: schemaPath,
    });

    const agent = createAgent({
      envSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
      authSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
      logger: () => {},
      isProduction: false,
      forestServerUrl,
      schemaPath,
    });

    agent.addDataSource(createSqlDataSource({ dialect: 'sqlite', storage }));
    actionFormCustomizer(agent);
    await agent.mountOnStandaloneServer(agentPort).start();

    const client = createClient({
      agentAuthSecret: authSecret,
      agentUrl: `http://localhost:${agentPort}`,
      agentSchemaPath: schemaPath,
    });

    const action = await client
      .collection('restaurants')
      .action('Leave a review', { recordId: restaurantId });

    expect(action.getLayout().page(0).element(0).isSeparator()).toBe(true);
    expect(action.getLayout().page(0).element(1).isHTMLBlock()).toBe(true);
    expect(action.getLayout().page(0).element(1).getHtmlBlockContent()).toBe('<h1>Welcome</h1>');
    expect(action.getLayout().page(0).element(1).getHtmlBlockContent()).toBe('<h1>Welcome</h1>');
    expect(action.getLayout().page(0).nextButtonLabel).toBe('Next');
    expect(action.getLayout().page(0).previousButtonLabel).toBe('Back');

    await serverSandbox.stop();
    await agent.stop();
  });

  it('check layout on page 1', async () => {
    const action = await testableAgent
      .collection('restaurants')
      .action('Leave a review', { recordId: restaurantId });

    expect(action.getLayout().page(1).element(0).isSeparator()).toBe(true);
    expect(action.getLayout().page(1).element(1).isHTMLBlock()).toBe(true);
    expect(action.getLayout().page(1).element(1).getHtmlBlockContent()).toBe('<h1>Thank you</h1>');
    expect(action.getLayout().page(1).element(2).isSeparator()).toBe(true);
    expect(action.getLayout().page(1).nextButtonLabel).toBe('Bye');
    expect(action.getLayout().page(1).previousButtonLabel).toBe('Back');

    expect(action.getLayout().page(1).element(3).isRow()).toBe(true);
    expect(action.getLayout().page(1).element(3).rowElement(0).getInputId()).toEqual(
      'Rating again',
    );
  });
});
