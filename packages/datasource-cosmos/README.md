# Forest Admin Cosmos DB NoSQL Datasource

[![npm version](https://badge.fury.io/js/@forestadmin-experimental%2Fdatasource-cosmos.svg)](https://www.npmjs.com/package/@forestadmin-experimental/datasource-cosmos)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

A Forest Admin datasource for Azure Cosmos DB NoSQL API with full support for:
- 🔍 **Introspection** - Automatic schema detection from sample documents
- 📝 **CRUD Operations** - Create, Read, Update, Delete
- 📊 **Aggregations** - Sum, Count, Avg, Min, Max with grouping
- 🔎 **Advanced Filtering** - Complex queries with AND/OR conditions
- 🔢 **Sorting & Pagination** - Efficient data retrieval

## Installation

```bash
npm install @forestadmin-experimental/datasource-cosmos @azure/cosmos
# or
yarn add @forestadmin-experimental/datasource-cosmos @azure/cosmos
```

## Quick Start

### Using the Cosmos DB Emulator (for development)

```typescript
import { createAgent } from '@forestadmin/agent';
import { createCosmosDataSourceForEmulator } from '@forestadmin-experimental/datasource-cosmos';

const agent = createAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
  isProduction: false,
});

agent.addDataSource(
  createCosmosDataSourceForEmulator('myDatabase', {
    builder: configurator =>
      configurator
        .addCollectionFromContainer({
          name: 'Users',
          databaseName: 'myDatabase',
          containerName: 'users',
        })
        .addCollectionFromContainer({
          name: 'Products',
          databaseName: 'myDatabase',
          containerName: 'products',
        }),
  }),
);

agent.start();
```

### Using Azure Cosmos DB

```typescript
import { createAgent } from '@forestadmin/agent';
import { createCosmosDataSource } from '@forestadmin-experimental/datasource-cosmos';

const agent = createAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
  isProduction: true,
});

agent.addDataSource(
  createCosmosDataSource(
    process.env.COSMOS_ENDPOINT,
    process.env.COSMOS_KEY,
    'myDatabase',
    {
      builder: configurator =>
        configurator
          .addCollectionFromContainer({
            name: 'Users',
            databaseName: 'myDatabase',
            containerName: 'users',
            partitionKeyPath: '/userId',
          })
          .addCollectionFromContainer({
            name: 'Orders',
            databaseName: 'myDatabase',
            containerName: 'orders',
            partitionKeyPath: '/customerId',
            sampleSize: 200, // Analyze 200 documents for schema inference
          }),
    },
  ),
);

agent.start();
```

## Configuration Options

### Factory Functions

#### `createCosmosDataSource(endpoint, key, databaseName?, options?)`

Create a datasource with Azure Cosmos DB connection details.

**Parameters:**
- `endpoint` (string): Cosmos DB endpoint URL
- `key` (string): Cosmos DB access key
- `databaseName` (string, optional): Database name for auto-introspection
- `options` (object, optional):
  - `builder`: Configuration function for manual collection setup
  - `liveQueryConnections`: Name for native query connection
  - `liveQueryDatabase`: Database for native queries
  - `clientOptions`: Additional CosmosClient options

**Example:**
```typescript
createCosmosDataSource(
  'https://myaccount.documents.azure.com:443/',
  'myAccessKey',
  'myDatabase',
  {
    builder: configurator =>
      configurator.addCollectionFromContainer({
        name: 'Users',
        databaseName: 'myDatabase',
        containerName: 'users',
      }),
    liveQueryConnections: 'cosmos',
    liveQueryDatabase: 'myDatabase',
  },
)
```

#### `createCosmosDataSourceForEmulator(databaseName?, options?)`

Create a datasource for the Cosmos DB Emulator (localhost:8081).

**Parameters:**
- `databaseName` (string, optional): Database name for auto-introspection
- `options` (object, optional): Same as `createCosmosDataSource`

**Example:**
```typescript
createCosmosDataSourceForEmulator('testDatabase', {
  builder: configurator =>
    configurator.addCollectionFromContainer({
      name: 'TestCollection',
      databaseName: 'testDatabase',
      containerName: 'test-container',
    }),
})
```

#### `createCosmosDataSourceWithExistingClient(client, databaseName?)`

Create a datasource with an existing CosmosClient instance.

**Parameters:**
- `client` (CosmosClient): Existing Cosmos DB client
- `databaseName` (string, optional): Database name for auto-introspection

**Example:**
```typescript
import { CosmosClient } from '@azure/cosmos';
import { createCosmosDataSourceWithExistingClient } from '@forestadmin-experimental/datasource-cosmos';

const client = new CosmosClient({
  endpoint: 'https://myaccount.documents.azure.com:443/',
  key: 'myAccessKey',
});

createCosmosDataSourceWithExistingClient(client, 'myDatabase')
```

### Collection Configuration

When using the builder pattern, you can configure collections with these options:

```typescript
configurator.addCollectionFromContainer({
  // Required
  name: 'Users',                    // Forest Admin collection name
  databaseName: 'myDatabase',       // Cosmos DB database name
  containerName: 'users',           // Cosmos DB container name

  // Optional
  partitionKeyPath: '/userId',      // Partition key (auto-detected if not provided)
  sampleSize: 100,                  // Number of documents to analyze for schema (default: 100)
  enableCount: true,                // Enable total count in pagination (default: true)

  overrideTypeConverter: (field) => {
    // Custom type conversion logic
    if (field.fieldName === 'customField') {
      return {
        ...field.generatedFieldSchema,
        columnType: 'String',
      };
    }
  },
})
```

## Features

### Schema Introspection

The datasource automatically analyzes sample documents to infer the schema:

```typescript
// Automatic introspection of all containers in a database
createCosmosDataSource(endpoint, key, 'myDatabase')

// Manual configuration for specific containers
createCosmosDataSource(endpoint, key, undefined, {
  builder: configurator =>
    configurator
      .addCollectionFromContainer({
        name: 'Users',
        databaseName: 'myDatabase',
        containerName: 'users',
        sampleSize: 200, // Analyze 200 documents for better accuracy
      }),
})
```

**Supported Data Types:**
- `string` → Forest Admin `String`
- `number` → Forest Admin `Number`
- `boolean` → Forest Admin `Boolean`
- `date` (ISO 8601 strings or Date objects) → Forest Admin `Date`
- `object` → Forest Admin `Json`
- `array` → Forest Admin `Json`
- GeoJSON Point → Forest Admin `Point`

### CRUD Operations

All standard CRUD operations are fully supported:

```typescript
// Create
await collection.create(caller, [
  { name: 'John Doe', email: 'john@example.com', age: 30 },
  { name: 'Jane Doe', email: 'jane@example.com', age: 28 },
]);

// Read with filters
await collection.list(
  caller,
  new PaginatedFilter({
    conditionTree: {
      field: 'age',
      operator: 'GreaterThan',
      value: 25,
    },
    page: { limit: 10, skip: 0 },
  }),
  new Projection('id', 'name', 'email'),
);

// Update
await collection.update(
  caller,
  new Filter({
    conditionTree: {
      field: 'status',
      operator: 'Equal',
      value: 'pending',
    },
  }),
  { status: 'active' },
);

// Delete
await collection.delete(
  caller,
  new Filter({
    conditionTree: {
      field: 'status',
      operator: 'Equal',
      value: 'archived',
    },
  }),
);
```

### Filtering

**Supported Operators:**
- Presence: `Present`, `Missing`
- Equality: `Equal`, `NotEqual`, `In`, `NotIn`
- Comparison: `LessThan`, `GreaterThan`
- Strings: `Like`, `ILike`, `Contains`, `NotContains`, `StartsWith`, `EndsWith`
- Arrays: `IncludesAll`

**Complex Queries:**
```typescript
// AND condition
const filter = new PaginatedFilter({
  conditionTree: {
    aggregator: 'And',
    conditions: [
      { field: 'status', operator: 'Equal', value: 'active' },
      { field: 'age', operator: 'GreaterThan', value: 18 },
      { field: 'role', operator: 'In', value: ['admin', 'moderator'] },
    ],
  },
});

// OR condition
const filter = new PaginatedFilter({
  conditionTree: {
    aggregator: 'Or',
    conditions: [
      { field: 'priority', operator: 'Equal', value: 'high' },
      { field: 'urgent', operator: 'Equal', value: true },
    ],
  },
});

// Nested conditions
const filter = new PaginatedFilter({
  conditionTree: {
    aggregator: 'And',
    conditions: [
      { field: 'status', operator: 'Equal', value: 'active' },
      {
        aggregator: 'Or',
        conditions: [
          { field: 'role', operator: 'Equal', value: 'admin' },
          { field: 'role', operator: 'Equal', value: 'owner' },
        ],
      },
    ],
  },
});
```

### Aggregations

Full support for aggregations with grouping:

```typescript
// Simple count
await collection.aggregate(
  caller,
  new Filter({}),
  {
    operation: 'Count',
    field: null,
  },
);

// Sum with grouping
await collection.aggregate(
  caller,
  new Filter({}),
  {
    operation: 'Sum',
    field: 'revenue',
    groups: [{ field: 'category' }],
  },
  10, // limit to 10 groups
);

// Average by date
await collection.aggregate(
  caller,
  new Filter({}),
  {
    operation: 'Avg',
    field: 'score',
    groups: [{ field: 'createdAt', operation: 'Month' }],
  },
);
```

**Supported Aggregation Operations:**
- `Count` - Count records
- `Sum` - Sum numeric field
- `Avg` - Average of numeric field
- `Min` - Minimum value
- `Max` - Maximum value

**Supported Date Grouping:**
- `Year`
- `Month`
- `Week` (approximation)
- `Day`

### Sorting & Pagination

```typescript
// Sort by single field
const filter = new PaginatedFilter({
  sort: [{ field: 'createdAt', ascending: false }],
  page: { limit: 20, skip: 0 },
});

// Sort by multiple fields
const filter = new PaginatedFilter({
  sort: [
    { field: 'status', ascending: true },
    { field: 'priority', ascending: false },
    { field: 'createdAt', ascending: false },
  ],
  page: { limit: 50, skip: 100 },
});
```

### Native SQL Queries

Execute native Cosmos DB SQL queries:

```typescript
createCosmosDataSource(endpoint, key, 'myDatabase', {
  liveQueryConnections: 'cosmos',
  liveQueryDatabase: 'myDatabase',
});

// In your Forest Admin dashboard, you can now execute:
// SELECT * FROM users WHERE users.age > $minAge AND users.status = $status
// With parameters: { minAge: 18, status: 'active' }
```

## Development

### Running Tests

```bash
# Unit tests
yarn test

# Integration tests (requires Cosmos DB Emulator)
docker compose up -d
yarn test
```

### Cosmos DB Emulator

For local development, use the Azure Cosmos DB Emulator:

**Docker:**
```bash
docker compose up -d
```

**Connection Details:**
- Endpoint: `https://localhost:8081`
- Key: `C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==`

## Architecture

The datasource follows the Forest Admin datasource architecture:

```
src/
├── datasource.ts                 # Main CosmosDataSource class
├── collection.ts                 # CosmosCollection with CRUD operations
├── model-builder/
│   └── model.ts                 # ModelCosmos - Cosmos DB client wrapper
├── introspection/
│   ├── introspector.ts          # Auto-discovery of containers
│   ├── container-introspector.ts # Schema inference from documents
│   └── builder.ts               # Configuration builder pattern
├── utils/
│   ├── type-converter.ts        # Cosmos to Forest Admin type mapping
│   ├── query-converter.ts       # Filter to Cosmos SQL conversion
│   ├── aggregation-converter.ts # Aggregation query builder
│   ├── model-to-collection-schema-converter.ts # Schema generation
│   └── serializer.ts            # Result serialization
└── index.ts                     # Public API and factory functions
```

## Limitations

1. **Cosmos DB SQL API Limitations:**
   - GROUP BY with multiple fields requires complex implementation
   - No native JOIN support (use nested objects instead)
   - Partition key required for efficient queries

2. **Performance Considerations:**
   - Schema introspection analyzes sample documents (configurable sample size)
   - Large result sets should use pagination
   - Consider indexing policies for optimal query performance

3. **Type Inference:**
   - Schema is inferred from sample documents
   - Mixed types in the same field are treated as Json
   - Nested objects are flattened or treated as Json

## Contributing

Contributions are welcome! Please see the main repository for contribution guidelines.

## License

GPL-3.0 - See LICENSE file for details

## Support

- 📚 [Forest Admin Documentation](https://docs.forestadmin.com)
- 💬 [Community Forum](https://community.forestadmin.com)
- 🐛 [Issue Tracker](https://github.com/ForestAdmin/forestadmin-experimental/issues)
- 📧 [Email Support](mailto:support@forestadmin.com)

## Related Packages

- [@forestadmin/agent](https://www.npmjs.com/package/@forestadmin/agent) - Forest Admin Agent
- [@forestadmin/datasource-toolkit](https://www.npmjs.com/package/@forestadmin/datasource-toolkit) - Base toolkit
- [@azure/cosmos](https://www.npmjs.com/package/@azure/cosmos) - Azure Cosmos DB SDK

---

Made with ❤️ by [Forest Admin](https://www.forestadmin.com)
