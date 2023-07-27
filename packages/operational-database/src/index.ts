import { createSequelizeDataSource } from '@forestadmin/datasource-sequelize';
import type {
  CollectionCustomizer,
  DataSourceCustomizer,
} from '@forestadmin/datasource-customizer';
import type { ColumnSchema } from '@forestadmin/datasource-toolkit';
import { DataType, DataTypes, Sequelize } from 'sequelize';

type Columns = Record<string, DataType>;

async function createOperationalTable(
  collection: CollectionCustomizer,
  sequelize: Sequelize,
  tableName: string,
  columns: Columns,
) {
  const pks = Object.entries(collection.schema.fields).filter(
    ([fieldName, field]) => field.type === 'Column' && field.isPrimaryKey,
  );

  if (pks.length !== 1) throw new Error('Operational table must have exactly one primary key');

  const [name, definition] = pks[0] as [string, ColumnSchema];
  let type: DataType = null;
  if (definition.columnType === 'Number') type = DataTypes.INTEGER;
  else if (definition.columnType === 'String') type = DataTypes.STRING;
  else if (definition.columnType === 'Uuid') type = DataTypes.UUID;
  else throw new Error(`Unsupported primary key type: ${definition.columnType}`);

  // Create operational table
  sequelize.define(
    `operational_${tableName}`,
    { id: { type, primaryKey: true }, ...columns },
    { tableName },
  );

  // Synchronize the Sequelize instance with the database
  await sequelize.sync();
}

function linkDatabases(
  dataSource: DataSourceCustomizer,
  collection: CollectionCustomizer,
  columns: Columns,
) {
  // link main db collection to operational db collection
  collection.addOneToOneRelation('operational', `operational_${collection.name}`, {
    originKey: Object.entries(collection.schema.fields).find(
      ([, f]) => f.type === 'Column' && f.isPrimaryKey,
    )[0],
    originKeyTarget: 'id',
  });

  // import all fields from operational db
  for (const columnName of Object.keys(columns))
    collection.importField(columnName, {
      path: `operational:${columnName}`,
      readonly: false,
    });

  // remove link to operational db collection
  collection.removeField('operational');

  // remove operational db collection
  dataSource.removeCollection(`operational_${collection.name}`);
}

export default async function addOperationalColumns(
  dataSource: DataSourceCustomizer,
  collection: CollectionCustomizer,
  options: { storeAt: string; columns: Columns },
) {
  if (!collection) throw new Error('This plugin must be called on collections');

  // Create operational table, and load it into forestadmin
  const sequelize = new Sequelize(options.storeAt);
  await createOperationalTable(collection, sequelize, collection.name, options.columns);
  dataSource.addDataSource(createSequelizeDataSource(sequelize));

  // Link main db collection to operational db collection
  linkDatabases(dataSource, collection, options.columns);
}

export { DataType, DataTypes };
