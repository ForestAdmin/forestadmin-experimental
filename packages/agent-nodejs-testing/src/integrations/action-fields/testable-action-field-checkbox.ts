import TestableActionField from './testable-action-field';

export default class TestableActionFieldCheckbox<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async check() {
    await this.fieldsFormStates.setFieldValue(this.name, true);
  }

  async uncheck() {
    await this.fieldsFormStates.setFieldValue(this.name, false);
  }
}
