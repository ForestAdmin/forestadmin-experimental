import type { HttpRequester } from '../http-requester';
import type { SelectOptions } from '../types';

import TestableAction, { ActionEndpointsByCollection, BaseActionContext } from './testable-action';
import TestableRelation from './testable-relation';
import TestableSegment from './testable-segment';
import QuerySerializer from '../query-serializer';

export default class TestableCollection<TypingsSchema> {
  private readonly name: keyof TypingsSchema;
  private readonly httpRequester: HttpRequester;
  private readonly actionEndpoints?: ActionEndpointsByCollection;

  constructor(
    name: keyof TypingsSchema,
    httpRequester: HttpRequester,
    actionEndpoints: ActionEndpointsByCollection,
  ) {
    this.name = name;
    this.httpRequester = httpRequester;
    this.actionEndpoints = actionEndpoints;
  }

  async action(
    name: string,
    actionContext?: BaseActionContext,
  ): Promise<TestableAction<TypingsSchema>> {
    const action = new TestableAction<TypingsSchema>(
      name,
      this.name,
      this.httpRequester,
      this.actionEndpoints,
      actionContext,
    );
    await action.reloadForm();

    return action;
  }

  segment(name: string): TestableSegment<TypingsSchema> {
    return new TestableSegment<TypingsSchema>(name, this.name, this.httpRequester);
  }

  relation(name: string, parentId: string | number): TestableRelation<TypingsSchema> {
    return new TestableRelation<TypingsSchema>(name, this.name, parentId, this.httpRequester);
  }

  async search<Data = any>(content: string): Promise<Data[]> {
    return this.list({ search: content });
  }

  async list<Data = any>(options?: SelectOptions): Promise<Data[]> {
    return this.httpRequester.query<Data[]>({
      method: 'get',
      path: `/forest/${this.name as string}`,
      query: QuerySerializer.serialize(options),
    });
  }

  async count(options?: SelectOptions): Promise<number> {
    return Number(
      (
        await this.httpRequester.query<{ count: number }>({
          method: 'get',
          path: `/forest/${this.name as string}/count`,
          query: QuerySerializer.serialize(options),
        })
      ).count,
    );
  }

  async delete<Data = any>(ids: string[] | number[]): Promise<Data> {
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

  async create<Data = any>(attributes: Record<string, unknown>): Promise<Data> {
    const requestBody = { data: { attributes, type: this.name } };

    return this.httpRequester.query<Data>({
      method: 'post',
      path: `/forest/${this.name as string}`,
      body: requestBody,
    });
  }

  async update<Data = any>(
    id: string | number,
    attributes: Record<string, unknown>,
  ): Promise<Data> {
    const requestBody = { data: { attributes, type: this.name, id: id.toString() } };

    return this.httpRequester.query<Data>({
      method: 'put',
      path: `/forest/${this.name as string}/${id.toString()}`,
      body: requestBody,
    });
  }
}
