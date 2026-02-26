# @forestadmin-experimental/datasource-graphql-hasura

A Forest Admin datasource that connects to a [Hasura](https://hasura.io/) GraphQL API, automatically introspecting your schema and exposing your tables as Forest Admin collections.

## Installation

```bash
npm install @forestadmin-experimental/datasource-graphql-hasura
```

## Quick start

```typescript
import { createAgent } from '@forestadmin/agent';
import { createGraphqlDataSource } from '@forestadmin-experimental/datasource-graphql-hasura';

const agent = createAgent({
  authSecret: process.env.FOREST_AUTH_SECRET,
  envSecret: process.env.FOREST_ENV_SECRET,
});

agent.addDataSource(
  createGraphqlDataSource({
    uri: 'https://my-hasura-instance.hasura.app/v1/graphql',
    headers: {
      'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
    },
    excludedTables: ['_prisma_migrations'],
  }),
);

agent.start();
```

## Configuration

| Option           | Type                     | Required | Description                                                                                  |
| ---------------- | ------------------------ | -------- | -------------------------------------------------------------------------------------------- |
| `uri`            | `string`                 | Yes      | Hasura GraphQL endpoint URL                                                                  |
| `headers`        | `Record<string, string>` | No       | HTTP headers (e.g. `x-hasura-admin-secret`)                                                  |
| `includedTables` | `string[]`               | No       | Whitelist of table names to expose                                                           |
| `excludedTables` | `string[]`               | No       | Blacklist of table names to hide                                                             |
| `metadataUri`    | `string`                 | No       | Override metadata endpoint (defaults to `uri` with `/v1/graphql` replaced by `/v1/metadata`) |

## Features

### Schema introspection

The datasource automatically discovers your Hasura schema using two parallel requests:

1. **GraphQL introspection** — discovers tables, columns, primary keys, and field types
2. **Hasura metadata API** — resolves relationship mappings (foreign keys). Falls back to naming-convention heuristics if the metadata endpoint is unavailable.

System tables (`pg_*`, `hdb_*`, `information_schema`, etc.) are excluded automatically.

### Supported type mappings

| Hasura / PostgreSQL types             | Forest Admin type |
| ------------------------------------- | ----------------- |
| `Int`, `Float`, `numeric`, `bigint`   | `Number`          |
| `String`, `text`, `varchar`, `bpchar` | `String`          |
| `Boolean`                             | `Boolean`         |
| `uuid`                                | `Uuid`            |
| `timestamptz`, `timestamp`            | `Date`            |
| `date`                                | `Dateonly`        |
| `time`, `timetz`                      | `Time`            |
| `jsonb`, `json`                       | `Json`            |
| `bytea`                               | `Binary`          |
| `_text`, `_int4`, etc. (array types)  | `[BaseType]`      |

### CRUD operations

- **List** — with filtering, sorting, pagination, and nested field projection
- **Create** — single record insertion
- **Update** — partial updates (sends only changed fields)
- **Delete** — with filter support
- **Count** — enabled by default

### Filtering

Full support for Forest Admin filter operators, translated to Hasura `_bool_exp` clauses:

`Equal`, `NotEqual`, `LessThan`, `GreaterThan`, `In`, `NotIn`, `Contains`, `StartsWith`, `EndsWith`, `Like`, `ILike`, `Present`, `Missing`, `Before`, `After`, `IncludesAll`, `IncludesNone`, `ContainsKey`, and more.

Nested relationship filters are also supported (e.g. filtering posts by `author:name`).

### Sorting

Supports ascending/descending sorting, including on nested relationship fields.

### Aggregation

Supports `Count`, `Sum`, `Avg`, `Min`, `Max` operations. Grouped aggregation is supported for foreign key fields using Hasura's nested aggregate pattern.

### Relations

- **ManyToOne** (Hasura object relationships)
- **OneToMany** (Hasura array relationships)

## Caching introspection

To avoid re-introspecting the schema on every server restart, you can cache the introspection result:

```typescript
import {
  introspect,
  createGraphqlDataSource,
} from '@forestadmin-experimental/datasource-graphql-hasura';

// Run once and persist the result (e.g. to disk or cache)
const schema = await introspect({
  uri: 'https://my-hasura-instance.hasura.app/v1/graphql',
  headers: { 'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET },
});

// Pass it on startup
agent.addDataSource(createGraphqlDataSource(options, { introspection: schema }));
```

## License

GPL-3.0 — see [LICENSE](./LICENSE).
