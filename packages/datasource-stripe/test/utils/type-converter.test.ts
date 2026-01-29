/**
 * Tests for type-converter utilities
 */

import {
  FILTER_OPERATORS,
  getFilterOperators,
  isReadOnlyField,
  mapFieldType,
} from '../../src/utils/type-converter';

describe('type-converter', () => {
  describe('mapFieldType', () => {
    it('should map string type', () => {
      expect(mapFieldType('string')).toBe('String');
    });

    it('should map number type', () => {
      expect(mapFieldType('number')).toBe('Number');
    });

    it('should map integer type to Number', () => {
      expect(mapFieldType('integer')).toBe('Number');
    });

    it('should map boolean type', () => {
      expect(mapFieldType('boolean')).toBe('Boolean');
    });

    it('should map timestamp type to Date', () => {
      expect(mapFieldType('timestamp')).toBe('Date');
    });

    it('should map enum type', () => {
      expect(mapFieldType('enum')).toBe('Enum');
    });

    it('should map json type', () => {
      expect(mapFieldType('json')).toBe('Json');
    });

    it('should map array type to Json', () => {
      expect(mapFieldType('array')).toBe('Json');
    });

    it('should map object type to Json', () => {
      expect(mapFieldType('object')).toBe('Json');
    });
  });

  describe('getFilterOperators', () => {
    it('should return string operators', () => {
      const operators = getFilterOperators('string');

      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('NotEqual')).toBe(true);
      expect(operators.has('Contains')).toBe(true);
      expect(operators.has('StartsWith')).toBe(true);
      expect(operators.has('EndsWith')).toBe(true);
    });

    it('should return number operators', () => {
      const operators = getFilterOperators('number');

      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('GreaterThan')).toBe(true);
      expect(operators.has('LessThan')).toBe(true);
      expect(operators.has('GreaterThanOrEqual')).toBe(true);
      expect(operators.has('LessThanOrEqual')).toBe(true);
    });

    it('should return boolean operators', () => {
      const operators = getFilterOperators('boolean');

      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('NotEqual')).toBe(true);
      expect(operators.size).toBe(2);
    });

    it('should return timestamp operators (same as date)', () => {
      const operators = getFilterOperators('timestamp');

      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('GreaterThan')).toBe(true);
      expect(operators.has('LessThan')).toBe(true);
    });

    it('should return empty set for json', () => {
      const operators = getFilterOperators('json');

      expect(operators.size).toBe(0);
    });

    it('should return enum operators', () => {
      const operators = getFilterOperators('enum');

      expect(operators.has('Equal')).toBe(true);
      expect(operators.has('NotEqual')).toBe(true);
      expect(operators.has('In')).toBe(true);
      expect(operators.has('NotIn')).toBe(true);
    });
  });

  describe('isReadOnlyField', () => {
    it('should return true for common read-only fields', () => {
      expect(isReadOnlyField('id', 'customers')).toBe(true);
      expect(isReadOnlyField('object', 'products')).toBe(true);
      expect(isReadOnlyField('created', 'invoices')).toBe(true);
      expect(isReadOnlyField('updated', 'prices')).toBe(true);
      expect(isReadOnlyField('livemode', 'charges')).toBe(true);
    });

    it('should return true for customer-specific read-only fields', () => {
      expect(isReadOnlyField('balance', 'customers')).toBe(true);
      expect(isReadOnlyField('delinquent', 'customers')).toBe(true);
      expect(isReadOnlyField('invoice_prefix', 'customers')).toBe(true);
    });

    it('should return true for subscription-specific read-only fields', () => {
      expect(isReadOnlyField('status', 'subscriptions')).toBe(true);
      expect(isReadOnlyField('latest_invoice', 'subscriptions')).toBe(true);
      expect(isReadOnlyField('current_period_start', 'subscriptions')).toBe(true);
    });

    it('should return true for invoice-specific read-only fields', () => {
      expect(isReadOnlyField('amount_due', 'invoices')).toBe(true);
      expect(isReadOnlyField('hosted_invoice_url', 'invoices')).toBe(true);
    });

    it('should return true for payment_intents-specific read-only fields', () => {
      expect(isReadOnlyField('status', 'payment_intents')).toBe(true);
      expect(isReadOnlyField('client_secret', 'payment_intents')).toBe(true);
    });

    it('should return true for charges-specific read-only fields', () => {
      expect(isReadOnlyField('amount_captured', 'charges')).toBe(true);
      expect(isReadOnlyField('receipt_url', 'charges')).toBe(true);
    });

    it('should return true for prices-specific read-only fields', () => {
      expect(isReadOnlyField('type', 'prices')).toBe(true);
    });

    it('should return false for writable fields', () => {
      expect(isReadOnlyField('email', 'customers')).toBe(false);
      expect(isReadOnlyField('name', 'products')).toBe(false);
      expect(isReadOnlyField('metadata', 'invoices')).toBe(false);
    });

    it('should return false for unknown resource types', () => {
      expect(isReadOnlyField('some_field', 'unknown_resource')).toBe(false);
    });
  });

  describe('FILTER_OPERATORS', () => {
    it('should have all expected operator sets', () => {
      expect(FILTER_OPERATORS.string).toBeDefined();
      expect(FILTER_OPERATORS.number).toBeDefined();
      expect(FILTER_OPERATORS.boolean).toBeDefined();
      expect(FILTER_OPERATORS.date).toBeDefined();
      expect(FILTER_OPERATORS.enum).toBeDefined();
      expect(FILTER_OPERATORS.json).toBeDefined();
    });
  });
});
