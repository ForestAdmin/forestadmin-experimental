import defineEnum from '../src';

const enumObject = { ACTIVE: 1, INACTIVE: 2 };

function setup(filterOperators?: string[]) {
  const collection = {
    name: 'user',
    schema: {
      fields: {
        status: {
          type: 'Column',
          columnType: 'Number',
          filterOperators: filterOperators && new Set(filterOperators),
        },
      },
    },
    addField: jest.fn(() => collection),
    replaceFieldWriting: jest.fn(() => collection),
    replaceFieldOperator: jest.fn(() => collection),
  };

  const run = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defineEnum({} as any, collection as any, { fieldName: 'status', enumObject } as any);

  const replacerFor = (operator: string) =>
    collection.replaceFieldOperator.mock.calls.find(call => call[1] === operator)?.[2];

  return { collection, run, replacerFor };
}

describe('defineEnum', () => {
  it('throws without a collection or options', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => defineEnum({} as any, null, {} as any)).toThrow(/only be use\(\) on a collection/);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => defineEnum({} as any, {} as any)).toThrow(/Options must be provided/);
  });

  it('adds the enum field and its writing behavior', () => {
    const { collection, run } = setup();

    run();

    expect(collection.addField).toHaveBeenCalledWith(
      'statusEnum',
      expect.objectContaining({
        columnType: 'Enum',
        enumValues: ['ACTIVE', 'INACTIVE'],
        dependencies: ['status'],
      }),
    );
    expect(collection.replaceFieldWriting).toHaveBeenCalledWith('statusEnum', expect.any(Function));

    const { getValues } = collection.addField.mock.calls[0][1];
    expect(getValues([{ status: 2 }, { status: 42 }])).toEqual(['INACTIVE', undefined]);

    const writer = collection.replaceFieldWriting.mock.calls[0][1];
    expect(writer('ACTIVE')).toEqual({ status: 1 });
  });

  it('maps only the operators supported by the original field', () => {
    const { collection, run } = setup(['Equal', 'In', 'Present', 'GreaterThan']);

    run();

    expect(collection.replaceFieldOperator.mock.calls.map(call => call[1]).sort()).toEqual([
      'Equal',
      'In',
      'Present',
    ]);
  });

  it('translates enum keys back to the underlying values', () => {
    const { run, replacerFor } = setup(['Equal', 'NotIn', 'Missing']);

    run();

    expect(replacerFor('Equal')('ACTIVE')).toEqual({
      field: 'status',
      operator: 'Equal',
      value: 1,
    });
    expect(replacerFor('NotIn')(['ACTIVE', 'INACTIVE'])).toEqual({
      field: 'status',
      operator: 'NotIn',
      value: [1, 2],
    });
    expect(replacerFor('Missing')(null)).toEqual({ field: 'status', operator: 'Missing' });
  });

  it('ignores keys which are not part of the enum', () => {
    const { run, replacerFor } = setup(['Equal', 'In']);

    run();

    expect(replacerFor('Equal')('toString')).toEqual({
      field: 'status',
      operator: 'Equal',
      value: undefined,
    });
    expect(replacerFor('In')(['ACTIVE', 'UNKNOWN'])).toEqual({
      field: 'status',
      operator: 'In',
      value: [1],
    });
  });

  it('does nothing when the original field is not filterable', () => {
    const { collection, run } = setup();

    run();

    expect(collection.replaceFieldOperator).not.toHaveBeenCalled();
  });

  it('does nothing when the original field is unknown', () => {
    const { collection, run } = setup(['Equal']);
    collection.schema.fields = {} as typeof collection.schema.fields;

    run();

    expect(collection.replaceFieldOperator).not.toHaveBeenCalled();
  });
});
