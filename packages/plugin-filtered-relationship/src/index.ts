import type { Plugin, TCollectionName, TSchema } from '@forestadmin/datasource-customizer';

import { Options } from './types';

export { Options as DefineEnumOption };

export default function filteredRelationship<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection, options?: Options<S, N>) {
  if (!collection) throw new Error('filteredRelationship may only be use() on a collection.');
  if (!options) throw new Error('Options must be provided.');

  const { relationName, foreignCollection, foreignCollectionKey, conditionTree } = options;
  const newFieldName = `${foreignCollection}Id`;

  collection.addField(newFieldName, {
    columnType: 'Number',
    dependencies: ['id'],
    getValues: () => null,
  });

  collection.replaceFieldOperator('newFieldName', 'In', async (_, context) => {
    const records = await context.dataSource
      .getCollection(foreignCollection)
      .list({ conditionTree }, [foreignCollectionKey]);

    return { field: 'id', operator: 'In', value: records.map(r => r[foreignCollectionKey]) };
  });

  collection.addManyToOneRelation(relationName, foreignCollection, {
    foreignKey: newFieldName,
  });

  collection.removeField(newFieldName);
}

export type DefineEnumType = Plugin<Options>;
