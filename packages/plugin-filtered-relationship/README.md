The plugin allows you to create a filtered oneToMany relationship.


```typescript
import { createAgent } from '@forestadmin/agent';
import { Schema } from './typings';

import filteredRelationship from '@forestadmin-experimental/plugin-filtered-relationship';
import type { filteredOneToManyOptions } from '@forestadmin-experimental/plugin-filtered-relationship';

await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  .customizeCollection('plan', usersCollection => {
    collection.use<FilteredOneToManyOptions<Schema, 'subscription'>>(filteredRelationship, {
      relationName: 'activeSubscriptions',
      foreignCollection: 'subscription',
      handler: (id, context) => ({
        aggregator: 'And',
        conditions: [
          { field: 'planId', operator: 'Equal', value: id },
          { field: 'finishedAt', operator: 'Missing' },
        ],
      }),
    });
  })
```

