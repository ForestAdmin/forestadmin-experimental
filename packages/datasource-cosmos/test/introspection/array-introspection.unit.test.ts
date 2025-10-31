import { CosmosClient } from '@azure/cosmos';

import Introspector from '../../src/introspection/introspector';

describe('Introspector > Array Field Introspection', () => {
  let mockCosmosClient: jest.Mocked<CosmosClient>;
  let mockContainer: any;
  let mockDatabase: any;
  let mockQuery: any;

  beforeEach(() => {
    mockQuery = {
      fetchAll: jest.fn(),
    };

    mockContainer = {
      items: {
        query: jest.fn().mockReturnValue(mockQuery),
      },
    };

    mockDatabase = {
      container: jest.fn().mockReturnValue(mockContainer),
    };

    mockCosmosClient = {
      database: jest.fn().mockReturnValue(mockDatabase),
    } as any;
  });

  describe('introspectArrayField', () => {
    it('should introspect array of objects with consistent schema', async () => {
      const mockDocuments = [
        {
          id: '1',
          arrayField: [
            { type: 'identity', status: 'validated', date: '2023-01-15' },
            { type: 'address', status: 'pending', date: '2023-01-16' },
          ],
        },
        {
          id: '2',
          arrayField: [{ type: 'income', status: 'validated', date: '2023-01-17' }],
        },
      ];

      mockQuery.fetchAll.mockResolvedValue({
        resources: mockDocuments,
      });

      const schema = await Introspector.introspectArrayField(
        mockCosmosClient,
        'test-db',
        'test-container',
        'kycDetails->diligences',
        100,
      );

      expect(schema).toBeDefined();
      expect(schema.type).toBeDefined();
      expect(schema.type.type).toBe('string');
      expect(schema.status).toBeDefined();
      expect(schema.status.type).toBe('string');
      expect(schema.date).toBeDefined();
      expect(schema.date.type).toBe('dateonly');
    });

    it('should handle empty arrays', async () => {
      const mockDocuments = [
        {
          id: '1',
          arrayField: [],
        },
      ];

      mockQuery.fetchAll.mockResolvedValue({
        resources: mockDocuments,
      });

      const schema = await Introspector.introspectArrayField(
        mockCosmosClient,
        'test-db',
        'test-container',
        'items',
        100,
      );

      expect(schema).toBeDefined();
      // Empty arrays should result in minimal schema
      expect(Object.keys(schema).length).toBe(0);
    });

    it('should handle missing array field', async () => {
      const mockDocuments = [
        {
          id: '1',
          arrayField: [{ name: 'item1' }],
        },
      ];

      mockQuery.fetchAll.mockResolvedValue({
        resources: mockDocuments,
      });

      const schema = await Introspector.introspectArrayField(
        mockCosmosClient,
        'test-db',
        'test-container',
        'items',
        100,
      );

      expect(schema).toBeDefined();
      // Should only introspect from documents that have the field
      expect(schema.name).toBeDefined();
      expect(schema.name.type).toBe('string');
    });

    it('should respect sample size parameter', async () => {
      const mockDocuments = Array.from({ length: 200 }, (_, i) => ({
        id: `${i}`,
        arrayField: [{ index: i }],
      }));

      mockQuery.fetchAll.mockResolvedValue({
        resources: mockDocuments,
      });

      await Introspector.introspectArrayField(
        mockCosmosClient,
        'test-db',
        'test-container',
        'items',
        50,
      );

      // Check that the query was called with the correct sample size
      const queryCall = mockContainer.items.query.mock.calls[0];
      expect(queryCall[0].query).toContain('TOP 50');
    });

    it('should infer correct data types for array items', async () => {
      const mockDocuments = [
        {
          id: '1',
          arrayField: [
            {
              timestamp: '2023-01-15T10:30:00Z',
              value: 42.5,
              isValid: true,
              uuid: '550e8400-e29b-41d4-a716-446655440000',
              date: '2023-01-15',
              time: '10:30:00',
            },
          ],
        },
      ];

      mockQuery.fetchAll.mockResolvedValue({
        resources: mockDocuments,
      });

      const schema = await Introspector.introspectArrayField(
        mockCosmosClient,
        'test-db',
        'test-container',
        'measurements',
        100,
      );

      expect(schema).toBeDefined();
      expect(schema.timestamp).toBeDefined();
      expect(schema.timestamp.type).toBe('date');
      expect(schema.value).toBeDefined();
      expect(schema.value.type).toBe('number');
      expect(schema.isValid).toBeDefined();
      expect(schema.isValid.type).toBe('boolean');
      expect(schema.uuid).toBeDefined();
      expect(schema.uuid.type).toBe('string');
      expect(schema.date).toBeDefined();
      expect(schema.date.type).toBe('dateonly');
      expect(schema.time).toBeDefined();
      expect(schema.time.type).toBe('timeonly');
    });

    it('should handle null and undefined values in array items', async () => {
      const mockDocuments = [
        {
          id: '1',
          arrayField: [
            { name: 'item1', value: null },
            { name: 'item2', value: undefined },
            { name: 'item3', value: 42 },
          ],
        },
      ];

      mockQuery.fetchAll.mockResolvedValue({
        resources: mockDocuments,
      });

      const schema = await Introspector.introspectArrayField(
        mockCosmosClient,
        'test-db',
        'test-container',
        'items',
        100,
      );

      expect(schema).toBeDefined();
      expect(schema.name).toBeDefined();
      expect(schema.name.type).toBe('string');
      // value should be inferred as number (ignoring nulls)
      expect(schema.value).toBeDefined();
      expect(schema.value.type).toBe('number');
    });

    it('should handle array items with GeoJSON points', async () => {
      const mockDocuments = [
        {
          id: '1',
          arrayField: [
            {
              name: 'Location 1',
              point: {
                type: 'Point',
                coordinates: [40.7128, -74.006],
              },
            },
          ],
        },
      ];

      mockQuery.fetchAll.mockResolvedValue({
        resources: mockDocuments,
      });

      const schema = await Introspector.introspectArrayField(
        mockCosmosClient,
        'test-db',
        'test-container',
        'locations',
        100,
      );

      expect(schema).toBeDefined();
      expect(schema.name).toBeDefined();
      expect(schema.name.type).toBe('string');
      expect(schema.point).toBeDefined();
      expect(schema.point.type).toBe('point');
    });
  });
});
