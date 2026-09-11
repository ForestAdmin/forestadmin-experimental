import type { Plugin, TCollectionName, TSchema } from '@forestadmin/datasource-customizer';

import { ColumnSchema, allowedOperatorsForColumnType } from '@forestadmin/datasource-toolkit';

import { Options } from './types';

export { Options as DefineEnumOption };

export default function defineEnum<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection, options?: Options<S, N>) {
  if (!collection) throw new Error('defineEnum may only be use() on a collection.');
  if (!options) throw new Error('Options must be provided.');

  const { fieldName, enumFieldName, enumObject } = options;
  const newFieldName = enumFieldName ?? `${fieldName}Enum`;
  const toRawValue = key => Object.entries(enumObject).find(([k]) => k === key)?.[1];

  collection
    .addField(newFieldName, {
      columnType: 'Enum',
      enumValues: Object.keys(enumObject),
      dependencies: [fieldName],
      getValues: records => {
        const enumEntries = Object.entries(enumObject);

        return records.map(r => enumEntries.find(([, v]) => v === r[fieldName])?.[0]);
      },
    })
    .replaceFieldWriting(newFieldName, v => ({ [fieldName]: toRawValue(v) }));

  const { filterOperators } = (collection.schema.fields[fieldName] ?? {}) as ColumnSchema;

  const supportedOperators = allowedOperatorsForColumnType.Enum.filter(operator =>
    filterOperators?.has(operator),
  );

  supportedOperators.forEach(operator => {
    collection.replaceFieldOperator(newFieldName, operator, value => {
      if (value === null || value === undefined) return { field: fieldName, operator };

      return {
        field: fieldName,
        operator,
        value: Array.isArray(value)
          ? value.map(toRawValue).filter(v => v !== undefined)
          : toRawValue(value),
      };
    });
  });
}

export type DefineEnumType = Plugin<Options>;
