The plugin allows you to create fields based on enums when your database stores technical values (0, 1, 2, 3).


```javascript
import { createAgent } from '@forestadmin/agent';
import { Schema } from './typings';

import defineEnum from '@forestadmin-experimental/plugin-define-enum';
import type { DefineEnumOption } from '@forestadmin-experimental/plugin-define-enum';

const BandStatus = {
  JustCreated: 0,
  GrowingHigh: 50,
  BrokenUp: 100,
} as const

await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  .customizeCollection('users', usersCollection => {
    .use<DefineEnumOption<Schema, 'users'>>(defineEnum, {
      fieldName: 'bandStatus',
      enumObject: BandStatus,
    })
  })
```
