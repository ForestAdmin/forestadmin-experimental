import { Bucket, Storage } from '@google-cloud/storage';

import { File, Options } from '../types';

export default class Client {
  private options: Options['gcs'];

  constructor(options: Options['gcs']) {
    if (!options.bucketId || !options.projectId) {
      throw new Error('Your gcs configuration is incorrect, missing either bucketId or projectId.');
    }

    this.options = options;
  }

  private get client() {
    return (new Storage({
      keyFile: this.options.keyFilePath,
      projectId: this.options.projectId,
      keyFilename: this.options.keyFilePath,
    })).bucket(this.options.bucketId)
  }
  async getSignedUrl(key: string): Promise<string> {
    const response = await this.client.file(key).getSignedUrl({
      expires: Date.now() + 1000 * 60 * 60,
      action: 'read',
    });

    return response[0];
  }

  async load(Key: string): Promise<File> {
    const response = await this.client.file(Key).download();
    const name = Key.substring(Key.lastIndexOf('/') + 1);

    return {
      buffer: response[0],
      mimeType: '',
      name,
    };
  }

  async save(Key: string, file: File): Promise<void> {
    await this.client.file(Key).save(file.buffer, {
      contentType: file.mimeType,
    });
  }
}
