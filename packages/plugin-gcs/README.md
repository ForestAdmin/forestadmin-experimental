The GCS plugin allows you to work with the files you store on your buckets.

To make everything work as expected, you need to install the package `@forestadmin-experimental/plugin-gcs`.

Note that:

- The plugin is still experimental. The provided features might be missing you would like to add, don't hesitate to suggest anything by creating a pull request.
- The plugin allows you to use file widgets on the UI based on some bucket keys you store in your database

## Inside this plugin

Some features comes out of the box with this plugin:

- The possibility to generate signed url to get your file
- The possibility to upload files to your bucket
- The possibility to create quick smart action that handles download of many files

Here is a sample describing how to create file fields

```javascript
const { createAgent } = require('@forestadmin/agent');

const {
  createFileField,
  CreateFileFieldOption,
  addDownloadFilesAction,
  DownloadFilesOptions,
} = require('@forestadmin-experimental/plugin-gcs');

await createAgent<Schema>(Options)
  .addDataSource(DataSourceOptions)
  .customizeCollection('Users', usersCollection => {
    .use<CreateFileFieldOption<Schema, 'Users'>>(createFileField, {
      fieldname: 'drivingLicense',
      gcs: {
        bucketId: 'production-bucket',
        projectId: 'myproject-346344',
        keyFilePath: 'myproject-344513-94fd90cbc66e.json'
      },
      storeAt: (userId, originalFilename) => {
        return `Users/${userId}/identity/${originalFilename}`;
      },
    })
    .use<DownloadFilesOptions<Schema, 'Users'>>(addDownloadFilesAction, {
      gcs: {
        bucketId: 'production-bucket',
        projectId: 'myproject-346344',
        keyFilePath: 'myproject-344513-94fd90cbc66e.json'
      },
      actionName: 'Download all user\'s documents',
      fileName: 'all-users-document.zip',
      fields: ['drivingLicense', 'identity'],
    })
  })
```

## Make a field a file field

The `createFileField` function allows you to activate the generation of signed urls to preview your files, and activate the upload features.

Here is the list of the available options:

```javascript
.use(createFileField, {
  /** Name of the field that you want to use as a file-picker on the frontend */
  fieldName: TColumnName<S, N>;

  /**
   * This function allows customizing the string that will be saved in the database.
   * If the objectKeyFromRecord option is not set, the output of that function will also
   * be used as the object key in your bucket.
   *
   * Note that the recordId parameter will _not_ be provided when records are created.
   *
   * storeAt: (recordId, originalFilename, context) => {
   *   return `${context.collection.name}/${recordId ?? 'new-record'}/${originalFilename}`;
   * }
   **/
  storeAt?: (
    recordId: string,
    originalFilename: string,
    context: WriteCustomizationContext<S, N>,
  ) => string | Promise<string>;

  /**
  * This function allows customizing the object key that will be used in your bucket without interfering
  * with what is stored in the database.
  *
  * objectKeyFromRecord: {
  *   extraDependencies: ['firstname', 'lastname'],
  *   mappingFunction: (record, context) => {
  *     return `avatars/${record.firstname}-${record.lastname}.png`;
  *   }
  * };
  */
  objectKeyFromRecord?: {
    extraDependencies?: TFieldName<S, N>[];
    mappingFunction: (
      record: TPartialSimpleRow<S, N>,
      context: CollectionCustomizationContext<S, N>,
    ) => string | Promise<string>;
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
})
```

## Add a download smart action

The `addDownloadFilesAction` function allows you to add a smart action of type `Single` in your collection. 

The result will be a `.zip` archive that will be downloaded on the user's computer.

You can either specify the fields that should be added in the archive, or use the `getFiles` options to specify the bucket keys that should be added in the archive.

Here is the list of the available options:

```javascript
.use(addDownloadFilesAction, {
  /** 
   * Name of the action that will be displayed in the frontend.
   * 
   * Defaults to `all-files-download.zip`.
   */
  actionName?: string,

  /**
   * Name of archive that will be downloaded on the user's computer.
   * 
   * Defaults to `Download all files`.
   * */
  fileName?: string,

  /** 
   * List of the fields from which bucket keys should be gathered to retrieve the files, and included in teh archive.
   * 
   * This can not be used with the `getFiles` option.
   */
  fields?: string[],

  /**
   * This option allows you to handle complex downloads. Being provided with the context of the underlying smart action,
   * you will be the owner of returning the actual bucket keys you would like to gather files from, and include in the archive.
   * 
   * This can be used with the `fields` option.
   */
  getFiles?: (context: ActionContextSingle<S, N>): Promise<string[]>,
  
  /** GCS configuration */
  gcs: {
    /** Identifier of your bucket */
    bucketId: string;

    /** The project where the bucket resides */
    projectId: string;

    /** Authentication file corresponding to the service account provided by Google */
    keyFilePath: string;
  };
})
```

## TODO
- objectKeyFromRecord.mappingFunction does not support fields of type array of string
- file deletion is currently not supported
- readMode: 'url' | 'proxy' is not supported
