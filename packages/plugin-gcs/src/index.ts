import type { TCollectionName, TSchema } from '@forestadmin/datasource-customizer';

import createField from './field/create-field';
import makeFieldRequired from './field/make-field-required';
import makeFieldWritable from './field/make-field-writable';
import replaceField from './field/replace-field';
import { DownloadAllConfiguration, DownloadAllOptions, File, Options } from './types';
import Client from './utils/gcs';
import addDownloadAll from './actions/add-download-all';

export { Options, File };

export function createFileField<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
>(dataSource, collection, options?: Options<S, N>) {
  if (!collection) throw new Error('createFileField can only be used on collections.');
  if (!options) throw new Error('Options must be provided.');

  const sourceSchema = collection.schema.fields[options.fieldname];

  if (!sourceSchema || sourceSchema.type !== 'Column' /*|| ![[ 'String' ], 'String'].includes(sourceSchema.columnType)*/) {
    const field = `${collection.name}.${options.fieldname}`;
    throw new Error(`The field '${field}' does not exist or is not a string.`);
  }

  const config = {
    sourcename: options.fieldname,
    filename: `${options.fieldname}__file`,
    client: new Client(options.gcs),
    deleteFiles: options?.deleteFiles ?? false,
    readMode: options?.readMode ?? 'url',
    //acl: options?.acl ?? 'private',
    storeAt: options?.storeAt ?? ((id, name) => `${collection.name}/${id}/${name}`),
    objectKeyFromRecord: options?.objectKeyFromRecord || null,
  };

  createField(collection, config);
  makeFieldWritable(collection, config);
  makeFieldRequired(collection, config);
  replaceField(collection, config);
}

export function addDownloadAllAction<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> (datasource, collection, options: DownloadAllOptions) {
  if (!collection) throw new Error('createFileField can only be used on collections.');
  if (!options) throw new Error('Options must be provided.');

  if (options.fileName && !options.fileName.endsWith('.zip')) {
    options.fileName = options.fileName.split('.')[0] + '.zip';
  }

  const config: DownloadAllConfiguration = {
    client: new Client(options.gcs),
    actionName: options.actionName || 'Download all files',
    fields: options.fields,
    objectKeyFromRecord: options?.objectKeyFromRecord || null,
    fileName: options.fileName || 'all-files-download',
  };

  addDownloadAll(collection, config)
}
