# @forestadmin/datasource-airtable-v2

Forest Admin datasource connector for Airtable using the official Airtable Node.js SDK.

## Features

- **Official SDK**: Uses the [Airtable Node.js SDK](https://github.com/Airtable/airtable.js) for reliable API interactions
- **Automatic Schema Discovery**: Automatically discovers all bases and tables accessible with your API key
- **Full CRUD Support**: Create, read, update, and delete records
- **Filtering & Sorting**: Full support for Forest Admin filters and sorting
- **Field Type Mapping**: Comprehensive mapping of Airtable field types to Forest Admin types
- **Batch Operations**: Handles Airtable's 10-record batch limit automatically
- **Customizable**: Filter bases/tables, customize collection naming

## Installation

```bash
npm install @forestadmin/datasource-airtable-v2 airtable
```

## Quick Start

```javascript
const { createAgent } = require('@forestadmin/agent');
const { createAirtableDataSource } = require('@forestadmin/datasource-airtable-v2');

const agent = createAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
  isProduction: process.env.NODE_ENV === 'production',
});

// Add Airtable datasource (uses AIRTABLE_API_KEY environment variable)
agent.addDataSource(createAirtableDataSource());

agent.mountOnStandaloneServer(3000);
agent.start();
```

## Configuration Options

```javascript
agent.addDataSource(createAirtableDataSource({
  // Airtable API key (defaults to AIRTABLE_API_KEY env var)
  apiKey: 'your-api-key',

  // Custom API endpoint (optional, for enterprise)
  endpointUrl: 'https://api.airtable.com',

  // Only include specific bases
  includeBases: ['Production Base', 'CRM'],

  // Exclude specific bases
  excludeBases: ['Test Base', 'Archive'],

  // Only include specific tables
  includeTables: ['Customers', 'Orders'],

  // Exclude specific tables
  excludeTables: ['_Archive', '_Test'],

  // Custom collection naming
  collectionNameFormatter: (base, table) => `${base.name} - ${table.name}`,
}));
```

## Supported Airtable Field Types

| Airtable Type | Forest Admin Type | Read-Only |
|---------------|-------------------|-----------|
| singleLineText | String | No |
| multilineText | String | No |
| richText | String | No |
| email | String | No |
| url | String | No |
| phoneNumber | String | No |
| number | Number | No |
| currency | Number | No |
| percent | Number | No |
| rating | Number | No |
| duration | Number | No |
| checkbox | Boolean | No |
| date | Date | No |
| dateTime | Date | No |
| singleSelect | String | No |
| multipleSelects | Json | No |
| multipleRecordLinks | Json | No |
| multipleAttachments | Json | No |
| singleCollaborator | Json | No |
| multipleCollaborators | Json | No |
| barcode | Json | No |
| formula | String | Yes |
| rollup | String | Yes |
| lookup | Json | Yes |
| count | Number | Yes |
| createdTime | Date | Yes |
| lastModifiedTime | Date | Yes |
| createdBy | Json | Yes |
| lastModifiedBy | Json | Yes |
| autoNumber | Number | Yes |
| button | Json | Yes |
| aiText | String | Yes |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `AIRTABLE_API_KEY` | Airtable Personal Access Token or API key |

## API Limits

This datasource respects Airtable's API limits:

- **Batch Size**: 10 records per create/update/delete request
- **Page Size**: 100 records per page
- **Rate Limit**: 5 requests per second per base (not enforced by this library)

## Differences from v1

| Feature | v1 (axios-based) | v2 (SDK-based) |
|---------|------------------|----------------|
| HTTP Client | axios | Airtable SDK |
| Authentication | Manual headers | SDK handles |
| Rate Limiting | Manual | SDK handles |
| Retry Logic | Manual | SDK handles |
| TypeScript | Basic types | Full types |

## License

MIT
