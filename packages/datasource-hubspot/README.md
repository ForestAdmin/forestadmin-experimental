The [HubSpot](https://www.hubspot.com/) data source allows importing objects from HubSpot CRM.

# Installation

- install the package `@forestadmin-experimental/datasource-hubspot`.
- [access your HubSpot API key](https://knowledge.hubspot.com/integrations/how-do-i-get-my-hubspot-api-key)

```javascript
const { createAgent } = require('@forestadmin/agent');
const { createHubspotDataSource } = require('@forestadmin/datasource-hubspot');

const agent = createAgent(options).addDataSource(
  createHubspotDataSource({
    // mandatory options
    /** Your HubSpot API key. */
    accessToken: 'your-hubspot-api-key',

    /** List of collections/Objects and its fields to import from HubSpot. */
    collections: { companies: ['name', 'city'] },

    // optional options
    /**
     * cacheInto: a connection string, or a configuration object for the @forestadmin/datasource-sql connector.
     * Default: sqlite::memory:. If you want to persist the cache, you should provide a connection string.
     * */
    cacheInto: 'sqlite:/myDatabasePath.db',

    /** The pull dump schedule. The schedule is defined by a cron expression */
    pullDumpOnSchedule: '0 0 * * *', // every day at midnight

    /** The pull delta schedule. The schedule is defined by a cron expression */
    pullDeltaOnSchedule: '*/5 * * * *', // every 5 minutes

    /**
     * Maximum number of records to check if they already exist in hubspot.
     * Set to 0 to disable the check.
     * Default: 500
     * A to high value can slow down the pull delta.
     */
    pullDeltaMaxRecordUpToDate: 500,

    /** Pull dump on restart. Default: false */
    pullDumpOnRestart: true,
  }),
);
```

# Cache

## Why do we need a cache?

The cache is used to store the data from HubSpot. It is used to:

- avoid reaching the HubSpot API rate/quota limit.
- to be compliant with the all the Forest Admin data source requirements.

## How make the cache up to date?

The cache is updated by two different processes:

- the pull dump process: it pulls all the data from HubSpot and store it in the cache.
- the pull delta process: it pulls the data from HubSpot that has been updated since the last pull delta and update the cache.

To ensure the pull delta feature functions optimally, it's crucial to conduct regular pulls.
You can establish a schedule for it, such as running it every 5 minutes, using the `pullDeltaOnSchedule` option.
Additionally, the pull delta runs on various occasions, like when a user opens a collection view, a record view, performs a search, and so on.

The pull delta process does not detect the deleted relations between custom objects and CRM objects.
To update the relations, you need to run the pull dump process again.
Additionally, If you have a lot of modifications in your HubSpot CRM, you can run the pull dump process to update the cache.
You can schedule it to run every day at midnight for example by setting the `pullDumpOnSchedule` option.

## How does the pull dump and the pull delta process works?

To understand how the pull delta and dump process works, please follow this [link](TODO-put-the-replica-doc).

## Hubspot Supported Objects and relations

The HubSpot data source supports the following objects:

- [Companies](https://developers.hubspot.com/docs/api/crm/companies)
- [Contacts](https://developers.hubspot.com/docs/api/crm/contacts)
- [Deals](https://developers.hubspot.com/docs/api/crm/deals)
- [Feedbacks submissions](https://developers.hubspot.com/docs/api/crm/feedback-submissions)
- [Line Items](https://developers.hubspot.com/docs/api/crm/line-items)
- [Pipelines](https://developers.hubspot.com/docs/api/crm/pipelines)
- [Products](https://developers.hubspot.com/docs/api/crm/products)
- [Tickets](https://developers.hubspot.com/docs/api/crm/tickets)
- [custom objects](https://developers.hubspot.com/docs/api/crm/crm-custom-objects)

All the relations between these objects are supported.
The relations are detected automatically by the HubSpot data source. All the relations are a many-to-many relation.

## Troubleshooting

### My data is not up-to-date

You are definitely reaching the limits/quota of Hubspot. This means that your pull delta process is not sufficiently scheduled or your pull dump process is not scheduled at all.
The pull delta is not able to pull a huge amount of differences between two pulls because we have to respect the HubSpot API rate/quota limit.
To address this concern, it is advisable to enhance the schedule of both the pull delta and pull dump processes, particularly when dealing with substantial modifications in your HubSpot CRM.
By doing so, you can mitigate the issue and ensure that your data remains up-to-date and accurate.