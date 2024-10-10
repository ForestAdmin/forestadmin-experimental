/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CollectionCustomizer,
  DataSourceCustomizer,
  Plugin,
} from '@forestadmin/datasource-customizer';

import { Options } from './types';

export { Options as RenameAllFieldsOption };

export default async function renameAllFields(
  dataSource: DataSourceCustomizer<any>,
  collection: CollectionCustomizer<any>,
  transformer: Options,
) {
  if (!transformer) throw new Error('Options must be provided.');

  if (collection) {
    await Promise.all(
      Object.keys(collection.schema.fields).map(async fieldName =>
        collection.renameField(fieldName, await transformer(fieldName)),
      ),
    );
  } else {
    await Promise.all(
      dataSource.collections.flatMap(dsCollection =>
        Object.keys(dsCollection.schema.fields).map(async fieldName =>
          dsCollection.renameField(fieldName, await transformer(fieldName)),
        ),
      ),
    );
  }
}

export type RenameAllFieldsType = Plugin<Options>;

/**
 * Some examples already exported to simplify users life
 */

export function snakeToCamelCase(string: string): string {
  return string.replace(/_(\w)/g, ($, $1) => $1.toUpperCase());
}

export function snakeToPascalCase(string: string): string {
  const s = snakeToCamelCase(string);

  return `${s.charAt(0).toUpperCase()}${s.substr(1)}`;
}
