import { Logger } from '@forestadmin/datasource-toolkit';
import { Bucket, Storage } from '@google-cloud/storage';

import { File, Options } from '../types';
import GCSClientError from '../error';

export default class Client {
  private options: Options['gcs'];
  private logger: Logger;

  constructor(options: Options['gcs'], logger: Logger) {
    if (!options.bucketId || !options.projectId) {
      throw new Error('Your gcs configuration is incorrect, missing either bucketId or projectId.');
    }

    this.options = options;
    this.logger = logger;
  }

  private get client(): Bucket {
    return (new Storage({
      keyFile: this.options.keyFilePath,
      projectId: this.options.projectId,
      keyFilename: this.options.keyFilePath,
    })).bucket(this.options.bucketId);
  }

  async getSignedUrl(key: string): Promise<string> {
    try {
      this.logger('Debug', `Get signed url for ${key}`);

      const response = await this.client.file(key).getSignedUrl({
        expires: Date.now() + 1000 * 60 * 60,
        action: 'read',
      });

      return response[0];
    } catch (error) {
      throw new GCSClientError(error.message);
    }
  }

  async load(key: string): Promise<File> {
    try {
      this.logger('Debug', `Download ${key} file`);

      const response = await this.client.file(key).download();
      const name = key.substring(key.lastIndexOf('/') + 1);

      return {
        buffer: response[0],
        mimeType: '',
        name,
      };
    } catch (error) {
      throw new GCSClientError(error.message);
    }
  }

  async save(key: string, file: File): Promise<void> {
    try {
      this.logger('Debug', `Upload ${key} file`);

      await this.client.file(key).save(file.buffer, {
        contentType: file.mimeType,
      });
    } catch (error) {
      throw new GCSClientError(error.message);
    }
  }
}
