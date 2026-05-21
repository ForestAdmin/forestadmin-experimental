import { keysToCamel, keysToSnake } from '../src/utils';

describe('utils', () => {
  describe('keysToSnake', () => {
    it('converts top-level camelCase keys to snake_case', () => {
      expect(keysToSnake({ firstName: 'a', lastName: 'b' })).toEqual({
        first_name: 'a',
        last_name: 'b',
      });
    });

    it('recurses into nested objects and arrays', () => {
      const input = {
        conditionTree: {
          aggregator: 'And',
          conditions: [{ fieldName: 'name', matchValue: 'X' }],
        },
        searchExtended: true,
      };

      expect(keysToSnake(input)).toEqual({
        condition_tree: {
          aggregator: 'And',
          conditions: [{ field_name: 'name', match_value: 'X' }],
        },
        search_extended: true,
      });
    });

    it('leaves non-object values untouched', () => {
      expect(keysToSnake(null)).toBeNull();
      expect(keysToSnake(undefined)).toBeUndefined();
      expect(keysToSnake('helloWorld')).toBe('helloWorld');
      expect(keysToSnake(42)).toBe(42);
    });
  });

  describe('keysToCamel', () => {
    it('round-trips with keysToSnake', () => {
      const input = { firstName: 'a', nested: { someValue: 1 }, list: [{ deepKey: 'x' }] };

      expect(keysToCamel(keysToSnake(input))).toEqual(input);
    });
  });
});
