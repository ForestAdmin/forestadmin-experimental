# Usage

## Prereq

- Create an empty database on a cloud provider (Neon, AWS, Heroku, etc...)
- Put the URL in an environment variable `DATABASE_OPERATIONAL_URL`

## Installation

```bash
yarn add @forestadmin/plugin-operational-database
```

## Limits

For now, this only works when:
- the collection being customized primary key is called `id`
- the `id` is an integer

(this is trivial to patch if needed)

## Example

```javascript
import { addOperationalColumns, DataTypes } from '@forestadmin/plugin-operational-database';

agent.customizeCollection(collection => {
  // Adding or removing operational columns in this list should do all the work for the
  // customer.
  collection.use(addOperationalColumns, {
    // Operational database, you can use a sqlite database if you want
    // Passing an url to an empty database will automatically create all columns
    storeAt: process.env.DATABASE_OPERATIONAL_URL,

    // Columns to add to the collection in the admin panel
    columns: {
      // Operational columns
      is_sexy: DataTypes.BOOLEAN,

      // Enrichment columns
      description: DataTypes.STRING,
      website_url: DataTypes.STRING,
      facebook_url: DataTypes.STRING,
      twitter_url: DataTypes.STRING,
      linkedin_url: DataTypes.STRING,
      phone: DataTypes.STRING,
      total_funding: DataTypes.STRING,
      founded_year: DataTypes.STRING,
      annual_revenue: DataTypes.STRING,
      logo_url: DataTypes.STRING,
      employees_count: DataTypes.STRING,
      country: DataTypes.STRING,
    },
  });
})
```
