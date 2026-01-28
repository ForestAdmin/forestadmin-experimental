/**
 * Tests for airtable-collection.js
 * Tests CRUD operations, aggregations, and record transformations
 */

// Mock modules before requiring the actual code
jest.mock('airtable');
jest.mock('../src/constants', () => ({
  BATCH_SIZE: 10,
  DEFAULT_PAGE_SIZE: 100,
}));

const AirtableCollection = require('../src/airtable-collection');
const {
  createMockCaller,
  createMockFilter,
  createCondition,
  createAndCondition,
  createMockFields,
  suppressConsole,
  captureConsole,
} = require('./test-utils');

describe('AirtableCollection', () => {
  let collection;
  let mockBase;
  let mockTable;
  let mockDataSource;

  const testFields = createMockFields([
    { name: 'Name', type: 'singleLineText' },
    { name: 'Age', type: 'number' },
    { name: 'Active', type: 'checkbox' },
    { name: 'Email', type: 'email' },
    { name: 'Tags', type: 'multipleSelects' },
    { name: 'CreatedAt', type: 'createdTime' },
  ]);

  beforeEach(() => {
    // Create mock table with all methods
    mockTable = {
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      select: jest.fn(() => ({
        all: jest.fn().mockResolvedValue([]),
      })),
    };

    // Create mock base that returns the table
    mockBase = jest.fn(() => mockTable);

    // Create mock datasource
    mockDataSource = {
      collections: [],
    };

    // Create collection
    collection = new AirtableCollection(
      mockDataSource,
      mockBase,
      'Test Collection',
      'tblTest',
      testFields
    );
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(collection.name).toBe('Test Collection');
      expect(collection.tableId).toBe('tblTest');
      expect(collection.airtableFields).toEqual(testFields);
    });

    it('should create table reference from base', () => {
      expect(mockBase).toHaveBeenCalledWith('tblTest');
      expect(collection.table).toBe(mockTable);
    });
  });

  describe('_registerSchema()', () => {
    it('should register id field as primary key', () => {
      const schema = collection.schema;
      const idField = schema.fields.id;

      expect(idField).toBeDefined();
      expect(idField.isPrimaryKey).toBe(true);
      expect(idField.isReadOnly).toBe(true);
      expect(idField.columnType).toBe('String');
    });

    it('should register all Airtable fields', () => {
      const schema = collection.schema;

      expect(schema.fields.Name).toBeDefined();
      expect(schema.fields.Age).toBeDefined();
      expect(schema.fields.Active).toBeDefined();
      expect(schema.fields.Email).toBeDefined();
    });

    it('should set correct column types', () => {
      const schema = collection.schema;

      expect(schema.fields.Name.columnType).toBe('String');
      expect(schema.fields.Age.columnType).toBe('Number');
      expect(schema.fields.Active.columnType).toBe('Boolean');
    });

    it('should mark read-only fields correctly', () => {
      const schema = collection.schema;

      expect(schema.fields.Name.isReadOnly).toBe(false);
      expect(schema.fields.CreatedAt.isReadOnly).toBe(true);
    });

    it('should set filter operators', () => {
      const schema = collection.schema;

      expect(schema.fields.Name.filterOperators).toBeInstanceOf(Set);
      expect(schema.fields.Name.filterOperators.has('Equal')).toBe(true);
      expect(schema.fields.Name.filterOperators.has('Contains')).toBe(true);
    });

    it('should set isSortable to true for fields', () => {
      const schema = collection.schema;

      expect(schema.fields.Name.isSortable).toBe(true);
      expect(schema.fields.Age.isSortable).toBe(true);
    });
  });

  describe('_transformRecord()', () => {
    it('should transform Airtable record to Forest Admin format', () => {
      const airtableRecord = {
        id: 'rec123',
        fields: {
          Name: 'John',
          Age: 25,
          Active: true,
        },
      };

      const result = collection._transformRecord(airtableRecord);

      expect(result).toEqual({
        id: 'rec123',
        Name: 'John',
        Age: 25,
        Active: true,
        Email: null,
        Tags: null,
        CreatedAt: null,
      });
    });

    it('should apply field transformations', () => {
      const airtableRecord = {
        id: 'rec123',
        fields: {
          Name: 'John',
          // Note: When Airtable returns undefined for checkbox, transformValue receives undefined
          // which returns null. The transform for checkbox only converts true to true.
        },
      };

      const result = collection._transformRecord(airtableRecord);

      // When field is not present in record.fields, transformValue gets undefined and returns null
      expect(result.Active).toBeNull();
    });

    it('should handle missing fields', () => {
      const airtableRecord = {
        id: 'rec123',
        fields: {},
      };

      const result = collection._transformRecord(airtableRecord);

      expect(result.id).toBe('rec123');
      expect(result.Name).toBeNull();
      expect(result.Age).toBeNull();
    });
  });

  describe('_prepareForWrite()', () => {
    it('should prepare patch for writing', () => {
      const patch = {
        Name: 'John',
        Age: 25,
      };

      const result = collection._prepareForWrite(patch);

      expect(result).toEqual({
        Name: 'John',
        Age: 25,
      });
    });

    it('should skip id field', () => {
      const patch = {
        id: 'rec123',
        Name: 'John',
      };

      const result = collection._prepareForWrite(patch);

      expect(result).not.toHaveProperty('id');
      expect(result.Name).toBe('John');
    });

    it('should skip read-only fields with warning', async () => {
      const patch = {
        Name: 'John',
        CreatedAt: new Date(),
      };

      const { result, warns } = await captureConsole(() => {
        return collection._prepareForWrite(patch);
      });

      expect(result).not.toHaveProperty('CreatedAt');
      expect(result.Name).toBe('John');
      expect(warns.some(w => w.includes('read-only'))).toBe(true);
    });

    it('should skip unknown fields with warning', async () => {
      const patch = {
        Name: 'John',
        UnknownField: 'value',
      };

      const { result, warns } = await captureConsole(() => {
        return collection._prepareForWrite(patch);
      });

      expect(result).not.toHaveProperty('UnknownField');
      expect(warns.some(w => w.includes('not found'))).toBe(true);
    });

    it('should apply value transformations', () => {
      const patch = {
        Active: 'true', // String should become boolean
        Age: '30', // String should become number
      };

      const result = collection._prepareForWrite(patch);

      expect(result.Active).toBe(true);
      expect(result.Age).toBe(30);
    });
  });

  describe('list()', () => {
    const caller = createMockCaller();

    beforeEach(() => {
      // Reset mocks
      mockTable.find.mockReset();
      mockTable.select.mockReset();
    });

    describe('single record lookup optimization', () => {
      it('should use find() for single ID lookup', async () => {
        const filter = createMockFilter({
          conditionTree: createCondition('id', 'Equal', 'rec123'),
        });

        mockTable.find.mockResolvedValue({
          id: 'rec123',
          fields: { Name: 'John' },
        });

        const result = await collection.list(caller, filter, ['Name']);

        expect(mockTable.find).toHaveBeenCalledWith('rec123');
        expect(mockTable.select).not.toHaveBeenCalled();
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('rec123');
      });

      it('should return empty array if record not found', async () => {
        const filter = createMockFilter({
          conditionTree: createCondition('id', 'Equal', 'rec123'),
        });

        const error = new Error('Not found');
        error.statusCode = 404;
        mockTable.find.mockRejectedValue(error);

        const result = await collection.list(caller, filter, ['Name']);

        expect(result).toEqual([]);
      });

      it('should throw non-404 errors', async () => {
        const filter = createMockFilter({
          conditionTree: createCondition('id', 'Equal', 'rec123'),
        });

        mockTable.find.mockRejectedValue(new Error('Server error'));

        await expect(suppressConsole(() =>
          collection.list(caller, filter, ['Name'])
        )).rejects.toThrow('Server error');
      });
    });

    describe('multiple record IDs lookup optimization', () => {
      it('should use parallel find() for multiple ID lookup', async () => {
        const filter = createMockFilter({
          conditionTree: createCondition('id', 'In', ['rec1', 'rec2']),
        });

        mockTable.find
          .mockResolvedValueOnce({ id: 'rec1', fields: { Name: 'John' } })
          .mockResolvedValueOnce({ id: 'rec2', fields: { Name: 'Jane' } });

        const result = await collection.list(caller, filter, ['Name']);

        expect(mockTable.find).toHaveBeenCalledTimes(2);
        expect(result).toHaveLength(2);
      });

      it('should filter out not-found records', async () => {
        const filter = createMockFilter({
          conditionTree: createCondition('id', 'In', ['rec1', 'rec2']),
        });

        mockTable.find
          .mockResolvedValueOnce({ id: 'rec1', fields: { Name: 'John' } })
          .mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 }));

        const result = await collection.list(caller, filter, ['Name']);

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('rec1');
      });
    });

    describe('general listing', () => {
      it('should fetch all records using select().all()', async () => {
        const mockAll = jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Name: 'John' } },
          { id: 'rec2', fields: { Name: 'Jane' } },
        ]);

        mockTable.select.mockReturnValue({ all: mockAll });

        const result = await collection.list(caller, {}, null);

        expect(mockTable.select).toHaveBeenCalled();
        expect(mockAll).toHaveBeenCalled();
        expect(result).toHaveLength(2);
      });

      it('should apply filter formula', async () => {
        const filter = createMockFilter({
          conditionTree: createCondition('Name', 'Equal', 'John'),
        });

        mockTable.select.mockReturnValue({
          all: jest.fn().mockResolvedValue([]),
        });

        await collection.list(caller, filter, null);

        expect(mockTable.select).toHaveBeenCalledWith(
          expect.objectContaining({
            filterByFormula: '{Name} = "John"',
          })
        );
      });

      it('should apply sort', async () => {
        const filter = createMockFilter({
          sort: [{ field: 'Name', ascending: true }],
        });

        mockTable.select.mockReturnValue({
          all: jest.fn().mockResolvedValue([]),
        });

        await collection.list(caller, filter, null);

        expect(mockTable.select).toHaveBeenCalledWith(
          expect.objectContaining({
            sort: [{ field: 'Name', direction: 'asc' }],
          })
        );
      });

      it('should apply field projection', async () => {
        mockTable.select.mockReturnValue({
          all: jest.fn().mockResolvedValue([]),
        });

        await collection.list(caller, {}, ['Name', 'Email']);

        expect(mockTable.select).toHaveBeenCalledWith(
          expect.objectContaining({
            fields: ['Name', 'Email'],
          })
        );
      });

      it('should apply skip and limit', async () => {
        const filter = createMockFilter({
          page: { skip: 10, limit: 5 },
        });

        mockTable.select.mockReturnValue({
          all: jest.fn().mockResolvedValue(
            Array.from({ length: 20 }, (_, i) => ({
              id: `rec${i}`,
              fields: { Name: `User ${i}` },
            }))
          ),
        });

        const result = await collection.list(caller, filter, null);

        expect(result).toHaveLength(5);
        expect(result[0].id).toBe('rec10');
        expect(result[4].id).toBe('rec14');
      });

      it('should handle errors gracefully', async () => {
        mockTable.select.mockReturnValue({
          all: jest.fn().mockRejectedValue(new Error('API error')),
        });

        await expect(suppressConsole(() =>
          collection.list(caller, {}, null)
        )).rejects.toThrow('API error');
      });
    });
  });

  describe('create()', () => {
    const caller = createMockCaller();

    beforeEach(() => {
      mockTable.create.mockReset();
    });

    it('should create a single record', async () => {
      mockTable.create.mockResolvedValue([
        { id: 'recNew', fields: { Name: 'John' } },
      ]);

      const result = await collection.create(caller, [{ Name: 'John' }]);

      expect(mockTable.create).toHaveBeenCalledWith([
        { fields: { Name: 'John' } },
      ]);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('recNew');
    });

    it('should create multiple records', async () => {
      mockTable.create.mockResolvedValue([
        { id: 'rec1', fields: { Name: 'John' } },
        { id: 'rec2', fields: { Name: 'Jane' } },
      ]);

      const result = await collection.create(caller, [
        { Name: 'John' },
        { Name: 'Jane' },
      ]);

      expect(result).toHaveLength(2);
    });

    it('should batch create when exceeding BATCH_SIZE', async () => {
      // Create 15 records (exceeds batch size of 10)
      const data = Array.from({ length: 15 }, (_, i) => ({ Name: `User ${i}` }));

      mockTable.create
        .mockResolvedValueOnce(
          Array.from({ length: 10 }, (_, i) => ({
            id: `rec${i}`,
            fields: { Name: `User ${i}` },
          }))
        )
        .mockResolvedValueOnce(
          Array.from({ length: 5 }, (_, i) => ({
            id: `rec${i + 10}`,
            fields: { Name: `User ${i + 10}` },
          }))
        );

      const result = await collection.create(caller, data);

      expect(mockTable.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(15);
    });

    it('should handle errors', async () => {
      mockTable.create.mockRejectedValue(new Error('Create failed'));

      await expect(suppressConsole(() =>
        collection.create(caller, [{ Name: 'John' }])
      )).rejects.toThrow('Create failed');
    });
  });

  describe('update()', () => {
    const caller = createMockCaller();

    beforeEach(() => {
      mockTable.find.mockReset();
      mockTable.update.mockReset();
      mockTable.select.mockReset();
    });

    it('should update records matching filter', async () => {
      // Mock list to return records to update
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Name: 'John' } },
          { id: 'rec2', fields: { Name: 'Jane' } },
        ]),
      });

      mockTable.update.mockResolvedValue([]);

      const filter = createMockFilter({
        conditionTree: createCondition('Active', 'Equal', true),
      });

      await collection.update(caller, filter, { Name: 'Updated' });

      expect(mockTable.update).toHaveBeenCalledWith([
        { id: 'rec1', fields: { Name: 'Updated' } },
        { id: 'rec2', fields: { Name: 'Updated' } },
      ]);
    });

    it('should do nothing if no records match', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      await collection.update(caller, {}, { Name: 'Updated' });

      expect(mockTable.update).not.toHaveBeenCalled();
    });

    it('should batch update when exceeding BATCH_SIZE', async () => {
      // Mock list to return 15 records
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue(
          Array.from({ length: 15 }, (_, i) => ({
            id: `rec${i}`,
            fields: { Name: `User ${i}` },
          }))
        ),
      });

      mockTable.update.mockResolvedValue([]);

      await collection.update(caller, {}, { Name: 'Updated' });

      expect(mockTable.update).toHaveBeenCalledTimes(2);
    });

    it('should handle errors', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([{ id: 'rec1', fields: {} }]),
      });
      mockTable.update.mockRejectedValue(new Error('Update failed'));

      await expect(suppressConsole(() =>
        collection.update(caller, {}, { Name: 'Updated' })
      )).rejects.toThrow('Update failed');
    });
  });

  describe('delete()', () => {
    const caller = createMockCaller();

    beforeEach(() => {
      mockTable.destroy.mockReset();
      mockTable.select.mockReset();
    });

    it('should delete records matching filter', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: {} },
          { id: 'rec2', fields: {} },
        ]),
      });

      mockTable.destroy.mockResolvedValue([]);

      await collection.delete(caller, {});

      expect(mockTable.destroy).toHaveBeenCalledWith(['rec1', 'rec2']);
    });

    it('should do nothing if no records match', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      await collection.delete(caller, {});

      expect(mockTable.destroy).not.toHaveBeenCalled();
    });

    it('should batch delete when exceeding BATCH_SIZE', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue(
          Array.from({ length: 15 }, (_, i) => ({
            id: `rec${i}`,
            fields: {},
          }))
        ),
      });

      mockTable.destroy.mockResolvedValue([]);

      await collection.delete(caller, {});

      expect(mockTable.destroy).toHaveBeenCalledTimes(2);
    });

    it('should handle errors', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([{ id: 'rec1', fields: {} }]),
      });
      mockTable.destroy.mockRejectedValue(new Error('Delete failed'));

      await expect(suppressConsole(() =>
        collection.delete(caller, {})
      )).rejects.toThrow('Delete failed');
    });
  });

  describe('aggregate()', () => {
    const caller = createMockCaller();

    beforeEach(() => {
      mockTable.select.mockReset();
    });

    it('should calculate Count aggregation', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Age: 25 } },
          { id: 'rec2', fields: { Age: 30 } },
          { id: 'rec3', fields: { Age: 35 } },
        ]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Count' }, null);

      expect(result).toEqual([{ value: 3, group: {} }]);
    });

    it('should calculate Sum aggregation', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Age: 25 } },
          { id: 'rec2', fields: { Age: 30 } },
          { id: 'rec3', fields: { Age: 35 } },
        ]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Sum', field: 'Age' }, null);

      expect(result).toEqual([{ value: 90, group: {} }]);
    });

    it('should calculate Avg aggregation', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Age: 20 } },
          { id: 'rec2', fields: { Age: 30 } },
          { id: 'rec3', fields: { Age: 40 } },
        ]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Avg', field: 'Age' }, null);

      expect(result).toEqual([{ value: 30, group: {} }]);
    });

    it('should return null for Avg on empty dataset', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Avg', field: 'Age' }, null);

      expect(result).toEqual([{ value: null, group: {} }]);
    });

    it('should calculate Max aggregation', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Age: 25 } },
          { id: 'rec2', fields: { Age: 30 } },
          { id: 'rec3', fields: { Age: 35 } },
        ]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Max', field: 'Age' }, null);

      expect(result).toEqual([{ value: 35, group: {} }]);
    });

    it('should return null for Max on empty dataset', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Max', field: 'Age' }, null);

      expect(result).toEqual([{ value: null, group: {} }]);
    });

    it('should calculate Min aggregation', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Age: 25 } },
          { id: 'rec2', fields: { Age: 30 } },
          { id: 'rec3', fields: { Age: 35 } },
        ]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Min', field: 'Age' }, null);

      expect(result).toEqual([{ value: 25, group: {} }]);
    });

    it('should return null for Min on empty dataset', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      const result = await collection.aggregate(caller, {}, { operation: 'Min', field: 'Age' }, null);

      expect(result).toEqual([{ value: null, group: {} }]);
    });

    it('should group by field', async () => {
      // Use 'Active' field which exists in our test collection schema
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Name: 'John', Active: true, Age: 25 } },
          { id: 'rec2', fields: { Name: 'Jane', Active: true, Age: 30 } },
          { id: 'rec3', fields: { Name: 'Bob', Active: false, Age: 35 } },
        ]),
      });

      const result = await collection.aggregate(
        caller,
        {},
        { operation: 'Count', groups: [{ field: 'Active' }] },
        null
      );

      expect(result).toHaveLength(2);
      expect(result.find(r => r.group.Active === true).value).toBe(2);
      expect(result.find(r => r.group.Active === false).value).toBe(1);
    });

    it('should group by multiple fields', async () => {
      // Use 'Active' and 'Name' fields which exist in our test collection
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Name: 'Team A', Active: true, Age: 25 } },
          { id: 'rec2', fields: { Name: 'Team A', Active: true, Age: 30 } },
          { id: 'rec3', fields: { Name: 'Team B', Active: true, Age: 35 } },
        ]),
      });

      const result = await collection.aggregate(
        caller,
        {},
        { operation: 'Count', groups: [{ field: 'Active' }, { field: 'Name' }] },
        null
      );

      expect(result).toHaveLength(2);
    });

    it('should apply limit to results', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Name: 'A', Age: 10 } },
          { id: 'rec2', fields: { Name: 'B', Age: 20 } },
          { id: 'rec3', fields: { Name: 'C', Age: 30 } },
        ]),
      });

      const result = await collection.aggregate(
        caller,
        {},
        { operation: 'Count', groups: [{ field: 'Name' }] },
        2
      );

      expect(result).toHaveLength(2);
    });

    it('should handle unknown operation', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([{ id: 'rec1', fields: {} }]),
      });

      const result = await collection.aggregate(
        caller,
        {},
        { operation: 'Unknown' },
        null
      );

      expect(result[0].value).toBeNull();
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('should handle errors', async () => {
      mockTable.select.mockReturnValue({
        all: jest.fn().mockRejectedValue(new Error('Aggregate failed')),
      });

      await expect(suppressConsole(() =>
        collection.aggregate(caller, {}, { operation: 'Count' }, null)
      )).rejects.toThrow('Aggregate failed');
    });
  });
});
