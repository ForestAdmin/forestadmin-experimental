# @anthropic/datasource-airtable

Forest Admin DataSource for Airtable - Connect your Airtable bases to Forest Admin with zero configuration.

## Features

- **Auto-discovery**: Automatically fetches all bases and tables from your Airtable workspace
- **Full CRUD**: Create, Read, Update, and Delete records
- **Filtering & Sorting**: Native support for filtering and sorting
- **Field Type Mapping**: Automatic mapping of Airtable field types to Forest Admin types
- **TypeScript Support**: Full TypeScript type definitions included
- **Configurable**: Filter bases/tables, customize collection names

## Installation

```bash
npm install @anthropic/datasource-airtable
```

## Quick Start

### 1. Set up environment variable

```bash
# .env
AIRTABLE_API_KEY=pat_xxxxxxxxxxxxx
```

> Get your API token from: Airtable → Account → Developer hub → Personal access tokens

### 2. Add to your Forest Admin agent

```javascript
const { createAgent } = require('@forestadmin/agent');
const { createAirtableDataSource } = require('@anthropic/datasource-airtable');

const agent = createAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
});

// Add Airtable datasource with default options
agent.addDataSource(createAirtableDataSource());

agent.mountOnStandaloneServer(3000);
agent.start();
```

## Configuration Options

```javascript
agent.addDataSource(createAirtableDataSource({
  // Airtable API Token (optional, defaults to AIRTABLE_API_KEY env var)
  apiToken: 'pat_xxxxx',

  // Customize collection names (optional)
  collectionNameFormatter: (base, table) => `${base.name} - ${table.name}`,

  // Only include specific bases (by name or ID)
  includeBases: ['My Base', 'appXXXXXXXXX'],

  // Exclude specific bases
  excludeBases: ['Test Base'],

  // Only include specific tables
  includeTables: ['Users', 'Products'],

  // Exclude specific tables
  excludeTables: ['Archive', 'Temp'],
}));
```

### Option Details

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiToken` | `string` | `process.env.AIRTABLE_API_KEY` | Airtable Personal Access Token |
| `collectionNameFormatter` | `function` | `(base, table) => \`${base.name} - ${table.name}\`` | Function to format collection names |
| `includeBases` | `string[]` | `null` (all) | Only include these bases |
| `excludeBases` | `string[]` | `[]` | Exclude these bases |
| `includeTables` | `string[]` | `null` (all) | Only include these tables |
| `excludeTables` | `string[]` | `[]` | Exclude these tables |

## Supported Field Types

| Airtable Type | Forest Admin Type |
|--------------|------------------|
| singleLineText, multilineText, richText | String |
| email, url, phoneNumber | String |
| number, currency, percent, rating | Number |
| checkbox | Boolean |
| date, dateTime, createdTime | Date |
| singleSelect | String |
| multipleSelects, multipleAttachments | Json |
| formula, rollup | String |

## Examples

### Only include specific bases

```javascript
agent.addDataSource(createAirtableDataSource({
  includeBases: ['Production Base'],
}));
```

### Custom collection naming

```javascript
agent.addDataSource(createAirtableDataSource({
  // Use only table name (no base prefix)
  collectionNameFormatter: (base, table) => table.name,
}));
```

### Multiple Airtable workspaces

```javascript
// Workspace 1
agent.addDataSource(createAirtableDataSource({
  apiToken: process.env.AIRTABLE_API_KEY_1,
  collectionNameFormatter: (base, table) => `WS1 - ${table.name}`,
}));

// Workspace 2
agent.addDataSource(createAirtableDataSource({
  apiToken: process.env.AIRTABLE_API_KEY_2,
  collectionNameFormatter: (base, table) => `WS2 - ${table.name}`,
}));
```

## API Reference

### createAirtableDataSource(options?)

Factory function that returns a datasource creator for Forest Admin.

```typescript
function createAirtableDataSource(
  options?: AirtableDataSourceOptions
): () => Promise<AirtableDataSource>;
```

### AirtableDataSource

The main datasource class. Usually you don't need to use this directly.

```typescript
class AirtableDataSource extends BaseDataSource {
  constructor(options?: AirtableDataSourceOptions);
  initialize(): Promise<void>;
}
```

### AirtableCollection

Represents a single Airtable table. Usually you don't need to use this directly.

```typescript
class AirtableCollection extends BaseCollection {
  constructor(
    dataSource: AirtableDataSource,
    baseId: string,
    tableId: string,
    tableName: string,
    fields: AirtableField[]
  );
}
```

## Limitations

Due to Airtable API limitations:

- **ID field**: Cannot be used in `filterByFormula` or sorting
- **Batch operations**: Limited to 10 records per request (handled automatically)
- **Rate limiting**: 5 requests/second (not handled, consider adding retry logic)

## Project Structure

```
datasource-airtable/
├── src/
│   ├── index.js              # Main entry point
│   ├── airtable-datasource.js # DataSource class
│   ├── airtable-collection.js # Collection class
│   ├── constants.js          # API URLs and constants
│   ├── field-mapper.js       # Field type mapping
│   └── filter-builder.js     # Filter/sort builders
├── types/
│   └── index.d.ts            # TypeScript definitions
├── package.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Run linting
npm run lint
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
