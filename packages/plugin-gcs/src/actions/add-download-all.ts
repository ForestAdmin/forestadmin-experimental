import type { CollectionCustomizer } from '@forestadmin/datasource-customizer';

import type { DownloadFilesConfiguration } from '../types';
import archiver from 'archiver';
import { ColumnSchema } from '@forestadmin/datasource-toolkit';
import * as Stream from 'stream';

export default function addDownloadAll(collection: CollectionCustomizer, config: DownloadFilesConfiguration): void {

  collection.addAction(config.actionName || 'Download all documents', {
    scope: 'Single',
    generateFile: true,
    execute: async (context, resultBuilder) => {
      let filesToDownload: string[] = []

      if (config.getFiles) {
        filesToDownload = await config.getFiles(context);
      } else {
        const record = context.getRecord(config.fields)

        for (const field of config.fields) {
          if ((collection.schema.fields[field] as ColumnSchema).columnType === 'String') {
            filesToDownload.push(record[field])
          } else {
            filesToDownload.push(...record[field]);
          }
        }
      }

      const passThrough = new Stream.PassThrough();
      const archive = archiver('zip', {
        gzip: true,
        zlib: { level: 9 }
      });
      archive.pipe(passThrough);

      for (const fileKey of filesToDownload) {
        const file = await config.client.load(fileKey);
        archive.append(file.buffer, { name: file.name });
      }

      await archive.finalize();

      return resultBuilder.file(passThrough, config.fileName, 'application/zip');
    }
  });
}
