import type { Plugin, TCollectionName, TSchema } from '@forestadmin/datasource-customizer';

import { SchemaUtils } from '@forestadmin/datasource-toolkit';

import { Options } from './types';

export { Options as DefineEnumOption };

export default function filteredOneToMany<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection, options?: Options<S, N>) {
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

  foreignForestCollection.addField(newFieldName, {
    columnType: 'Number',
    dependencies: ['id'],
    getValues: () => [],
  });

  foreignForestCollection.replaceFieldOperator(newFieldName, 'Equal', async (_id, context) => {
    const records = await foreignForestCollection.list(
      { conditionTree: await handler(_id, context) },
      [foreignPk],
    );

    return { field: foreignPk, operator: 'In', value: records.map(r => r[foreignPk]) };
  });

  collection.addOneToManyRelation(relationName, foreignCollection, {
    originKey: newFieldName,
  });
}

export type DefineEnumType = Plugin<Options>;
