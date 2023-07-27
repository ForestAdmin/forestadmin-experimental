import { createSequelizeDataSource } from "@forestadmin/datasource-sequelize";
import type {
  CollectionCustomizer,
  DataSourceCustomizer,
} from "@forestadmin/datasource-customizer";
import { DataType, DataTypes, Sequelize } from "sequelize";

type Columns = Record<string, DataType>;

async function createOperationalTable(
  sequelize: Sequelize,
  tableName: string,
  columns: Columns
) {
  // Create operational table
  sequelize.define(
    `operational_${tableName}`,
    { id: { type: DataTypes.INTEGER, primaryKey: true }, ...columns },
    { tableName }
  );

  // Synchronize the Sequelize instance with the database
  await sequelize.sync();
}

function linkDatabases(
  dataSource: DataSourceCustomizer,
  collection: CollectionCustomizer,
  columns: Columns
) {
  // link main db collection to operational db collection
  collection.addOneToOneRelation(
    "operational",
    `operational_${collection.name}`,
    { originKey: "id", originKeyTarget: "id" }
  );

  // import all fields from operational db
  for (const columnName of Object.keys(columns))
    collection.importField(columnName, {
      path: `operational:${columnName}`,
      readonly: false,
    });

  // remove link to operational db collection
  collection.removeField("operational");

  // remove operational db collection
  dataSource.removeCollection(`operational_${collection.name}`);
}

export default async function addOperationalColumns(
  dataSource: DataSourceCustomizer,
  collection: CollectionCustomizer,
  options: { storeAt: string; columns: Columns }
) {
  if (!collection) throw new Error("This plugin must be called on collections");

  // Create operational table, and load it into forestadmin
  const sequelize = new Sequelize(options.storeAt);
  await createOperationalTable(sequelize, collection.name, options.columns);
  dataSource.addDataSource(createSequelizeDataSource(sequelize));

  // Link main db collection to operational db collection
  linkDatabases(dataSource, collection, options.columns);
}

export { DataType, DataTypes };
