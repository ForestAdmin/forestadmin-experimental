import type { TSchema } from '@forestadmin/agent';

import { ActionEndpointsByCollection } from './action';
import Chart from './chart';
import Collection from './collection';
import HttpRequester from '../http-requester';

export default class RemoteAgentClient<TypingsSchema extends TSchema = TSchema> extends Chart {
  protected actionEndpoints?: ActionEndpointsByCollection;

  constructor(params?: {
    actionEndpoints?: ActionEndpointsByCollection;
    httpRequester: HttpRequester;
  }) {
    super();
    if (!params) return;
    this.httpRequester = params.httpRequester;
    this.actionEndpoints = params.actionEndpoints;
  }

  collection(name: keyof TypingsSchema): Collection<TypingsSchema> {
    return new Collection<TypingsSchema>(name, this.httpRequester, this.actionEndpoints);
  }
}
