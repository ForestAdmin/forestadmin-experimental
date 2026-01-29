/**
 * Tests for AirtableCollection
 */

import { Projection } from '@forestadmin/datasource-toolkit';

import AirtableCollection from '../src/collection';
import AirtableDataSource from '../src/datasource';
import AirtableModel from '../src/model-builder/model';

// Mock the AirtableModel
jest.mock('../src/model-builder/model');

describe('AirtableCollection', () => {
  let mockModel: jest.Mocked<AirtableModel>;
  let mockDataSource: AirtableDataSource;
  let collection: AirtableCollection;
  let mockLogger: jest.Mock;

  beforeEach(() => {
    // Create mock model
    mockModel = {
      name: 'TestCollection',
      baseId: 'appTest123',
      tableId: 'tblTest123',
      enableCount: true,
      getFields: jest.fn().mockReturnValue([
        { id: 'fld1', name: 'Name', type: 'singleLineText' },
        { id: 'fld2', name: 'Email', type: 'email' },
        { id: 'fld3', name: 'Age', type: 'number' },
        { id: 'fld4', name: 'Active', type: 'checkbox' },
        {
          id: 'fld5',
          name: 'Status',
          type: 'singleSelect',
          options: { choices: [{ name: 'Active' }, { name: 'Inactive' }] },
        },
      ]),
      findById: jest.fn(),
      findByIds: jest.fn(),
      query: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<AirtableModel>;

    mockLogger = jest.fn();

    // Create mock datasource (minimal implementation)
    mockDataSource = {
      collections: [],
      getCollection: jest.fn(),
      addCollection: jest.fn(),
    } as unknown as AirtableDataSource;

    // Create collection
    collection = new AirtableCollection(mockDataSource, mockModel, mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with correct name', () => {
      expect(collection.name).toBe('TestCollection');
    });

    it('should register schema fields', () => {
      const { schema } = collection;
      const fields = schema.fields as Record<string, any>;

      expect(fields.id).toBeDefined();
      expect(fields.id.type).toBe('Column');
      expect(fields.id.columnType).toBe('String');
      expect(fields.id.isPrimaryKey).toBe(true);

      expect(fields.Name).toBeDefined();
      expect(fields.Name.columnType).toBe('String');

      expect(fields.Email).toBeDefined();
      expect(fields.Email.columnType).toBe('String');

      expect(fields.Age).toBeDefined();
      expect(fields.Age.columnType).toBe('Number');

      expect(fields.Active).toBeDefined();
      expect(fields.Active.columnType).toBe('Boolean');

      expect(fields.Status).toBeDefined();
      expect(fields.Status.columnType).toBe('Enum');
    });
  });

  describe('list', () => {
    const mockCaller = { id: 1, email: 'test@example.com' } as any;

    it('should fetch single record by ID', async () => {
      const mockRecord = { id: 'rec123', Name: 'John', Email: 'john@example.com' };
      mockModel.findById.mockResolvedValue(mockRecord);

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'rec123' },
      } as any;

      const result = await collection.list(mockCaller, filter, new Projection('id', 'Name'));

      expect(mockModel.findById).toHaveBeenCalledWith('rec123');
      expect(result).toEqual([mockRecord]);
    });

    it('should return empty array when single record not found', async () => {
      mockModel.findById.mockResolvedValue(null);

      const filter = {
        conditionTree: { field: 'id', operator: 'Equal', value: 'rec123' },
      } as any;

      const result = await collection.list(mockCaller, filter, new Projection('id'));

      expect(result).toEqual([]);
    });

    it('should fetch multiple records by IDs', async () => {
      const mockRecords = [
        { id: 'rec1', Name: 'John' },
        { id: 'rec2', Name: 'Jane' },
      ];
      mockModel.findByIds.mockResolvedValue(mockRecords);

      const filter = {
        conditionTree: { field: 'id', operator: 'In', value: ['rec1', 'rec2'] },
      } as any;

      const result = await collection.list(mockCaller, filter, new Projection('id', 'Name'));

      expect(mockModel.findByIds).toHaveBeenCalledWith(['rec1', 'rec2']);
      expect(result).toEqual(mockRecords);
    });

    it('should query with filter formula', async () => {
      const mockRecords = [
        { id: 'rec1', Name: 'John', Active: true },
        { id: 'rec2', Name: 'Jane', Active: true },
      ];
      mockModel.query.mockResolvedValue(mockRecords);

      const filter = {
        conditionTree: { field: 'Active', operator: 'Equal', value: true },
      } as any;

      const result = await collection.list(mockCaller, filter, new Projection('id', 'Name'));

      expect(mockModel.query).toHaveBeenCalledWith({
        filterByFormula: '{Active} = TRUE()',
        sort: [],
        fields: ['Name'],
      });
      expect(result).toEqual(mockRecords);
    });

    it('should apply pagination', async () => {
      const mockRecords = [
        { id: 'rec1', Name: 'A' },
        { id: 'rec2', Name: 'B' },
        { id: 'rec3', Name: 'C' },
        { id: 'rec4', Name: 'D' },
        { id: 'rec5', Name: 'E' },
      ];
      mockModel.query.mockResolvedValue(mockRecords);

      const filter = {
        page: { skip: 1, limit: 2 },
      } as any;

      const result = await collection.list(mockCaller, filter, new Projection());

      expect(result).toEqual([
        { id: 'rec2', Name: 'B' },
        { id: 'rec3', Name: 'C' },
      ]);
    });

    it('should handle errors', async () => {
      mockModel.query.mockRejectedValue(new Error('API Error'));

      await expect(collection.list(mockCaller, {} as any, new Projection())).rejects.toThrow(
        'Failed to list records: API Error',
      );

      expect(mockLogger).toHaveBeenCalledWith('Error', expect.stringContaining('API Error'));
    });
  });

  describe('create', () => {
    const mockCaller = { id: 1 } as any;

    it('should create records', async () => {
      const inputData = [{ Name: 'John', Email: 'john@example.com' }];
      const createdRecord = { id: 'rec123', Name: 'John', Email: 'john@example.com' };
      mockModel.create.mockResolvedValue([createdRecord]);

      const result = await collection.create(mockCaller, inputData);

      expect(mockModel.create).toHaveBeenCalledWith(inputData);
      expect(result).toEqual([createdRecord]);
    });

    it('should handle create errors', async () => {
      mockModel.create.mockRejectedValue(new Error('Create failed'));

      await expect(collection.create(mockCaller, [{ Name: 'Test' }])).rejects.toThrow(
        'Failed to create records: Create failed',
      );
    });
  });

  describe('update', () => {
    const mockCaller = { id: 1 } as any;

    it('should update records', async () => {
      const mockRecords = [{ id: 'rec1' }, { id: 'rec2' }];
      mockModel.query.mockResolvedValue(mockRecords);
      mockModel.update.mockResolvedValue(undefined);

      const filter = {
        conditionTree: { field: 'Active', operator: 'Equal', value: true },
      } as any;

      await collection.update(mockCaller, filter, { Active: false });

      expect(mockModel.update).toHaveBeenCalledWith(['rec1', 'rec2'], { Active: false });
    });

    it('should not update when no records match', async () => {
      mockModel.query.mockResolvedValue([]);

      const filter = {
        conditionTree: { field: 'Active', operator: 'Equal', value: true },
      } as any;

      await collection.update(mockCaller, filter, { Active: false });

      expect(mockModel.update).not.toHaveBeenCalled();
    });

    it('should handle update errors', async () => {
      mockModel.query.mockResolvedValue([{ id: 'rec1' }]);
      mockModel.update.mockRejectedValue(new Error('Update failed'));

      await expect(collection.update(mockCaller, {} as any, { Name: 'Test' })).rejects.toThrow(
        'Failed to update records: Update failed',
      );
    });
  });

  describe('delete', () => {
    const mockCaller = { id: 1 } as any;

    it('should delete records', async () => {
      const mockRecords = [{ id: 'rec1' }, { id: 'rec2' }];
      mockModel.query.mockResolvedValue(mockRecords);
      mockModel.delete.mockResolvedValue(undefined);

      const filter = {
        conditionTree: { field: 'Active', operator: 'Equal', value: false },
      } as any;

      await collection.delete(mockCaller, filter);

      expect(mockModel.delete).toHaveBeenCalledWith(['rec1', 'rec2']);
    });

    it('should not delete when no records match', async () => {
      mockModel.query.mockResolvedValue([]);

      await collection.delete(mockCaller, {} as any);

      expect(mockModel.delete).not.toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      mockModel.query.mockResolvedValue([{ id: 'rec1' }]);
      mockModel.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(collection.delete(mockCaller, {} as any)).rejects.toThrow(
        'Failed to delete records: Delete failed',
      );
    });
  });

  describe('aggregate', () => {
    const mockCaller = { id: 1 } as any;

    it('should perform count aggregation', async () => {
      const mockRecords = [
        { id: 'rec1', Age: 25 },
        { id: 'rec2', Age: 30 },
        { id: 'rec3', Age: 35 },
      ];
      mockModel.query.mockResolvedValue(mockRecords);

      const aggregation = {
        operation: 'Count',
        groups: [],
      } as any;

      const result = await collection.aggregate(mockCaller, {} as any, aggregation);

      expect(result).toEqual([{ value: 3, group: {} }]);
    });

    it('should perform sum aggregation', async () => {
      const mockRecords = [
        { id: 'rec1', Age: 25 },
        { id: 'rec2', Age: 30 },
        { id: 'rec3', Age: 35 },
      ];
      mockModel.query.mockResolvedValue(mockRecords);

      const aggregation = {
        operation: 'Sum',
        field: 'Age',
        groups: [],
      } as any;

      const result = await collection.aggregate(mockCaller, {} as any, aggregation);

      expect(result).toEqual([{ value: 90, group: {} }]);
    });

    it('should handle aggregation errors', async () => {
      mockModel.query.mockRejectedValue(new Error('Query failed'));

      await expect(
        collection.aggregate(mockCaller, {} as any, { operation: 'Count', groups: [] } as any),
      ).rejects.toThrow('Failed to aggregate records');
    });
  });
});
