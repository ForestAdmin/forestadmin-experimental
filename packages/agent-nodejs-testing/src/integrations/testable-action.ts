import type { TSchema } from '@forestadmin/agent';

import Action from '../remote-control-agent/domains/action';

export default class TestableAction<
  TypingsSchema extends TSchema = TSchema,
> extends Action<TypingsSchema> {
  doesFieldExist(fieldName: string): boolean {
    return Boolean(this.fieldsFormStates.getField(fieldName));
  }
}
