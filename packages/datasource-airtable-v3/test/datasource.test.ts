/**
 * Tests for AirtableDataSource
 */

import AirtableDataSource from '../src/datasource';
import AirtableModel from '../src/model-builder/model';

// Mock the AirtableModel
jest.mock('../src/model-builder/model');

describe('AirtableDataSource', () => {
  let mockModels: jest.Mocked<AirtableModel>[];
  let mockBases: Map<string, any>;
  let mockLogger: jest.Mock;

  beforeEach(() => {
    // Create mock models
    mockModels = [
      {
        name: 'Users',
        baseId: 'appBase1',
        tableId: 'tblUsers',
        enableCount: true,
        getFields: jest.fn().mockReturnValue([
          { id: 'fld1', name: 'Name', type: 'singleLineText' },
          { id: 'fld2', name: 'Email', type: 'email' },
        ]),
        findById: jest.fn(),
        findByIds: jest.fn(),
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as unknown as jest.Mocked<AirtableModel>,
      {
        name: 'Products',
        baseId: 'appBase1',
        tableId: 'tblProducts',
        enableCount: true,
        getFields: jest.fn().mockReturnValue([
          { id: 'fld1', name: 'Title', type: 'singleLineText' },
          { id: 'fld2', name: 'Price', type: 'currency' },
        ]),
        findById: jest.fn(),
        findByIds: jest.fn(),
        query: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as unknown as jest.Mocked<AirtableModel>,
    ];

    // Create mock bases
    mockBases = new Map([
      ['appBase1', { id: 'appBase1' }],
    ]);

    mockLogger = jest.fn();
  });

  describe('constructor', () => {
    it('should create datasource with collections', () => {
      const datasource = new AirtableDataSource(mockModels, mockBases, mockLogger);

      expect(datasource.collections).toHaveLength(2);
      expect(mockLogger).toHaveBeenCalledWith('Info', 'AirtableDataSource - Initialized');
      expect(mockLogger).toHaveBeenCalledWith('Info', 'AirtableDataSource - Created 2 collections');
    });

    it('should sort collections by name', () => {
      const datasource = new AirtableDataSource(mockModels, mockBases, mockLogger);

      // Collections should be sorted alphabetically
      const collectionNames = datasource.collections.map(c => c.name);

      expect(collectionNames).toEqual(['Products', 'Users']);
    });

    it('should work without logger', () => {
      const datasource = new AirtableDataSource(mockModels, mockBases);

      expect(datasource.collections).toHaveLength(2);
    });
  });

  describe('getBase', () => {
    it('should return base by ID', () => {
      const datasource = new AirtableDataSource(mockModels, mockBases, mockLogger);

      const base = datasource.getBase('appBase1');

      expect(base).toEqual({ id: 'appBase1' });
    });

    it('should return undefined for unknown base ID', () => {
      const datasource = new AirtableDataSource(mockModels, mockBases, mockLogger);

      const base = datasource.getBase('unknownBase');

      expect(base).toBeUndefined();
    });
  });

  describe('getCollection', () => {
    it('should return collection by name', () => {
      const datasource = new AirtableDataSource(mockModels, mockBases, mockLogger);

      const collection = datasource.getCollection('Users');

      expect(collection).toBeDefined();
      expect(collection.name).toBe('Users');
    });

    it('should throw for unknown collection', () => {
      const datasource = new AirtableDataSource(mockModels, mockBases, mockLogger);

      expect(() => datasource.getCollection('Unknown')).toThrow();
    });
  });

  describe('empty datasource', () => {
    it('should handle empty models array', () => {
      const datasource = new AirtableDataSource([], mockBases, mockLogger);

      expect(datasource.collections).toHaveLength(0);
      expect(mockLogger).toHaveBeenCalledWith('Info', 'AirtableDataSource - Created 0 collections');
    });
  });
});
