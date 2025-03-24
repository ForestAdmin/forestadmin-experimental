import type {
  CollectionCustomizer,
  Plugin,
  TCollectionName,
  TSchema,
} from '@forestadmin/datasource-customizer';

import { CollectionUtils, ColumnSchema, SchemaUtils } from '@forestadmin/datasource-toolkit';

import { Options } from './types';

export { Options as FilteredOneToManyOptions };

export default function filteredOneToMany<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection: CollectionCustomizer, options?: Options<S, N>) {
  if (!collection) throw new Error('filteredOneToMany may only be use() on a collection.');
  if (!options) throw new Error('Options must be provided.');

  const { relationName, foreignCollection, handler } = options;
  const newFieldName = `${relationName}Id`;
  const foreignForestCollection = dataSource.getCollection(foreignCollection);
  const pks = SchemaUtils.getPrimaryKeys(foreignForestCollection.schema);

  if (pks.length > 1) {
    throw new Error('filteredOneToMany does not support collections with composite Primary Keys.');
  }

  const [foreignPk] = pks;
  const pkType = CollectionUtils.getFieldSchema(foreignForestCollection, foreignPk) as ColumnSchema;

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
    originKeyTarget: options.originKeyTarget,
  });
}

export type DefineEnumType = Plugin<Options>;
