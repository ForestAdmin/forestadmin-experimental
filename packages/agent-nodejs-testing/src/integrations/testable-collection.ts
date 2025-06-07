import type { TSchema } from '@forestadmin/agent';

import TestableAction from './testable-action';
import { BaseActionContext } from '../remote-control-agent/domains/action';
import Collection from '../remote-control-agent/domains/collection';

export default class TestableCollection<
  TypingsSchema extends TSchema = TSchema,
> extends Collection<TypingsSchema> {
  override async action(
    actionName: string,
    actionContext?: BaseActionContext,
  ): Promise<TestableAction<TypingsSchema>> {
    return new TestableAction<TypingsSchema>(
      actionName,
      this.name,
      this.httpRequester,
      this.actionEndpoints,
      actionContext,
    );
  }
}
