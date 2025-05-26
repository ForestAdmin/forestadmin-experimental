import type { TSchema } from '@forestadmin/agent';

import { ActionEndpointsByCollection } from './testable-action';
import TestableChart from './testable-chart';
import TestableCollection from './testable-collection';
import Benchmark from '../benchmark';
import { HttpRequester } from '../http-requester';

/**
 * This class can be used to do integration tests on an agent.
 */

export default class TestableAgentBase<
  TypingsSchema extends TSchema = TSchema,
> extends TestableChart {
  private actionEndpoints?: ActionEndpointsByCollection;

  constructor(params?: {
    actionEndpoints?: ActionEndpointsByCollection;
    httpRequester?: HttpRequester;
  }) {
    super();
    if (params) this.init(params);
  }

  init(params: {
    actionEndpoints?: ActionEndpointsByCollection;
    httpRequester?: HttpRequester;
  }): void {
    this.actionEndpoints = params.actionEndpoints;
    this.httpRequester = params.httpRequester;
  }

  collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.actionEndpoints);
  }

  benchmark(): Benchmark {
    return new Benchmark();
  }
}
