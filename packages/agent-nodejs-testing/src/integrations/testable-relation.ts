import type { HttpRequester } from './http-requester';
import type { TestableBaseOptions } from './types';

import QuerySerializer from './query-serializer';

export default class TestableRelation<TypingsSchema> {
  private readonly name: string;

  private readonly collectionName: keyof TypingsSchema;

  private readonly parentId: string | number;

  private readonly httpRequester: HttpRequester;

  constructor(
    name: string,
    collectionName: keyof TypingsSchema,
    parentId: string | number,
    httpRequester: HttpRequester,
  ) {
    this.name = name;
    this.collectionName = collectionName;
    this.httpRequester = httpRequester;
    this.parentId = parentId;
  }

  list<Data = unknown>(options?: TestableBaseOptions): Promise<Data[]> {
    return this.httpRequester.query<Data[]>({
      method: 'get',
      path: `/forest/${this.collectionName as string}/${this.parentId}/relationships/${this.name}`,
      query: QuerySerializer.serialize(options),
    });
  }
}
