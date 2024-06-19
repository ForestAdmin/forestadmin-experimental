import type { TCollectionName, TSchema } from '@forestadmin/datasource-customizer';
import type { Logger } from '@forestadmin/datasource-toolkit';

import { Options } from './types';

export default function defineEnum<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection, options: Options<S, N>, logger: Logger) {
  if (!collection) throw new Error('defineEnum may only be use() on a collection.');
  if (!options) throw new Error('Options must be provided.');

  const { field, enumFieldName, enumObject } = options;

  collection
    .addField(enumFieldName ?? `${field}Enum`, {
      columnType: 'Enum',
      enumValues: Object.keys(enumObject),
      dependencies: [field],
      getValues: records => {
        const enumEntries = Object.entries(enumObject);

        return records.map(r => enumEntries.find(([, v]) => v === r[field])?.[0]);
      },
    })
    .replaceFieldWriting(enumFieldName ?? `${field}Enum`, v => ({
      [field]: Object.entries(enumObject).find(([k]) => v === k)?.[1],
    }));
}
