import filteredOneToMany from '../src';

function buildCollection(name: string, extraFields: Record<string, unknown> = {}) {
  return {
    name,
    schema: {
      fields: {
        id: { type: 'Column', columnType: 'Uuid', isPrimaryKey: true },
        ...extraFields,
      },
    },
    addField: jest.fn(),
    replaceFieldOperator: jest.fn(),
    addOneToManyRelation: jest.fn(),
  };
}

function setup(subscriptionFields: Record<string, unknown> = {}) {
  const plan = buildCollection('plan');
  const subscription = buildCollection('subscription', subscriptionFields);
  const logger = jest.fn();
  const dataSource = {
    getCollection: jest.fn(name => (name === 'plan' ? plan : subscription)),
  };

  const run = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filteredOneToMany(
      dataSource,
      plan as any,
      {
        relationName: 'activeSubscriptions',
        foreignCollection: 'subscription',
        handler: async () => ({ field: 'id', operator: 'Present' as const }),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      logger,
    );

  return { plan, subscription, logger, run };
}

describe('filteredOneToMany', () => {
  it('uses the short field name when nothing conflicts', () => {
    const { plan, subscription, logger, run } = setup();

    run();

    expect(subscription.addField).toHaveBeenCalledWith(
      'activeSubscriptionsId',
      expect.objectContaining({ columnType: 'Uuid', dependencies: ['id'] }),
    );
    expect(plan.addOneToManyRelation).toHaveBeenCalledWith('activeSubscriptions', 'subscription', {
      originKey: 'activeSubscriptionsId',
    });
    expect(logger).not.toHaveBeenCalled();
  });

  it('scopes the field name with the collection name when it is already taken', () => {
    const { plan, subscription, logger, run } = setup({
      activeSubscriptionsId: { type: 'Column', columnType: 'Uuid' },
    });

    run();

    expect(subscription.addField).toHaveBeenCalledWith(
      'plan_activeSubscriptions_Id',
      expect.anything(),
    );
    expect(subscription.replaceFieldOperator).toHaveBeenCalledWith(
      'plan_activeSubscriptions_Id',
      'Equal',
      expect.any(Function),
    );
    expect(plan.addOneToManyRelation).toHaveBeenCalledWith('activeSubscriptions', 'subscription', {
      originKey: 'plan_activeSubscriptions_Id',
    });
    expect(logger).toHaveBeenCalledWith('Warn', expect.stringContaining('activeSubscriptionsId'));
  });

  it('throws when both names are already taken', () => {
    const { subscription, run } = setup({
      activeSubscriptionsId: { type: 'Column', columnType: 'Uuid' },
      plan_activeSubscriptions_Id: { type: 'Column', columnType: 'Uuid' },
    });

    expect(run).toThrow(/already has both/);
    expect(subscription.addField).not.toHaveBeenCalled();
  });
});
