The elastic search data source allows importing collections from an elastic search instance.

To make everything work as expected, you need to install the package `@forestadmin-experimental/datasource-elasticsearch`.

## Compatibility

Language clients are forward compatible; meaning that clients support
communicating with greater or equal minor versions of Elasticsearch without
breaking. Elasticsearch language clients are only backwards
compatible with default distributions and without guarantees made.
For example, all 8.15+ clients will work with a @forestadmin-experimental/datasource-elasticsearch v1.0.

| Elasticsearch Version | Supported by |
| --------------------- | ------------ |
| 8.x                   | 1.x          |
| 7.x                   | 0.x          |


## Usage

Note that:

- Joins are not supported at the moment
- Object (sub-model in models) are not supported at the moment
- Points are not supported at the moment
- Arrays are not supported out of the box. See the section [`Specifying that a field is an array`](#Tips)

```javascript
const { createAgent } = require('@forestadmin/agent');

const { createElasticsearchDataSource } = require('@forestadmin-experimental/datasource-elasticsearch');

// Create agent and import collections from elastic search
const agent = createAgent(options).addDataSource(
    createElasticsearchDataSource('http://localhost:9200', configuration =>
      configuration
        // Add the kibana_sample_data_flights index example
        .addCollectionFromIndex({ name: 'Flights', indexName: 'kibana_sample_data_flights' })

        // Add the kibana_sample_data_ecommerce index example
        .addCollectionFromIndex({ name: 'eCommerce', indexName: 'kibana_sample_data_ecommerce' })

        // Add a custom collection template based
        .addCollectionFromTemplate({
          name: 'ActivityLogs',
          templateName: 'activity-logs-v1-template',
          // Allow to properly generate index name for records creation based on custom logic
          // activity-logs-v1-read-2023_05
          generateIndexName: ({ type, createdAt }) => {
            const createdDate = new Date(createdAt).toISOString();
            // NOTICE: getMonth() returns the month as a zero-based value
            const month = new Date(createdDate).getUTCMonth() + 1;

            const dateSuffix = `${new Date(createdDate).getUTCFullYear()}_${
              month < 10 ? '0' : ''
            }${month}`;

            return `activity-logs-v1-${type}-${dateSuffix}`;
          },
          // Optionally override the fields schemas generated by Forest
          overrideTypeConverter: field => {
            if (field.fieldName === 'label' || field.attribute.type === 'text')
              return { ...field.generatedFieldSchema, isSortable: false };
            if (field.fieldName === 'status')
              return {
                ...field.generatedFieldSchema,
                columnType: 'Enum',
                enumValues: ['creating', 'pending', 'live', 'disabled'],
              };
          },
        }),
    ),
  ));
```

## Tips

### Specifying that a field is an array

In Elasticsearch, there is no dedicated array data type. Any field can contain zero or more values by default, however, all values in the array must be of the same data type.
So, you will need to hand-specify that a field is indeed an array.

_`document` is a keyword type seen as a String in the Forest Admin world but we use it with multiple values so let's make it an array of String_

```
collection.removeField('document').addField('documents', {
        columnType: ['String'],
        dependencies: ['document'],
        getValues: records => records.map(record => record.document),
      });
```

## TODO

- Create a plugin for specifying fields that are arrays (or add an option to the data source configuration builder)
- Handle Joins
- Handle Object
