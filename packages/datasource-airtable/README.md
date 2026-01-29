# @forestadmin-experimental/datasource-airtable

A TypeScript implementation of Forest Admin DataSource for Airtable, following the architecture pattern of datasource-cosmos.

## Features

- **TypeScript**: Full type safety and IDE support
- **Automatic Introspection**: Discovers schema from Airtable Meta API
- **Manual Schema**: Option to define schema manually without introspection
- **Builder Pattern**: Fluent API for configuring data sources
- **Retry Handling**: Built-in exponential backoff for rate limiting
- **Modular Architecture**: Clean separation of concerns

## Installation

```bash
npm install @forestadmin-experimental/datasource-airtable
# or
yarn add @forestadmin-experimental/datasource-airtable
```

## Usage

### Basic Usage (Auto-introspection)

```typescript
import { createAgent } from '@forestadmin/agent';
import { createAirtableDataSource } from '@forestadmin-experimental/datasource-airtable';

const agent = createAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
});

// Using environment variable AIRTABLE_API_KEY
agent.addDataSource(createAirtableDataSource());

// Or with explicit API key
agent.addDataSource(createAirtableDataSource({
  apiKey: 'pat...',
}));
```

### Filtering Bases and Tables

```typescript
agent.addDataSource(createAirtableDataSource({
  apiKey: 'pat...',
  includeBases: ['My Base'],           // Only include specific bases
  excludeTables: ['Archive', 'Test'],  // Exclude specific tables
  collectionNameFormatter: (base, table) => table.name, // Custom naming
}));
```

### Builder Pattern

```typescript
import { createAirtableDataSourceWithBuilder } from '@forestadmin-experimental/datasource-airtable';

agent.addDataSource(createAirtableDataSourceWithBuilder(
  'pat...',
  builder => builder
    .addCollectionFromTable({
      name: 'Users',
      baseId: 'appXXXXXXXX',
      tableId: 'tblXXXXXXXX',
    })
    .addCollectionsFromBase({
      baseId: 'appYYYYYYYY',
      excludeTables: ['Archive'],
      collectionNameFormatter: table => `Products_${table.name}`,
    })
));
```

### Manual Schema (No Introspection)

```typescript
import { createAirtableDataSourceWithSchema } from '@forestadmin-experimental/datasource-airtable';

agent.addDataSource(createAirtableDataSourceWithSchema(
  'pat...',
  {
    collections: [
      {
        name: 'Users',
        baseId: 'appXXXXXXXX',
        tableId: 'tblXXXXXXXX',
        fields: [
          { name: 'Name', type: 'singleLineText' },
          { name: 'Email', type: 'email' },
          { name: 'Age', type: 'number' },
          { name: 'Active', type: 'checkbox' },
          { name: 'Status', type: 'singleSelect' },
        ],
      },
    ],
  }
));
```

### Custom Retry Options

```typescript
agent.addDataSource(createAirtableDataSource({
  apiKey: 'pat...',
  retryOptions: {
    maxRetries: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    backoffMultiplier: 2,
    jitter: true,
  },
}));
```

## Architecture

```
src/
├── index.ts                    # Main entry point with factory functions
├── datasource.ts               # AirtableDataSource implementation
├── collection.ts               # AirtableCollection implementation
├── introspection/
│   ├── introspector.ts        # Schema discovery via Meta API
│   ├── builder.ts             # Builder pattern implementation
│   └── manual-schema-converter.ts
├── model-builder/
│   └── model.ts               # AirtableModel - SDK operations
├── types/
│   ├── airtable.ts            # Airtable-specific types
│   └── config.ts              # Configuration types
└── utils/
    ├── type-converter.ts      # Field type mapping
    ├── filter-converter.ts    # Forest Admin → Airtable filters
    ├── aggregation-converter.ts
    ├── serializer.ts          # Data transformation
    ├── retry-handler.ts       # Exponential backoff
    └── constants.ts
```

## Supported Field Types

| Airtable Type | Forest Admin Type | Read-Only |
|--------------|-------------------|-----------|
| singleLineText | String | No |
| email | String | No |
| url | String | No |
| multilineText | String | No |
| number | Number | No |
| percent | Number | No |
| currency | Number | No |
| checkbox | Boolean | No |
| date | Dateonly | No |
| dateTime | Date | No |
| singleSelect | Enum | No |
| multipleSelects | Json | No |
| multipleRecordLinks | Json | No |
| multipleAttachments | Json | No |
| formula | String | Yes |
| rollup | String | Yes |
| count | Number | Yes |
| lookup | Json | Yes |
| createdTime | Date | Yes |
| lastModifiedTime | Date | Yes |
| autoNumber | Number | Yes |

## Environment Variables

- `AIRTABLE_API_KEY`: Airtable Personal Access Token (if not provided in options)

## License

GPL-3.0
