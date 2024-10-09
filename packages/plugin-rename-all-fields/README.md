The plugin allows you rename all collections fields with an handler.

We export 2 native renaming handlers: `snakeToCamelCase`, `snakeToPascalCase`


```typescript
import { createAgent } from '@forestadmin/agent';
import { Schema } from './typings';

import renameAllField, {
  snakeToCamelCase,
} from '@forestadmin-experimental/plugin-rename-all-fields';
import type { RenameAllFieldOption } from '@forestadmin-experimental/plugin-rename-all-fields';

await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  // WARNING: This must be done after all addDataSource
  .use<RenameAllFieldOption>(renameAllField, snakeToCamelCase);
```

It can also be use on a unique collection.
```typescript

function myCustomRenameFunction(fieldName) {
  return 'renamed_' + fieldName;
}

await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  .customizeCollection('users', usersCollection => {
    .use<RenameAllFieldOption>(renameAllField, myCustomRenameFunction)
  })
```
