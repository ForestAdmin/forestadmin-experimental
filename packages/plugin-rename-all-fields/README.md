The plugin allows you rename all collections fields with an handler.


```typescript
import { createAgent } from '@forestadmin/agent';
import { Schema } from './typings';

import renameAllField from '@forestadmin-experimental/plugin-rename-all-fields';
import type { RenameAllFieldOption } from '@forestadmin-experimental/plugin-rename-all-fields';

function snakeToCamelCase(string) {
  return string
    .replace(
      /_(\w)/g,
      ($, $1) => $1.toUpperCase()
    )
  ;
}

await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  .use<RenameAllFieldOption>(renameAllField, snakeToCamelCase);
```

It can also be use on a unique collection.
```typescript
await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  .customizeCollection('users', usersCollection => {
    .use<RenameAllFieldOption>(renameAllField, snakeToCamelCase)
  })
```
