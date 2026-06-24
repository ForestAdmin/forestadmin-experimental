import type { TCollectionName, TSchema } from '@forestadmin/datasource-customizer';

import { Options as DefineEnumOption } from './types';

export { DefineEnumOption };

export default function defineEnum<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(options: DefineEnumOption<S, N>) {
  return function defineEnumPlugin(dataSource, collection) {
    if (!collection) throw new Error('defineEnum may only be use() on a collection.');
    if (!options) throw new Error('Options must be provided.');

    const { fieldName, enumFieldName, enumObject } = options;
    const newFieldName = enumFieldName ?? `${fieldName}Enum`;

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
      .replaceFieldWriting(newFieldName, v => ({
        [fieldName]: Object.entries(enumObject).find(([k]) => v === k)?.[1],
      }));
  };
}

export type DefineEnumType = typeof defineEnum;
