/**
 * Tests for index.js (factory function and exports)
 */

// Mock modules at top level
jest.mock('airtable');
jest.mock('axios');

describe('index.js exports', () => {
  const originalEnv = process.env;
  let Airtable;
  let axios;

  beforeEach(() => {
    jest.resetModules();

    // Re-require mocked modules after reset
    Airtable = require('airtable');
    axios = require('axios');

    process.env = { ...originalEnv };
    process.env.AIRTABLE_API_KEY = 'test-api-key';

    // Setup Airtable mock
    Airtable.configure = jest.fn();
    Airtable.base = jest.fn(() => jest.fn());

    // Setup axios mock with default behavior
    axios.get = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('module exports', () => {
    it('should export createAirtableDataSource as default', () => {
      const createAirtableDataSource = require('../src/index');

      expect(typeof createAirtableDataSource).toBe('function');
    });

    it('should export createAirtableDataSource as named export', () => {
      const { createAirtableDataSource } = require('../src/index');

      expect(typeof createAirtableDataSource).toBe('function');
    });

    it('should export AirtableDataSource class', () => {
      const { AirtableDataSource } = require('../src/index');

      expect(typeof AirtableDataSource).toBe('function');
      expect(AirtableDataSource.name).toBe('AirtableDataSource');
    });

    it('should export AirtableCollection class', () => {
      const { AirtableCollection } = require('../src/index');

      expect(typeof AirtableCollection).toBe('function');
      expect(AirtableCollection.name).toBe('AirtableCollection');
    });

    it('should export fieldMapper utilities', () => {
      const { fieldMapper } = require('../src/index');

      expect(fieldMapper).toBeDefined();
      expect(typeof fieldMapper.getColumnType).toBe('function');
      expect(typeof fieldMapper.isReadOnly).toBe('function');
      expect(typeof fieldMapper.getOperators).toBe('function');
      expect(typeof fieldMapper.transformValue).toBe('function');
      expect(typeof fieldMapper.prepareValueForWrite).toBe('function');
    });

    it('should export filterBuilder utilities', () => {
      const { filterBuilder } = require('../src/index');

      expect(filterBuilder).toBeDefined();
      expect(typeof filterBuilder.buildFilterFormula).toBe('function');
      expect(typeof filterBuilder.buildSort).toBe('function');
      expect(typeof filterBuilder.buildFields).toBe('function');
      expect(typeof filterBuilder.extractRecordId).toBe('function');
      expect(typeof filterBuilder.extractRecordIds).toBe('function');
    });

    it('should export constants', () => {
      const { constants } = require('../src/index');

      expect(constants).toBeDefined();
      expect(constants.BATCH_SIZE).toBe(10);
      expect(constants.DEFAULT_PAGE_SIZE).toBe(100);
      expect(constants.MAX_PAGE_SIZE).toBe(100);
      expect(constants.AIRTABLE_META_URL).toBe('https://api.airtable.com/v0/meta');
    });
  });

  describe('createAirtableDataSource()', () => {
    it('should return an async factory function', () => {
      const createAirtableDataSource = require('../src/index');

      const factory = createAirtableDataSource();

      expect(typeof factory).toBe('function');
    });

    it('should create and initialize datasource when called', async () => {
      axios.get.mockResolvedValueOnce({ data: { bases: [] } });

      const createAirtableDataSource = require('../src/index');
      const factory = createAirtableDataSource({ apiKey: 'test-key' });
      const dataSource = await factory();

      expect(dataSource).toBeDefined();
      expect(dataSource.apiKey).toBe('test-key');
    });

    it('should pass options to AirtableDataSource', async () => {
      axios.get.mockResolvedValueOnce({ data: { bases: [] } });

      const createAirtableDataSource = require('../src/index');
      const factory = createAirtableDataSource({
        apiKey: 'my-key',
        includeBases: ['Base1'],
        excludeTables: ['Archive'],
      });

      const dataSource = await factory();

      expect(dataSource.options.includeBases).toEqual(['Base1']);
      expect(dataSource.options.excludeTables).toEqual(['Archive']);
    });

    it('should use default options when called without arguments', async () => {
      axios.get.mockResolvedValueOnce({ data: { bases: [] } });

      const createAirtableDataSource = require('../src/index');
      const factory = createAirtableDataSource();
      const dataSource = await factory();

      expect(dataSource.apiKey).toBe('test-api-key'); // From env
      expect(dataSource.options.includeBases).toBeNull();
      expect(dataSource.options.excludeBases).toEqual([]);
    });

    it('should throw error if API key is missing', async () => {
      delete process.env.AIRTABLE_API_KEY;

      const createAirtableDataSource = require('../src/index');
      const factory = createAirtableDataSource({});

      await expect(factory()).rejects.toThrow('Airtable API key is required');
    });
  });

  describe('factory function usage examples', () => {
    it('should work with Forest Admin agent pattern', async () => {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'Test' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Users',
              fields: [{ id: 'fld1', name: 'Name', type: 'singleLineText' }],
            }],
          },
        });

      const createAirtableDataSource = require('../src/index');

      // Simulate Forest Admin agent.addDataSource pattern
      const factory = createAirtableDataSource({ apiKey: 'key' });
      const dataSource = await factory();

      expect(dataSource.collections).toHaveLength(1);
    });

    it('should support custom collection naming', async () => {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'MyBase' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Users',
              fields: [{ id: 'fld1', name: 'Name', type: 'singleLineText' }],
            }],
          },
        });

      const createAirtableDataSource = require('../src/index');
      const factory = createAirtableDataSource({
        apiKey: 'key',
        collectionNameFormatter: (base, table) => table.name,
      });

      const dataSource = await factory();

      expect(dataSource.collections[0].name).toBe('Users');
    });

    it('should support filtering bases and tables', async () => {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [
              { id: 'base1', name: 'Production' },
              { id: 'base2', name: 'Test' },
            ],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [
              { id: 'tbl1', name: 'Users', fields: [] },
              { id: 'tbl2', name: 'Archive', fields: [] },
            ],
          },
        });

      const createAirtableDataSource = require('../src/index');
      const factory = createAirtableDataSource({
        apiKey: 'key',
        includeBases: ['Production'],
        excludeTables: ['Archive'],
      });

      const dataSource = await factory();

      expect(dataSource.collections).toHaveLength(1);
      expect(dataSource.collections[0].name).toBe('Production - Users');
    });
  });
});
