import TestableActionField from './testable-action-field';

export default class TestableActionFieldJson<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async fill(value: object) {
    await this.fieldsFormStates.setFieldValue(this.name, value);
  }
}
