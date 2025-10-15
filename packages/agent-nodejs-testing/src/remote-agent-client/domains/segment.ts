import type HttpRequester from '../http-requester';
import type { ExportOptions, SelectOptions } from '../types';

import { WriteStream } from 'node:fs';

import QuerySerializer from '../query-serializer';

export default class Segment<TypingsSchema> {
  private readonly name: string;
  private readonly collectionName: keyof TypingsSchema;
  private readonly httpRequester: HttpRequester;

  constructor(name: string, collectionName: keyof TypingsSchema, httpRequester: HttpRequester) {
    this.name = name;
    this.collectionName = collectionName;
    this.httpRequester = httpRequester;
  }

  async list<Data = unknown>(options?: SelectOptions): Promise<Data[]> {
    return this.httpRequester.query<Data[]>({
      method: 'get',
      path: `/forest/${this.collectionName as string}`,
      query: this.serializeQuery(options),
    });
  }

  async exportCsv(stream: WriteStream, options?: ExportOptions): Promise<void> {
    await this.httpRequester.stream({
      path: `/forest/${this.name as string}.csv`,
      contentType: 'text/csv',
      query: {
        ...this.serializeQuery(options),
        ...{ header: JSON.stringify(options?.projection) },
      },
      stream,
    });
  }

  private serializeQuery(options?: SelectOptions): Record<string, unknown> {
    return QuerySerializer.serialize(
      { ...options, ...{ filters: { segment: this.name } } },
      this.collectionName as string,
    );
  }
}
