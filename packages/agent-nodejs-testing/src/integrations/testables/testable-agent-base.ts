import type { Agent, TSchema } from '@forestadmin/agent';
import type { ForestSchema } from '@forestadmin/forestadmin-client/';

import fs from 'fs/promises';
import * as http from 'node:http';

import TestableChart from './testable-chart';
import TestableCollection from './testable-collection';
import Benchmark from '../benchmark';
import { createHttpRequester } from '../http-requester';
import { TestableAgentOptions } from '../types';

/**
 * This class can be used to do integration tests on an agent.
 */
export default class TestableAgentBase<
  TypingsSchema extends TSchema = TSchema,
> extends TestableChart {
  protected schema?: ForestSchema;
  protected readonly agentOptions: TestableAgentOptions;

  constructor({ agentOptions }: { agentOptions: TestableAgentOptions }) {
    const httpRequester = createHttpRequester({ agentOptions });
    super({ httpRequester });
    this.agentOptions = agentOptions;
  }

  collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.schema);
  }

  benchmark(): Benchmark {
    return new Benchmark();
  }
}
