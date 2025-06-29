import type HttpRequester from '../http-requester';
import type { SelectOptions } from '../types';
import type { TSchema } from '@forestadmin/agent';

import Action, { ActionEndpointsByCollection, BaseActionContext } from './action';
import Relation from './relation';
import Segment from './segment';
import QuerySerializer from '../query-serializer';

export default class Collection<TypingsSchema extends TSchema = TSchema> {
  protected readonly name: keyof TypingsSchema;
  protected readonly httpRequester: HttpRequester;
  protected readonly actionEndpoints?: ActionEndpointsByCollection;

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
    actionName: string,
    actionContext?: BaseActionContext,
  ): Promise<Action<TypingsSchema>> {
    const action = new Action<TypingsSchema>(
      actionName,
      this.name,
      this.httpRequester,
      this.actionEndpoints,
      actionContext,
    );
    await action.reloadForm();

    return action;
  }

  segment(name: string): Segment<TypingsSchema> {
    return new Segment<TypingsSchema>(name, this.name, this.httpRequester);
  }

  relation(name: string, parentId: string | number): Relation<TypingsSchema> {
    return new Relation<TypingsSchema>(name, this.name, parentId, this.httpRequester);
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
