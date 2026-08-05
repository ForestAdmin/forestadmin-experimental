import type {
  CollectionCustomizer,
  Plugin,
  TCollectionName,
  TSchema,
} from '@forestadmin/datasource-customizer';

import {
  CollectionUtils,
  ColumnSchema,
  Logger,
  SchemaUtils,
} from '@forestadmin/datasource-toolkit';

import { Options } from './types';

export { Options as FilteredOneToManyOptions };

function getOriginKeyName(
  foreignForestCollection: CollectionCustomizer,
  collectionName: string,
  relationName: string,
  logger?: Logger,
): string {
  const { fields } = foreignForestCollection.schema;
  const defaultName = `${relationName}Id`;

  if (!fields[defaultName]) return defaultName;

  const scopedName = `${collectionName}_${relationName}_Id`;

  if (fields[scopedName]) {
    throw new Error(
      `filteredOneToMany: '${foreignForestCollection.name}' already has both ` +
        `'${defaultName}' and '${scopedName}' fields. Use another relationName.`,
    );
  }

  logger?.(
    'Warn',
    `filteredOneToMany: '${defaultName}' already exists on '${foreignForestCollection.name}', ` +
      `using '${scopedName}' instead.`,
  );

  return scopedName;
}

export default function filteredOneToMany<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection: CollectionCustomizer, options?: Options<S, N>, logger?: Logger) {
  if (!collection) throw new Error('filteredOneToMany may only be use() on a collection.');
  if (!options) throw new Error('Options must be provided.');

  const { relationName, foreignCollection, handler } = options;
  const foreignForestCollection = dataSource.getCollection(foreignCollection);
  const newFieldName = getOriginKeyName(
    foreignForestCollection,
    collection.name,
    relationName,
    logger,
  );
  const fpks = SchemaUtils.getPrimaryKeys(foreignForestCollection.schema);
  const pks = SchemaUtils.getPrimaryKeys(collection.schema);

  if (fpks.length > 1 || pks.length > 1) {
    throw new Error('filteredOneToMany does not support collections with composite Primary Keys.');
  }

  const [foreignPk] = fpks;
  const [pk] = pks;
  // Put new field type as same as the pk of the original collection to avoid incompatible type
  const pkType = CollectionUtils.getFieldSchema(
    dataSource.getCollection(collection.name),
    pk,
  ) as ColumnSchema;

  foreignForestCollection.addField(newFieldName, {
    columnType: pkType.columnType,
    dependencies: [foreignPk],
    getValues: () => [],
  });

  foreignForestCollection.replaceFieldOperator(newFieldName, 'Equal', async (_id, context) => {
    const records = await context.dataSource
      .getCollection(foreignCollection)
      .list({ conditionTree: await handler(_id, context) }, [foreignPk]);

    return { field: foreignPk, operator: 'In', value: records.map(r => r[foreignPk]) };
  });

  collection.addOneToManyRelation(relationName, foreignCollection, {
    originKey: newFieldName,
  });
}

export type DefineEnumType = Plugin<Options>;
