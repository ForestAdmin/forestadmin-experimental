/**
 * Integration tests for datasource-airtable-v2
 * Tests end-to-end flows simulating real usage scenarios
 */

// Mock modules at top level
jest.mock('airtable');
jest.mock('axios');

describe('Integration Tests', () => {
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

    // Setup axios mock
    axios.get = jest.fn();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Full CRUD workflow', () => {
    let createAirtableDataSource;
    let mockTable;

    beforeEach(() => {
      // Setup mock table
      mockTable = {
        find: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        select: jest.fn(() => ({
          all: jest.fn().mockResolvedValue([]),
        })),
      };

      Airtable.base = jest.fn(() => () => mockTable);

      createAirtableDataSource = require('../src/index');
    });

    it('should complete full CRUD lifecycle', async () => {
      // Setup: Initialize datasource
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'CRM' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Contacts',
              fields: [
                { id: 'fld1', name: 'Name', type: 'singleLineText' },
                { id: 'fld2', name: 'Email', type: 'email' },
                { id: 'fld3', name: 'Active', type: 'checkbox' },
              ],
            }],
          },
        });

      const factory = createAirtableDataSource({ apiKey: 'key' });
      const dataSource = await factory();

      expect(dataSource.collections).toHaveLength(1);

      const collection = dataSource.collections[0];
      const caller = { id: 'user1' };

      // CREATE: Add a new contact
      mockTable.create.mockResolvedValue([
        { id: 'rec1', fields: { Name: 'John Doe', Email: 'john@example.com', Active: true } },
      ]);

      const created = await collection.create(caller, [
        { Name: 'John Doe', Email: 'john@example.com', Active: true },
      ]);

      expect(created).toHaveLength(1);
      expect(created[0].Name).toBe('John Doe');
      expect(mockTable.create).toHaveBeenCalledWith([
        { fields: { Name: 'John Doe', Email: 'john@example.com', Active: true } },
      ]);

      // READ: Get single record
      mockTable.find.mockResolvedValue({
        id: 'rec1',
        fields: { Name: 'John Doe', Email: 'john@example.com', Active: true },
      });

      const found = await collection.list(
        caller,
        { conditionTree: { field: 'id', operator: 'Equal', value: 'rec1' } },
        null
      );

      expect(found).toHaveLength(1);
      expect(found[0].id).toBe('rec1');
      expect(mockTable.find).toHaveBeenCalledWith('rec1');

      // LIST: Get all records with filter
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Name: 'John Doe', Email: 'john@example.com', Active: true } },
        ]),
      });

      const listed = await collection.list(
        caller,
        { conditionTree: { field: 'Active', operator: 'Equal', value: true } },
        null
      );

      expect(listed).toHaveLength(1);
      expect(mockTable.select).toHaveBeenCalledWith(
        expect.objectContaining({
          filterByFormula: '{Active} = TRUE()',
        })
      );

      // UPDATE: Modify the contact
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Name: 'John Doe' } },
        ]),
      });
      mockTable.update.mockResolvedValue([]);

      await collection.update(
        caller,
        { conditionTree: { field: 'id', operator: 'Equal', value: 'rec1' } },
        { Email: 'john.doe@newdomain.com' }
      );

      expect(mockTable.update).toHaveBeenCalledWith([
        { id: 'rec1', fields: { Email: 'john.doe@newdomain.com' } },
      ]);

      // DELETE: Remove the contact
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: {} },
        ]),
      });
      mockTable.destroy.mockResolvedValue([]);

      await collection.delete(
        caller,
        { conditionTree: { field: 'id', operator: 'Equal', value: 'rec1' } }
      );

      expect(mockTable.destroy).toHaveBeenCalledWith(['rec1']);
    });
  });

  describe('Filtering scenarios', () => {
    let createAirtableDataSource;
    let mockTable;

    beforeEach(() => {
      mockTable = {
        find: jest.fn(),
        select: jest.fn(() => ({
          all: jest.fn().mockResolvedValue([]),
        })),
      };

      Airtable.base = jest.fn(() => () => mockTable);

      createAirtableDataSource = require('../src/index');
    });

    async function setupDataSource() {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'Base' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Products',
              fields: [
                { id: 'fld1', name: 'Name', type: 'singleLineText' },
                { id: 'fld2', name: 'Price', type: 'number' },
                { id: 'fld3', name: 'Category', type: 'singleSelect' },
                { id: 'fld4', name: 'InStock', type: 'checkbox' },
              ],
            }],
          },
        });

      const factory = createAirtableDataSource({ apiKey: 'key' });

      return factory();
    }

    it('should handle complex AND/OR filters', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      // Complex filter: (Price > 100 AND InStock = true) OR Category = "Sale"
      const complexFilter = {
        conditionTree: {
          aggregator: 'or',
          conditions: [
            {
              aggregator: 'and',
              conditions: [
                { field: 'Price', operator: 'GreaterThan', value: 100 },
                { field: 'InStock', operator: 'Equal', value: true },
              ],
            },
            { field: 'Category', operator: 'Equal', value: 'Sale' },
          ],
        },
      };

      await collection.list({ id: 'user1' }, complexFilter, null);

      expect(mockTable.select).toHaveBeenCalledWith(
        expect.objectContaining({
          filterByFormula: 'OR(AND({Price} > 100, {InStock} = TRUE()), {Category} = "Sale")',
        })
      );
    });

    it('should handle pagination with skip and limit', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      // Return 100 records
      const allRecords = Array.from({ length: 100 }, (_, i) => ({
        id: `rec${i}`,
        fields: { Name: `Product ${i}`, Price: i * 10 },
      }));

      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue(allRecords),
      });

      // Request page 3 (skip 20, limit 10)
      const result = await collection.list(
        { id: 'user1' },
        { page: { skip: 20, limit: 10 } },
        null
      );

      expect(result).toHaveLength(10);
      expect(result[0].id).toBe('rec20');
      expect(result[9].id).toBe('rec29');
    });

    it('should handle sorting', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([]),
      });

      await collection.list(
        { id: 'user1' },
        {
          sort: [
            { field: 'Price', ascending: false },
            { field: 'Name', ascending: true },
          ],
        },
        null
      );

      expect(mockTable.select).toHaveBeenCalledWith(
        expect.objectContaining({
          sort: [
            { field: 'Price', direction: 'desc' },
            { field: 'Name', direction: 'asc' },
          ],
        })
      );
    });
  });

  describe('Aggregation scenarios', () => {
    let createAirtableDataSource;
    let mockTable;

    beforeEach(() => {
      mockTable = {
        select: jest.fn(() => ({
          all: jest.fn().mockResolvedValue([]),
        })),
      };

      Airtable.base = jest.fn(() => () => mockTable);

      createAirtableDataSource = require('../src/index');
    });

    async function setupDataSource() {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'Base' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Sales',
              fields: [
                { id: 'fld1', name: 'Product', type: 'singleLineText' },
                { id: 'fld2', name: 'Amount', type: 'number' },
                { id: 'fld3', name: 'Region', type: 'singleSelect' },
                { id: 'fld4', name: 'Date', type: 'date' },
              ],
            }],
          },
        });

      const factory = createAirtableDataSource({ apiKey: 'key' });

      return factory();
    }

    it('should calculate sales summary by region', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Product: 'A', Amount: 100, Region: 'North' } },
          { id: 'rec2', fields: { Product: 'B', Amount: 150, Region: 'North' } },
          { id: 'rec3', fields: { Product: 'C', Amount: 200, Region: 'South' } },
          { id: 'rec4', fields: { Product: 'D', Amount: 300, Region: 'South' } },
          { id: 'rec5', fields: { Product: 'E', Amount: 250, Region: 'South' } },
        ]),
      });

      const result = await collection.aggregate(
        { id: 'user1' },
        {},
        { operation: 'Sum', field: 'Amount', groups: [{ field: 'Region' }] },
        null
      );

      expect(result).toHaveLength(2);

      const north = result.find(r => r.group.Region === 'North');
      const south = result.find(r => r.group.Region === 'South');

      expect(north.value).toBe(250); // 100 + 150
      expect(south.value).toBe(750); // 200 + 300 + 250
    });

    it('should count records for chart data', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue([
          { id: 'rec1', fields: { Product: 'Widget', Region: 'North' } },
          { id: 'rec2', fields: { Product: 'Widget', Region: 'North' } },
          { id: 'rec3', fields: { Product: 'Widget', Region: 'South' } },
          { id: 'rec4', fields: { Product: 'Gadget', Region: 'North' } },
          { id: 'rec5', fields: { Product: 'Gadget', Region: 'South' } },
        ]),
      });

      const result = await collection.aggregate(
        { id: 'user1' },
        {},
        { operation: 'Count', groups: [{ field: 'Product' }] },
        null
      );

      expect(result).toHaveLength(2);

      const widget = result.find(r => r.group.Product === 'Widget');
      const gadget = result.find(r => r.group.Product === 'Gadget');

      expect(widget.value).toBe(3);
      expect(gadget.value).toBe(2);
    });
  });

  describe('Batch operations', () => {
    let createAirtableDataSource;
    let mockTable;

    beforeEach(() => {
      mockTable = {
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
        select: jest.fn(() => ({
          all: jest.fn().mockResolvedValue([]),
        })),
      };

      Airtable.base = jest.fn(() => () => mockTable);

      createAirtableDataSource = require('../src/index');
    });

    async function setupDataSource() {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'Base' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Items',
              fields: [
                { id: 'fld1', name: 'Name', type: 'singleLineText' },
              ],
            }],
          },
        });

      const factory = createAirtableDataSource({ apiKey: 'key' });

      return factory();
    }

    it('should batch create 25 records in 3 batches', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      // Generate 25 items
      const items = Array.from({ length: 25 }, (_, i) => ({ Name: `Item ${i}` }));

      // Mock create responses for each batch
      mockTable.create
        .mockResolvedValueOnce(
          items.slice(0, 10).map((item, i) => ({ id: `rec${i}`, fields: item }))
        )
        .mockResolvedValueOnce(
          items.slice(10, 20).map((item, i) => ({ id: `rec${i + 10}`, fields: item }))
        )
        .mockResolvedValueOnce(
          items.slice(20, 25).map((item, i) => ({ id: `rec${i + 20}`, fields: item }))
        );

      const result = await collection.create({ id: 'user1' }, items);

      expect(mockTable.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(25);
    });

    it('should batch delete 15 records in 2 batches', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      // Mock list returning 15 records
      mockTable.select.mockReturnValue({
        all: jest.fn().mockResolvedValue(
          Array.from({ length: 15 }, (_, i) => ({ id: `rec${i}`, fields: {} }))
        ),
      });

      mockTable.destroy.mockResolvedValue([]);

      await collection.delete({ id: 'user1' }, {});

      expect(mockTable.destroy).toHaveBeenCalledTimes(2);
      expect(mockTable.destroy).toHaveBeenNthCalledWith(
        1,
        ['rec0', 'rec1', 'rec2', 'rec3', 'rec4', 'rec5', 'rec6', 'rec7', 'rec8', 'rec9']
      );
      expect(mockTable.destroy).toHaveBeenNthCalledWith(
        2,
        ['rec10', 'rec11', 'rec12', 'rec13', 'rec14']
      );
    });
  });

  describe('Field type handling', () => {
    let createAirtableDataSource;
    let mockTable;

    beforeEach(() => {
      mockTable = {
        find: jest.fn(),
        create: jest.fn(),
        select: jest.fn(() => ({
          all: jest.fn().mockResolvedValue([]),
        })),
      };

      Airtable.base = jest.fn(() => () => mockTable);

      createAirtableDataSource = require('../src/index');
    });

    it('should handle all common field types correctly', async () => {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'Base' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Records',
              fields: [
                { id: 'fld1', name: 'Text', type: 'singleLineText' },
                { id: 'fld2', name: 'Number', type: 'number' },
                { id: 'fld3', name: 'Checkbox', type: 'checkbox' },
                { id: 'fld4', name: 'Date', type: 'date' },
                { id: 'fld5', name: 'DateTime', type: 'dateTime' },
                { id: 'fld6', name: 'Select', type: 'singleSelect' },
                { id: 'fld7', name: 'MultiSelect', type: 'multipleSelects' },
                { id: 'fld8', name: 'Email', type: 'email' },
                { id: 'fld9', name: 'Links', type: 'multipleRecordLinks' },
                { id: 'fld10', name: 'CreatedTime', type: 'createdTime' },
              ],
            }],
          },
        });

      const factory = createAirtableDataSource({ apiKey: 'key' });
      const dataSource = await factory();
      const collection = dataSource.collections[0];

      // Verify field schema
      expect(collection.schema.fields.Text.columnType).toBe('String');
      expect(collection.schema.fields.Number.columnType).toBe('Number');
      expect(collection.schema.fields.Checkbox.columnType).toBe('Boolean');
      expect(collection.schema.fields.Date.columnType).toBe('Dateonly');
      expect(collection.schema.fields.DateTime.columnType).toBe('Date');
      expect(collection.schema.fields.Select.columnType).toBe('String');
      expect(collection.schema.fields.MultiSelect.columnType).toBe('Json');
      expect(collection.schema.fields.Links.columnType).toBe('Json');

      // Verify read-only fields
      expect(collection.schema.fields.Text.isReadOnly).toBe(false);
      expect(collection.schema.fields.CreatedTime.isReadOnly).toBe(true);

      // Test data transformation
      mockTable.find.mockResolvedValue({
        id: 'rec1',
        fields: {
          Text: 'Hello',
          Number: 42,
          Checkbox: true,
          Date: '2024-01-15',
          DateTime: '2024-01-15T12:00:00.000Z',
          Select: 'Option A',
          MultiSelect: ['Tag1', 'Tag2'],
          Email: 'test@example.com',
          Links: ['rec2', 'rec3'],
          CreatedTime: '2024-01-01T00:00:00.000Z',
        },
      });

      const result = await collection.list(
        { id: 'user1' },
        { conditionTree: { field: 'id', operator: 'Equal', value: 'rec1' } },
        null
      );

      expect(result[0].Text).toBe('Hello');
      expect(result[0].Number).toBe(42);
      expect(result[0].Checkbox).toBe(true);
      expect(result[0].MultiSelect).toEqual(['Tag1', 'Tag2']);
      expect(result[0].Links).toEqual(['rec2', 'rec3']);
    });
  });

  describe('Error handling', () => {
    let createAirtableDataSource;
    let mockTable;

    beforeEach(() => {
      mockTable = {
        find: jest.fn(),
        create: jest.fn(),
        select: jest.fn(() => ({
          all: jest.fn().mockResolvedValue([]),
        })),
      };

      Airtable.base = jest.fn(() => () => mockTable);

      createAirtableDataSource = require('../src/index');
    });

    async function setupDataSource() {
      axios.get
        .mockResolvedValueOnce({
          data: {
            bases: [{ id: 'base1', name: 'Base' }],
          },
        })
        .mockResolvedValueOnce({
          data: {
            tables: [{
              id: 'tbl1',
              name: 'Table',
              fields: [{ id: 'fld1', name: 'Name', type: 'singleLineText' }],
            }],
          },
        });

      const factory = createAirtableDataSource({ apiKey: 'key' });

      return factory();
    }

    it('should handle API rate limits gracefully', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.statusCode = 429;

      mockTable.select.mockReturnValue({
        all: jest.fn().mockRejectedValue(rateLimitError),
      });

      await expect(collection.list({ id: 'user1' }, {}, null)).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle network errors', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      mockTable.create.mockRejectedValue(new Error('Network error'));

      await expect(
        collection.create({ id: 'user1' }, [{ Name: 'Test' }])
      ).rejects.toThrow('Network error');
    });

    it('should handle validation errors from Airtable', async () => {
      const dataSource = await setupDataSource();
      const collection = dataSource.collections[0];

      const validationError = new Error('INVALID_VALUE');
      validationError.error = 'INVALID_VALUE';

      mockTable.create.mockRejectedValue(validationError);

      await expect(
        collection.create({ id: 'user1' }, [{ Name: 'Test' }])
      ).rejects.toThrow('INVALID_VALUE');
    });
  });
});
