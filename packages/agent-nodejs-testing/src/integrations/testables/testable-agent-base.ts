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
  private port?: number;

  constructor(options: TestableAgentBaseOptions) {
    super();
    this.options = options;
  }

  init({ schema, port }: { schema: ForestSchema; port: number }): void {
    this.schema = schema;
    this.port = port;
    this.httpRequester = createHttpRequester({ ...this.options, port: this.port });
  }

  collection(name: keyof TypingsSchema): TestableCollection<TypingsSchema> {
    return new TestableCollection<TypingsSchema>(name, this.httpRequester, this.schema);
  }

  benchmark(): Benchmark {
    return new Benchmark();
  }
}
