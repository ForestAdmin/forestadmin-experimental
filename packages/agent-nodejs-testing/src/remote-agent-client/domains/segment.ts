import type HttpRequester from '../http-requester';
import type { SelectOptions } from '../types';

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
      query: QuerySerializer.serialize(
        { ...options, ...{ filters: { segment: this.name } } },
        this.collectionName as string,
      ),
    });
  }
}
