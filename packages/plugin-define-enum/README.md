The plugin allows you to create fields based on enums when your database stores technical values (0, 1, 2, 3).


```javascript
import { createAgent } from '@forestadmin/agent';

import defineEnum from '@forestadmin-experimental/plugin-define-enum';

const BandStatus = {
  JustCreated: 0,
  GrowingHigh: 50,
  BrokenUp: 100,
} as const

await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  .customizeCollection('Users', usersCollection => {
    .use<Option<Schema, 'Users'>>(defineEnum, {
      field: 'bandStatus',
      enumObject: BandStatus,
    })
  })
```
