# hubspot-datasource

## Usage

``` javascript
agent
  .addDataSource(
    createHubSpotDataSource({
      accessToken: 'token',
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
    }),
  )

```

## Why is it experimental

Hubspot datasources has a few limitations that currently prevent us from having a complex support via Forest.

A few examples:
- We currently can't handle relation natively, because Hubspot doesn't provide a way to fetch related data in a single request.
- Hubspot API is rate-limited, which means that we can't fetch all the data in a single request (Search API up to 4 requests/seconds, Basic API 100 requests every 10 seconds).
- Hubspot API doesn't support ALL forest operations, thus some behavior may not work as expected (Eg. Search an owner email needs to be exact, can't search of owner first/lastname, etc)