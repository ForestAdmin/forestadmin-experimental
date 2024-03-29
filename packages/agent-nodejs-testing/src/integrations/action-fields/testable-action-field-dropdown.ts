import TestableActionField from './testable-action-field';

export default class TestableActionFieldDropdown<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async selectOption(option: string): Promise<void> {
    const value = (await this.fieldsFormStates.getMultipleChoiceField(this.name)).getOption(option);
    if (!value) throw new Error(`Option "${option}" not found in field "${this.name}"`);

    await this.fieldsFormStates.setFieldValue(this.name, value);
  }
}
