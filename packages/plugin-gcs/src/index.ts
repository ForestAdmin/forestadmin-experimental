import type { TCollectionName, TSchema } from '@forestadmin/datasource-customizer';
import type { ColumnSchema } from '@forestadmin/datasource-toolkit';

import createField from './field/create-field';
import makeFieldRequired from './field/make-field-required';
import makeFieldWritable from './field/make-field-writable';
import replaceField from './field/replace-field';
import { DownloadFilesConfiguration, DownloadFilesOptions, File, Options } from './types';
import Client from './utils/gcs';
import addDownloadAll from './actions/add-download-all';

export { Options as CreateFileFieldOption, File, DownloadFilesOptions };

export function createFileField<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection, options?: Options<S, N>) {
  if (!collection) throw new Error('createFileField can only be used on collections.');
  if (!options) throw new Error('Options must be provided.');

  const sourceSchema = collection.schema.fields[options.fieldName] as ColumnSchema;

  if (
    !sourceSchema
    || sourceSchema.type !== 'Column'
    || !(sourceSchema.columnType === 'String' || (Array.isArray(sourceSchema.columnType) && sourceSchema.columnType[0] === 'String')) 
  ) {
    const field = `${collection.name}.${options.fieldName}`;
    throw new Error(`The field '${field}' does not exist or is not a string or array of string.`);
  }

  const config = {
    sourceName: options.fieldName,
    fileName: `${options.fieldName}__file`,
    client: new Client(options.gcs),
    storeAt: options?.storeAt ?? ((id, name) => `${collection.name}/${id}/${name}`),
    objectKeyFromRecord: options?.objectKeyFromRecord || null,
  };

  createField(collection, config);
  makeFieldWritable(collection, config);
  makeFieldRequired(collection, config);
  replaceField(collection, config);
}

export function addDownloadFilesAction<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> (datasource, collection, options: DownloadFilesOptions<S,N>) {
  if (!collection) throw new Error('createFileField can only be used on collections.');
  if (!options) throw new Error('Options must be provided.');
  if (options.fields && options.getFiles) throw new Error('`fields` and `getFiles` can not be used together, please pick only one of the two options');

  if (options.fileName && !options.fileName.endsWith('.zip')) {
    options.fileName = options.fileName.split('.')[0] + '.zip';
  }

  const config: DownloadFilesConfiguration = {
    client: new Client(options.gcs),
    actionName: options.actionName || 'Download all files',
    fields: options.fields,
    getFiles: options.getFiles as unknown as DownloadFilesConfiguration['getFiles'],
    fileName: options.fileName || 'all-files-download',
  };

  addDownloadAll(collection, config)
}
