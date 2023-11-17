import type { TestableBaseOptions } from './types';
import type { HttpRequester } from './http-requester';
import type { ForestSchema } from '@forestadmin/forestadmin-client';

import QuerySerializer from './query-serializer';
import TestableAction from './testable-action';
import TestableRelation from './testable-relation';
import TestableSegment from './testable-segment';

export default class TestableCollection<TypingsSchema> {
  private readonly name: keyof TypingsSchema;

  private readonly httpRequester: HttpRequester;

  private readonly schema?: ForestSchema;

  constructor(name: keyof TypingsSchema, httpRequester: HttpRequester, schema: ForestSchema) {
    this.name = name;
    this.httpRequester = httpRequester;
    this.schema = schema;
  }

  action(name: string): TestableAction<TypingsSchema> {
    return new TestableAction<TypingsSchema>(name, this.name, this.httpRequester, this.schema);
  }

  segment(name: string): TestableSegment<TypingsSchema> {
    return new TestableSegment<TypingsSchema>(name, this.name, this.httpRequester);
  }

  relation(name: string, parentId: string | number): TestableRelation<TypingsSchema> {
    return new TestableRelation<TypingsSchema>(name, this.name, parentId, this.httpRequester);
  }

  async list<Data = unknown>(options?: TestableBaseOptions): Promise<Data[]> {
    return this.httpRequester.query<Data[]>({
      method: 'get',
      path: `/forest/${this.name as string}`,
      query: QuerySerializer.serialize(options),
    });
  }

  async delete<Data = unknown>(ids: string[] | number[]): Promise<Data> {
    const serializedIds = ids.map((id: string | number) => id.toString());
    const requestBody = {
      data: {
        attributes: { collection_name: this.name, ids: serializedIds },
        type: 'action-requests',
      },
    };

    return this.httpRequester.query<Data>({
      method: 'delete',
      path: `/forest/${this.name as string}`,
      body: requestBody,
    });
  }
}
