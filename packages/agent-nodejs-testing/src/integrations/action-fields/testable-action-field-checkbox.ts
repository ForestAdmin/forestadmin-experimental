import TestableActionField from './testable-action-field';

export default class TestableActionFieldCheckbox<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async check(): Promise<void> {
    await this.fieldsFormStates.setFieldValue(this.name, true);
  }

  async uncheck(): Promise<void> {
    await this.fieldsFormStates.setFieldValue(this.name, false);
  }
}
