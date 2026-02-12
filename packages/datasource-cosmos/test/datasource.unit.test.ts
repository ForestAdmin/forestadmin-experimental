import { CosmosClient } from '@azure/cosmos';

import CosmosDataSource from '../src/datasource';

describe('CosmosDataSource', () => {
  let mockClient: jest.Mocked<CosmosClient>;
  let mockLogger: jest.Mock;

  beforeEach(() => {
    mockClient = {
      database: jest.fn().mockReturnValue({
        container: jest.fn().mockReturnValue({
          items: {
            query: jest.fn().mockReturnValue({
              fetchAll: jest.fn().mockResolvedValue({ resources: [] }),
            }),
          },
        }),
      }),
    } as unknown as jest.Mocked<CosmosClient>;

    mockLogger = jest.fn();
  });

  describe('constructor', () => {
    it('should throw if cosmosClient is null', () => {
      expect(() => new CosmosDataSource(null as unknown as CosmosClient, [], mockLogger)).toThrow(
        'Invalid (null) CosmosClient instance.',
      );
    });

    it('should register a native query connection when both options are provided', () => {
      const ds = new CosmosDataSource(mockClient, [], mockLogger, {
        liveQueryConnections: 'cosmos',
        liveQueryDatabase: 'mydb',
      });

      expect(Object.keys(ds.nativeQueryConnections)).toEqual(['cosmos']);
    });

    it('should not register a native query connection when liveQueryConnections is missing', () => {
      const ds = new CosmosDataSource(mockClient, [], mockLogger, {
        liveQueryDatabase: 'mydb',
      });

      expect(Object.keys(ds.nativeQueryConnections)).toEqual([]);
    });

    it('should not register a native query connection when liveQueryDatabase is missing', () => {
      const ds = new CosmosDataSource(mockClient, [], mockLogger, {
        liveQueryConnections: 'cosmos',
      });

      expect(Object.keys(ds.nativeQueryConnections)).toEqual([]);
    });

    it('should not register a native query connection when no options are provided', () => {
      const ds = new CosmosDataSource(mockClient, [], mockLogger);

      expect(Object.keys(ds.nativeQueryConnections)).toEqual([]);
    });
  });

  describe('executeNativeQuery', () => {
    let datasource: CosmosDataSource;
    let mockFetchAll: jest.Mock;

    beforeEach(() => {
      mockFetchAll = jest.fn().mockResolvedValue({ resources: [] });

      mockClient = {
        database: jest.fn().mockReturnValue({
          container: jest.fn().mockReturnValue({
            items: {
              query: jest.fn().mockReturnValue({ fetchAll: mockFetchAll }),
            },
          }),
        }),
      } as unknown as jest.Mocked<CosmosClient>;

      datasource = new CosmosDataSource(mockClient, [], mockLogger, {
        liveQueryConnections: 'cosmos',
        liveQueryDatabase: 'testdb',
      });
    });

    it('should throw for an unknown connection name', async () => {
      await expect(datasource.executeNativeQuery('unknown', 'SELECT * FROM c')).rejects.toThrow(
        "Unknown connection name 'unknown'",
      );
    });

    it('should extract container name from query and execute against it', async () => {
      mockFetchAll.mockResolvedValue({ resources: [{ id: '1' }] });

      await datasource.executeNativeQuery('cosmos', 'SELECT * FROM Operations c');

      expect(mockClient.database).toHaveBeenCalledWith('testdb');
      expect(mockClient.database('testdb').container).toHaveBeenCalledWith('Operations');
    });

    it('should replace $placeholders with parameterized values', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });

      await datasource.executeNativeQuery(
        'cosmos',
        'SELECT * FROM Operations c WHERE c.status = $status',
        { status: 'active' },
      );

      const mockQuery = mockClient.database('testdb').container('Operations').items.query;
      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT * FROM Operations c WHERE c.status = @param0',
        parameters: [{ name: '@param0', value: 'active' }],
      });
    });

    it('should replace multiple placeholders', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });

      await datasource.executeNativeQuery(
        'cosmos',
        'SELECT * FROM Items c WHERE c.age > $minAge AND c.status = $status',
        { minAge: 18, status: 'active' },
      );

      const mockQuery = mockClient.database('testdb').container('Items').items.query;
      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT * FROM Items c WHERE c.age > @param0 AND c.status = @param1',
        parameters: [
          { name: '@param0', value: 18 },
          { name: '@param1', value: 'active' },
        ],
      });
    });

    it('should keep unresolved placeholders as-is', async () => {
      mockFetchAll.mockResolvedValue({ resources: [] });

      await datasource.executeNativeQuery(
        'cosmos',
        'SELECT * FROM Ops c WHERE c.status = $status AND c.type = $missing',
        { status: 'done' },
      );

      const mockQuery = mockClient.database('testdb').container('Ops').items.query;
      expect(mockQuery).toHaveBeenCalledWith({
        query: 'SELECT * FROM Ops c WHERE c.status = @param0 AND c.type = $missing',
        parameters: [{ name: '@param0', value: 'done' }],
      });
    });

    it('should throw if query has no FROM clause', async () => {
      await expect(datasource.executeNativeQuery('cosmos', 'SELECT 1')).rejects.toThrow(
        'Invalid query: could not extract container name from FROM clause',
      );
    });

    describe('renameReservedAliases', () => {
      it('should rename _value to value', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ _value: 313.04 }],
        });

        const result = await datasource.executeNativeQuery(
          'cosmos',
          'SELECT SUM(c.amount) AS _value FROM Operations c',
        );

        expect(result).toEqual([{ value: 313.04 }]);
      });

      it('should rename _key to key', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ _key: 'PAYIN', _value: 100 }],
        });

        const result = await datasource.executeNativeQuery(
          'cosmos',
          'SELECT c.type AS _key, COUNT(1) AS _value FROM Operations c',
        );

        expect(result).toEqual([{ key: 'PAYIN', value: 100 }]);
      });

      it('should rename _previous to previous', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ _value: 500, _previous: 400 }],
        });

        const result = await datasource.executeNativeQuery(
          'cosmos',
          'SELECT SUM(c.current) AS _value, SUM(c.prev) AS _previous FROM Operations c',
        );

        expect(result).toEqual([{ value: 500, previous: 400 }]);
      });

      it('should rename _objective to objective', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ _value: 75, _objective: 100 }],
        });

        const result = await datasource.executeNativeQuery(
          'cosmos',
          'SELECT c.progress AS _value, c.target AS _objective FROM Operations c',
        );

        expect(result).toEqual([{ value: 75, objective: 100 }]);
      });

      it('should rename all reserved aliases in a single row', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ _key: 'test', _value: 42, _previous: 30, _objective: 50 }],
        });

        const result = await datasource.executeNativeQuery('cosmos', 'SELECT 1 FROM Operations c');

        expect(result).toEqual([{ key: 'test', value: 42, previous: 30, objective: 50 }]);
      });

      it('should not rename columns that are not reserved aliases', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ total: 100, count: 5, name: 'test' }],
        });

        const result = await datasource.executeNativeQuery('cosmos', 'SELECT 1 FROM Operations c');

        expect(result).toEqual([{ total: 100, count: 5, name: 'test' }]);
      });

      it('should handle mixed reserved and non-reserved aliases', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ _value: 100, total: 200, _key: 'A', label: 'test' }],
        });

        const result = await datasource.executeNativeQuery('cosmos', 'SELECT 1 FROM Operations c');

        expect(result).toEqual([{ value: 100, total: 200, key: 'A', label: 'test' }]);
      });

      it('should not rename underscore-prefixed columns not in the alias map', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ _id: '123', _ts: 1234567890, _value: 42 }],
        });

        const result = await datasource.executeNativeQuery('cosmos', 'SELECT 1 FROM Operations c');

        expect(result).toEqual([{ _id: '123', _ts: 1234567890, value: 42 }]);
      });

      it('should handle empty results', async () => {
        mockFetchAll.mockResolvedValue({ resources: [] });

        const result = await datasource.executeNativeQuery('cosmos', 'SELECT 1 FROM Operations c');

        expect(result).toEqual([]);
      });

      it('should handle multiple rows', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [
            { _key: 'PAYIN', _value: 100 },
            { _key: 'PAYOUT', _value: 200 },
            { _key: 'TRANSFER', _value: 50 },
          ],
        });

        const result = await datasource.executeNativeQuery('cosmos', 'SELECT 1 FROM Operations c');

        expect(result).toEqual([
          { key: 'PAYIN', value: 100 },
          { key: 'PAYOUT', value: 200 },
          { key: 'TRANSFER', value: 50 },
        ]);
      });

      it('should handle rows with no properties needing renaming', async () => {
        mockFetchAll.mockResolvedValue({
          resources: [{ id: '1', status: 'active' }],
        });

        const result = await datasource.executeNativeQuery('cosmos', 'SELECT 1 FROM Operations c');

        expect(result).toEqual([{ id: '1', status: 'active' }]);
      });
    });
  });
});
