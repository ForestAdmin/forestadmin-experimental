/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CollectionCustomizer,
  DataSourceCustomizer,
  Plugin,
} from '@forestadmin/datasource-customizer';

import { Options } from './types';

export { Options as RenameAllFieldsOption };

export default function renameAllFields(
  dataSource: DataSourceCustomizer<any>,
  collection: CollectionCustomizer<any>,
  transformer: Options,
) {
  if (!transformer) throw new Error('Options must be provided.');

  if (collection) {
    Object.keys(collection.schema.fields).forEach(fieldName =>
      collection.renameField(fieldName, transformer(fieldName)),
    );
  } else {
    dataSource.collections.forEach(dsCollection => {
      Object.keys(dsCollection.schema.fields).forEach(fieldName =>
        dsCollection.renameField(fieldName, transformer(fieldName)),
      );
    });
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
