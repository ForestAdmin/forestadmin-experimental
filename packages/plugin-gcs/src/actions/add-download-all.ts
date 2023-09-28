import type { CollectionCustomizer } from '@forestadmin/datasource-customizer';
import type { ColumnSchema } from '@forestadmin/datasource-toolkit';

import type { DownloadFilesConfiguration } from '../types';
import jszip from 'jszip';

export default function addDownloadAll(collection: CollectionCustomizer, config: DownloadFilesConfiguration): void {

  collection.addAction(config.actionName || 'Download all documents', {
    scope: 'Single',
    generateFile: true,
    execute: async (context, resultBuilder) => {
      let filesToDownload: string[] = [];

      if (config.getFiles) {
        filesToDownload = await config.getFiles(context);
      } else {
        const record = await context.getRecord(config.fields);

        for (const field of config.fields) {
          if (Array.isArray((collection.schema.fields[field] as ColumnSchema).columnType)) {
            filesToDownload.push(...record[field]);
          } else {
            filesToDownload.push(record[field]);
          }
        }
      }

      const zip = new jszip();

      for (const fileKey of filesToDownload) {
        const file = await config.client.load(fileKey);
        zip.file(file.name, file.buffer)
      }

      const archiveBuffer = await zip.generateAsync({
        type: 'nodebuffer',
        compression: config.compressionLevel ? 'DEFLATE' : 'STORE',
        compressionOptions: {
          level: config.compressionLevel,
        }
      });

      return resultBuilder.file(archiveBuffer, config.fileName, 'application/zip');
    }
  });
}
