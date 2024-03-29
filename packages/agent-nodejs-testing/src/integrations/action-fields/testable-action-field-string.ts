import TestableActionField from './testable-action-field';

export default class TestableActionFieldString<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async fill(value: number | string) {
    await this.fieldsFormStates.setFieldValue(this.name, value.toString());
  }
}
