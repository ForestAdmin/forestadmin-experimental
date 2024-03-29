import TestableActionField from './testable-action-field';

export default class TestableActionFieldDate<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async fill(value: number | Date) {
    await this.fieldsFormStates.setFieldValue(this.name, new Date(value).toISOString());
  }
}
