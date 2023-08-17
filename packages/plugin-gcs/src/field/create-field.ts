import type { CollectionCustomizer } from '@forestadmin/datasource-customizer';

import type { Configuration } from '../types';
import { ColumnSchema, ColumnType } from '@forestadmin/datasource-toolkit';

//TODO add support for proxy option ?
export default function createField(collection: CollectionCustomizer, config: Configuration): void {
  const dependencies = config.objectKeyFromRecord?.extraDependencies ?? [];
  const columnType: ColumnType = (collection.schema.fields[config.sourcename] as ColumnSchema).columnType;

  if (!dependencies.includes(config.sourcename)) {
    dependencies.push(config.sourcename);
  }

  collection.addField(config.filename, {
    columnType,
    dependencies,
    getValues: (records, context) =>
      records.map(async record => {
        let key = record[config.sourcename];

        if (!key) {
          return null;
        }

        key = config.objectKeyFromRecord?.mappingFunction
          ? await config.objectKeyFromRecord.mappingFunction(record, context)
          : key;

        const signedUrls = [];
        const isArray = columnType !== 'String';
        const keys = isArray ? key : [key];

        for (const file of keys) {
          signedUrls.push(await config.client.getSignedUrl(file));
        }

        return signedUrls;
      }),
  });
}
