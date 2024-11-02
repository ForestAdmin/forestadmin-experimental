import type { TSchema } from '@forestadmin/agent';
import type { ForestSchema } from '@forestadmin/forestadmin-client/';

import TestableChart from './testable-chart';
import TestableCollection from './testable-collection';
import Benchmark from '../benchmark';
import { createHttpRequester } from '../http-requester';

/**
 * This class can be used to do integration tests on an agent.
 */

export type TestableAgentBaseOptions = {
  prefix?: string;
  authSecret: string;
};

export default class TestableAgentBase<
  TypingsSchema extends TSchema = TSchema,
> extends TestableChart {
  private readonly options: TestableAgentBaseOptions;
  private schema?: ForestSchema;

  constructor(options: TestableAgentBaseOptions) {
    super();
    this.options = options;
  }

  init({ schema, url }: { schema: ForestSchema; url: string }): void {
    this.schema = schema;
    this.httpRequester = createHttpRequester({ ...this.options, url });
  }

  collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.schema);
  }

  benchmark(): Benchmark {
    return new Benchmark();
  }
}
