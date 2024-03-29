import TestableActionField from './testable-action-field';

export default class TestableActionFieldRadioGroup<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async check(option: string): Promise<void> {
    const opt = (await this.fieldsFormStates.getMultipleChoiceField(this.name)).getOption(option);
    await this.fieldsFormStates.setFieldValue(this.name, opt.value);
  }
}
