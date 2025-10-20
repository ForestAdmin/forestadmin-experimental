import Serializer from '../../src/utils/serializer';

describe('Serializer', () => {
  describe('flattenAndSerialize', () => {
    it('should flatten simple nested objects', () => {
      const input = {
        id: '1',
        name: 'John',
        address: {
          city: 'Paris',
          street: 'Main St',
        },
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        name: 'John',
        'address->city': 'Paris',
        'address->street': 'Main St',
      });
    });

    it('should flatten deeply nested objects', () => {
      const input = {
        id: '1',
        user: {
          profile: {
            contact: {
              email: 'test@example.com',
            },
          },
        },
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        'user->profile->contact->email': 'test@example.com',
      });
    });

    it('should handle arrays without flattening them', () => {
      const input = {
        id: '1',
        tags: ['admin', 'user'],
        metadata: {
          roles: ['editor', 'viewer'],
        },
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        tags: ['admin', 'user'],
        'metadata->roles': ['editor', 'viewer'],
      });
    });

    it('should serialize dates to ISO strings', () => {
      const date = new Date('2023-01-15T10:00:00Z');
      const input = {
        id: '1',
        createdAt: date,
        metadata: {
          updatedAt: date,
        },
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        createdAt: '2023-01-15T10:00:00.000Z',
        'metadata->updatedAt': '2023-01-15T10:00:00.000Z',
      });
    });

    it('should handle null and undefined values', () => {
      const input = {
        id: '1',
        name: null,
        email: undefined,
        address: {
          city: 'Paris',
          zipCode: null,
        },
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        name: null,
        email: undefined,
        'address->city': 'Paris',
        'address->zipCode': null,
      });
    });

    it('should handle GeoJSON Point without flattening', () => {
      const input = {
        id: '1',
        location: {
          name: 'Home',
          coordinates: {
            type: 'Point',
            coordinates: [40.7128, -74.006],
          },
        },
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        'location->name': 'Home',
        'location->coordinates': {
          type: 'Point',
          coordinates: [40.7128, -74.006],
        },
      });
    });

    it('should handle mixed nested and flat fields', () => {
      const input = {
        id: '1',
        flatField: 'value',
        nestedField: {
          subField: 'nestedValue',
        },
        anotherFlat: 123,
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        flatField: 'value',
        'nestedField->subField': 'nestedValue',
        anotherFlat: 123,
      });
    });

    it('should serialize dates in arrays', () => {
      const date1 = new Date('2023-01-15T10:00:00Z');
      const date2 = new Date('2023-01-16T10:00:00Z');
      const input = {
        id: '1',
        dates: [date1, date2],
      };

      const result = Serializer.serialize(input);

      expect(result).toEqual({
        id: '1',
        dates: ['2023-01-15T10:00:00.000Z', '2023-01-16T10:00:00.000Z'],
      });
    });
  });

  describe('unflatten', () => {
    it('should unflatten arrow-notation fields to nested objects', () => {
      const input = {
        id: '1',
        name: 'John',
        'address->city': 'Paris',
        'address->street': 'Main St',
      };

      const result = Serializer.unflatten(input);

      expect(result).toEqual({
        id: '1',
        name: 'John',
        address: {
          city: 'Paris',
          street: 'Main St',
        },
      });
    });

    it('should unflatten deeply nested fields', () => {
      const input = {
        id: '1',
        'user->profile->contact->email': 'test@example.com',
        'user->profile->name': 'John Doe',
      };

      const result = Serializer.unflatten(input);

      expect(result).toEqual({
        id: '1',
        user: {
          profile: {
            contact: {
              email: 'test@example.com',
            },
            name: 'John Doe',
          },
        },
      });
    });

    it('should handle mixed flat and nested fields', () => {
      const input = {
        id: '1',
        name: 'John',
        'address->city': 'Paris',
        age: 30,
      };

      const result = Serializer.unflatten(input);

      expect(result).toEqual({
        id: '1',
        name: 'John',
        address: {
          city: 'Paris',
        },
        age: 30,
      });
    });

    it('should handle arrays', () => {
      const input = {
        id: '1',
        tags: ['admin', 'user'],
        'metadata->roles': ['editor', 'viewer'],
      };

      const result = Serializer.unflatten(input);

      expect(result).toEqual({
        id: '1',
        tags: ['admin', 'user'],
        metadata: {
          roles: ['editor', 'viewer'],
        },
      });
    });

    it('should handle null values', () => {
      const input = {
        id: '1',
        'address->city': 'Paris',
        'address->zipCode': null,
      };

      const result = Serializer.unflatten(input);

      expect(result).toEqual({
        id: '1',
        address: {
          city: 'Paris',
          zipCode: null,
        },
      });
    });
  });

  describe('flatten and unflatten round-trip', () => {
    it('should maintain data integrity through flatten and unflatten', () => {
      const original = {
        id: '1',
        name: 'John',
        address: {
          city: 'Paris',
          street: 'Main St',
          coordinates: {
            lat: 48.8566,
            lng: 2.3522,
          },
        },
        tags: ['admin', 'user'],
      };

      const flattened = Serializer.serialize(original);
      const unflattened = Serializer.unflatten(flattened);

      expect(unflattened).toEqual(original);
    });
  });

  describe('serialize with shouldFlatten=false', () => {
    it('should not flatten when shouldFlatten is false', () => {
      const date = new Date('2023-01-15T10:00:00Z');
      const input = {
        id: '1',
        createdAt: date,
        address: {
          city: 'Paris',
        },
      };

      const result = Serializer.serialize(input, false);

      // Should only serialize dates, not flatten
      expect(result.createdAt).toBe('2023-01-15T10:00:00.000Z');
      expect(result.address).toEqual({ city: 'Paris' });
    });
  });
});
