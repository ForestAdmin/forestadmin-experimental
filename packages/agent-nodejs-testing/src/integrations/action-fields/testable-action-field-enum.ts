import TestableActionField from './testable-action-field';

export default class TestableActionFieldEnum<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async check(option: string) {
    const opt = this.fieldsFormStates.getMultipleChoiceField(this.name).getOption(option);
    await this.fieldsFormStates.setFieldValue(this.name, opt);
  }
}
