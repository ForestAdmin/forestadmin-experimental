/* eslint-disable max-len */
import type {
  TCollectionName,
  TColumnName,
  TFieldName,
  TPartialSimpleRow,
  TSchema,
} from '@forestadmin/datasource-customizer';
import type CollectionCustomizationContext from '@forestadmin/datasource-customizer/dist/context/collection-context';
import type WriteCustomizationContext from '@forestadmin/datasource-customizer/dist/decorators/write/write-replace/context';

import Client from "./utils/gcs";
import { ActionContextSingle } from '@forestadmin/datasource-customizer';

export type File = {
  name: string;
  buffer: Buffer;
  mimeType: string;
  charset?: string;
};

/**
 * Configuration for the GCS bucket addon of Forest Admin.
 *
 */
export type Options<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> = {
  /** Name of the field that you want to use as a file-picker on the frontend */
  fieldName: TColumnName<S, N>;

  /**
   * This function allows customizing the string that will be saved in the database.
   * If the objectKeyFromRecord option is not set, the output of that function will also
   * be used as the object key in your bucket.
   *
   * Note that the recordId parameter will _not_ be provided when records are created.
   *
   * Defaults to '<collection name>/<id>/<originalFilename>`.
   *
   * @example
   * ```js
   * storeAt: (recordId, originalFilename, context) => {
   *   return `${context.collection.name}/${recordId ?? 'new-record'}/${originalFilename}`;
   * }
   * ```
   */
  storeAt?: (
    recordId: string,
    originalFilename: string,
    context: WriteCustomizationContext<S, N>,
  ) => string | Promise<string>;

  /**
   * This function allows customizing the object key that will be used in you bucket without interfering
   * with what is stored in the database.
   *
   * @example
   * ```
   * objectKeyFromRecord: {
   *   extraDependencies: ['firstname', 'lastname'],
   *   mappingFunction: (record, context) => {
   *     return `avatars/${record.firstname}-${record.lastname}.png`;
   *   }
   * };
   * ```
   */
  objectKeyFromRecord?: {
    extraDependencies?: TFieldName<S, N>[];
    mappingFunction: (
      record: TPartialSimpleRow<S, N>,
      context: CollectionCustomizationContext<S, N>,
    ) => string | Promise<string> | string[] | Promise<string[]>;
  };

  /** GCS configuration */
  gcs: {
    /** Identifier of your bucket */
    bucketId: string;

    /** The project where the bucket resides */
    projectId: string;

    /** Authentication file corresponding to the service account provided by Google */
    keyFilePath: string;
  };
};

export type Configuration<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> = Required<
  Pick<Options<S, N>, 'storeAt' | 'objectKeyFromRecord' > & {
    client: Client;
    sourceName: TColumnName<S, N>;
    fileName: string;
  }
>;

export type DownloadFilesOptions<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> = 
  Pick<Options<S, N>, 'gcs' > & {
  fields?: TColumnName<S, N>[];
  actionName?: string;
  fileName?: string;
  getFiles?: (context: ActionContextSingle<S, N>) => Promise<string[]>;
};

export type DownloadFilesConfiguration<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> =
  Omit<DownloadFilesOptions<S, N>, 'gcs' > & {
  client: Client;
};
