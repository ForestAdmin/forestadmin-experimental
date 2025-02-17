# hubspot-datasource

## Usage

### Creating the datasource
``` javascript
agent
  .addDataSource(
    createHubSpotDataSource({
      hubspotClientConfiguration: {
        accessToken: YOUR_ACCESS_TOKEN,
        limiterOptions: {
          minTime: 200,
          maxConcurrent: 1,
        },
      },
      collections: {
        companies: [
          'name',
          'address',
          'address2',
          'city',
          'country',
          'createdate',
          'description',
        ],
        products: ['name'],
        projects: ['number_of_users', 'project_id', 'project_name', 'cs_owner'],
        //...
      },
      excludeOwnerCollection: true, // defaults to false: we handle automatically the owner collection, but you can exclude it if you want.
    }),
  )

```

### Retrieving the hubspot client for custom calls
When customizing a collection (adding a field, adding an action) you can retrieve the hubspot client from context to make custom calls like so: 

```typescript
import type { Client } from '@hubspot/api-client';

...

const husbpotClient = context.collection.nativeDriver as Client;
```

## Options 

### hubspotClientConfiguration 

This is the configuration object that will be past to the [hubspot client](https://github.com/HubSpot/hubspot-api-nodejs) library used internaly

It is worth mentioning that depending on your [plan](https://developers.hubspot.com/beta-docs/guides/apps/api-usage/usage-details#private-apps), hubspot will use rate limiting, preventing you from performing lot of requests.  
To work around those limitations, hubspot client uses [bottleneck](https://github.com/SGrondin/bottleneck) to smooth request over time.   

Not providing any value for the limiter will use the default options being: 

```javascript
limiterOptions: {
  maxConcurrent: 1,
  minTime: 200,
}
```

This default configuration works for the minimal plan of hubspot. If you have a better plan, use a proper configuration to allow for more requests, based on the [bottleneck documentation](https://github.com/SGrondin/bottleneck?tab=readme-ov-file#docs). 

### collections

You can specify the collections that need to be included in your datasource using this option. 

You can also specify the fields that you want to be included. If a specified field does not exist on your collection, we will warn that we could not find that field, and display the list of available fields of your collection.
### excludeOwnerCollection

By default, we will automatically include the owner collection in your datasource.

You specify that you don't want to include the owner collection by using the `excludeOwnerCollection` like so: 

```typescript
agent
  .addDataSource(
    createHubSpotDataSource({
      hubspotClientConfiguration: {
        accessToken: YOUR_ACCESS_TOKEN,
        limiterOptions: {
          minTime: 200,
          maxConcurrent: 1,
        },
      },
      collections: {...},
      excludeOwnerCollection: true,
    }),
  )
```
## Why is it experimental

Hubspot datasources has a few limitations that currently prevent us from having a complex support via Forest.

A few examples:
- We currently can't handle relation natively, because Hubspot doesn't provide a way to fetch related data in a single request.
- Hubspot API is rate-limited, which means that we can't fetch all the data in a single request (Search API up to 4 requests/seconds, Basic API 100 requests every 10 seconds).
- Hubspot API doesn't support ALL forest operations, thus some behavior may not work as expected (Eg. Search an owner email needs to be exact, can't search of owner first/lastname, etc)
