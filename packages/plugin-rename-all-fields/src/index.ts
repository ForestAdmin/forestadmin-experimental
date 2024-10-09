/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  CollectionCustomizer,
  DataSourceCustomizer,
  Plugin,
} from '@forestadmin/datasource-customizer';

import { Options } from './types';

export { Options as RenameAllFieldOption };

export default function renameAllField(
  dataSource: DataSourceCustomizer<any>,
  collection: CollectionCustomizer<any>,
  options?: Options,
) {
  if (!options) throw new Error('Options must be provided.');

  if (collection) {
    Object.keys(collection.schema.fields).forEach(fieldName =>
      collection.renameField(fieldName, options(fieldName)),
    );
  } else {
    dataSource.collections.forEach(dsCollection => {
      Object.keys(dsCollection.schema.fields).forEach(fieldName =>
        dsCollection.renameField(fieldName, options(fieldName)),
      );
    });
  }
}

export type RenameAllFieldType = Plugin<Options>;

/**
 * Some example already exported to simplify users life
 */

export function snakeToCamelCase(string: string): string {
  return string.replace(/_(\w)/g, ($, $1) => $1.toUpperCase());
}

export function snakeToPascalCase(string: string): string {
  const s = snakeToCamelCase(string);

  return `${s.charAt(0).toUpperCase()}${s.substr(1)}`;
}
