/**
 * Tests for airtable-datasource.js
 * Tests schema discovery, base/table filtering, and collection registration
 */

// Mock modules before requiring the actual code
jest.mock('airtable');
jest.mock('axios');

const Airtable = require('airtable');
const axios = require('axios');
const AirtableDataSource = require('../src/airtable-datasource');
const {
  createMockBaseInfo,
  createMockTableSchema,
  createMockFields,
  suppressConsole,
  captureConsole,
} = require('./test-utils');

describe('AirtableDataSource', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Reset environment
    process.env = { ...originalEnv };
    process.env.AIRTABLE_API_KEY = 'test-api-key';

    // Setup Airtable mock
    Airtable.configure = jest.fn();
    Airtable.base = jest.fn(() => jest.fn());
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should use provided API key', () => {
      const ds = new AirtableDataSource({ apiKey: 'my-api-key' });

      expect(ds.apiKey).toBe('my-api-key');
    });

    it('should use AIRTABLE_API_KEY env var if no apiKey provided', () => {
      const ds = new AirtableDataSource({});

      expect(ds.apiKey).toBe('test-api-key');
    });

    it('should throw error if no API key available', () => {
      delete process.env.AIRTABLE_API_KEY;

      expect(() => new AirtableDataSource({})).toThrow('Airtable API key is required');
    });

    it('should configure Airtable SDK', () => {
      new AirtableDataSource({ apiKey: 'my-key' });

      expect(Airtable.configure).toHaveBeenCalledWith({ apiKey: 'my-key' });
    });

    it('should configure custom endpoint URL', () => {
      new AirtableDataSource({
        apiKey: 'my-key',
        endpointUrl: 'https://custom.api.com',
      });

      expect(Airtable.configure).toHaveBeenCalledWith({
        apiKey: 'my-key',
        endpointUrl: 'https://custom.api.com',
      });
    });

    it('should set default collection name formatter', () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      const name = ds.options.collectionNameFormatter(
        { name: 'MyBase' },
        { name: 'MyTable' }
      );

      expect(name).toBe('MyBase - MyTable');
    });

    it('should use custom collection name formatter', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        collectionNameFormatter: (base, table) => `${table.name}`,
      });

      const name = ds.options.collectionNameFormatter(
        { name: 'MyBase' },
        { name: 'MyTable' }
      );

      expect(name).toBe('MyTable');
    });

    it('should initialize empty bases map', () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      expect(ds.bases).toBeInstanceOf(Map);
      expect(ds.bases.size).toBe(0);
    });

    it('should store filter options', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        includeBases: ['Base1'],
        excludeBases: ['Base2'],
        includeTables: ['Table1'],
        excludeTables: ['Table2'],
      });

      expect(ds.options.includeBases).toEqual(['Base1']);
      expect(ds.options.excludeBases).toEqual(['Base2']);
      expect(ds.options.includeTables).toEqual(['Table1']);
      expect(ds.options.excludeTables).toEqual(['Table2']);
    });
  });

  describe('_getHeaders()', () => {
    it('should return authorization header with Bearer token', () => {
      const ds = new AirtableDataSource({ apiKey: 'my-secret-key' });

      const headers = ds._getHeaders();

      expect(headers.Authorization).toBe('Bearer my-secret-key');
    });

    it('should include Content-Type header', () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      const headers = ds._getHeaders();

      expect(headers['Content-Type']).toBe('application/json');
    });
  });

  describe('_fetchBases()', () => {
    it('should fetch bases from Meta API', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get.mockResolvedValue({
        data: {
          bases: [
            createMockBaseInfo('base1', 'Base One'),
            createMockBaseInfo('base2', 'Base Two'),
          ],
        },
      });

      const bases = await suppressConsole(() => ds._fetchBases());

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/meta/bases',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer key',
          }),
        })
      );

      expect(bases).toHaveLength(2);
      expect(bases[0].name).toBe('Base One');
    });

    it('should handle empty bases response', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get.mockResolvedValue({ data: {} });

      const bases = await suppressConsole(() => ds._fetchBases());

      expect(bases).toEqual([]);
    });

    it('should throw error on API failure', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get.mockRejectedValue(new Error('Network error'));

      await expect(suppressConsole(() => ds._fetchBases())).rejects.toThrow('Failed to fetch Airtable bases');
    });
  });

  describe('_fetchBaseSchema()', () => {
    it('should fetch schema for a base', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      const mockSchema = {
        tables: [
          createMockTableSchema('tbl1', 'Table 1', createMockFields([{ name: 'Name', type: 'singleLineText' }])),
        ],
      };

      axios.get.mockResolvedValue({ data: mockSchema });

      const schema = await ds._fetchBaseSchema('base123');

      expect(axios.get).toHaveBeenCalledWith(
        'https://api.airtable.com/v0/meta/bases/base123/tables',
        expect.any(Object)
      );

      expect(schema).toEqual(mockSchema);
    });

    it('should throw error on API failure', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get.mockRejectedValue(new Error('Not found'));

      await expect(suppressConsole(() => ds._fetchBaseSchema('base123'))).rejects.toThrow('Failed to fetch schema');
    });
  });

  describe('_shouldIncludeBase()', () => {
    it('should include all bases when no filters specified', () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      expect(ds._shouldIncludeBase({ name: 'Any Base' })).toBe(true);
    });

    it('should only include bases in includeBases', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        includeBases: ['Base A', 'Base B'],
      });

      expect(ds._shouldIncludeBase({ name: 'Base A' })).toBe(true);
      expect(ds._shouldIncludeBase({ name: 'Base C' })).toBe(false);
    });

    it('should exclude bases in excludeBases', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        excludeBases: ['Base X'],
      });

      expect(ds._shouldIncludeBase({ name: 'Base A' })).toBe(true);
      expect(ds._shouldIncludeBase({ name: 'Base X' })).toBe(false);
    });

    it('should prioritize includeBases over excludeBases', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        includeBases: ['Base A'],
        excludeBases: ['Base A'], // Should be ignored
      });

      expect(ds._shouldIncludeBase({ name: 'Base A' })).toBe(true);
    });
  });

  describe('_shouldIncludeTable()', () => {
    it('should include all tables when no filters specified', () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      expect(ds._shouldIncludeTable({ name: 'Any Table' })).toBe(true);
    });

    it('should only include tables in includeTables', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        includeTables: ['Table A', 'Table B'],
      });

      expect(ds._shouldIncludeTable({ name: 'Table A' })).toBe(true);
      expect(ds._shouldIncludeTable({ name: 'Table C' })).toBe(false);
    });

    it('should exclude tables in excludeTables', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        excludeTables: ['Archive'],
      });

      expect(ds._shouldIncludeTable({ name: 'Users' })).toBe(true);
      expect(ds._shouldIncludeTable({ name: 'Archive' })).toBe(false);
    });

    it('should prioritize includeTables over excludeTables', () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        includeTables: ['Table A'],
        excludeTables: ['Table A'],
      });

      expect(ds._shouldIncludeTable({ name: 'Table A' })).toBe(true);
    });
  });

  describe('initialize()', () => {
    beforeEach(() => {
      Airtable.base = jest.fn(() => jest.fn());
    });

    it('should discover bases and register collections', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      // Mock API responses
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [createMockBaseInfo('base1', 'Test Base')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [
              createMockTableSchema(
                'tbl1',
                'Users',
                createMockFields([{ name: 'Name', type: 'singleLineText' }])
              ),
            ],
          },
        });

      await suppressConsole(() => ds.initialize());

      expect(ds.collections).toHaveLength(1);
      expect(ds.collections[0].name).toBe('Test Base - Users');
    });

    it('should filter bases by includeBases', async () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        includeBases: ['Included Base'],
      });

      axios.get.mockResolvedValueOnce({
        data: {
          bases: [
            createMockBaseInfo('base1', 'Included Base'),
            createMockBaseInfo('base2', 'Excluded Base'),
          ],
        },
      });

      // Only mock schema for included base
      axios.get.mockResolvedValueOnce({
        data: {
          tables: [
            createMockTableSchema('tbl1', 'Table', createMockFields([{ name: 'Name', type: 'singleLineText' }])),
          ],
        },
      });

      await suppressConsole(() => ds.initialize());

      // Should only fetch schema for included base
      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(ds.collections).toHaveLength(1);
    });

    it('should filter tables by excludeTables', async () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        excludeTables: ['Archive'],
      });

      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [createMockBaseInfo('base1', 'Base')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [
              createMockTableSchema('tbl1', 'Users', createMockFields([{ name: 'Name', type: 'singleLineText' }])),
              createMockTableSchema('tbl2', 'Archive', createMockFields([{ name: 'Data', type: 'singleLineText' }])),
            ],
          },
        });

      await suppressConsole(() => ds.initialize());

      expect(ds.collections).toHaveLength(1);
      expect(ds.collections[0].name).toBe('Base - Users');
    });

    it('should use custom collection name formatter', async () => {
      const ds = new AirtableDataSource({
        apiKey: 'key',
        collectionNameFormatter: (base, table) => `custom_${table.name}`,
      });

      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [createMockBaseInfo('base1', 'Base')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [
              createMockTableSchema('tbl1', 'Users', createMockFields([{ name: 'Name', type: 'singleLineText' }])),
            ],
          },
        });

      await suppressConsole(() => ds.initialize());

      expect(ds.collections[0].name).toBe('custom_Users');
    });

    it('should continue on base schema error', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [
              createMockBaseInfo('base1', 'Failing Base'),
              createMockBaseInfo('base2', 'Working Base'),
            ],
          },
        })
        .mockRejectedValueOnce(new Error('Schema error'))
        .mockResolvedValueOnce({
          data: {
            tables: [
              createMockTableSchema('tbl1', 'Table', createMockFields([{ name: 'Name', type: 'singleLineText' }])),
            ],
          },
        });

      await suppressConsole(() => ds.initialize());

      // Should still have one collection from the working base
      expect(ds.collections).toHaveLength(1);
    });

    it('should store base instances in map', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [createMockBaseInfo('base1', 'Base')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [
              createMockTableSchema('tbl1', 'Table', createMockFields([{ name: 'Name', type: 'singleLineText' }])),
            ],
          },
        });

      await suppressConsole(() => ds.initialize());

      expect(ds.bases.has('base1')).toBe(true);
    });

    it('should handle empty tables array', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [createMockBaseInfo('base1', 'Base')],
          },
        })
        .mockResolvedValueOnce({
          data: { tables: [] },
        });

      await suppressConsole(() => ds.initialize());

      expect(ds.collections).toHaveLength(0);
    });

    it('should handle undefined tables', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [createMockBaseInfo('base1', 'Base')],
          },
        })
        .mockResolvedValueOnce({
          data: {},
        });

      await suppressConsole(() => ds.initialize());

      expect(ds.collections).toHaveLength(0);
    });

    it('should log progress', async () => {
      const ds = new AirtableDataSource({ apiKey: 'key' });

      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [createMockBaseInfo('base1', 'Base')],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [
              createMockTableSchema('tbl1', 'Table', createMockFields([{ name: 'Name', type: 'singleLineText' }])),
            ],
          },
        });

      const { logs } = await captureConsole(() => ds.initialize());

      expect(logs.some(l => l.includes('Initializing'))).toBe(true);
      expect(logs.some(l => l.includes('Found'))).toBe(true);
      expect(logs.some(l => l.includes('Processing'))).toBe(true);
      expect(logs.some(l => l.includes('Registering'))).toBe(true);
      expect(logs.some(l => l.includes('initialized'))).toBe(true);
    });
  });
});
