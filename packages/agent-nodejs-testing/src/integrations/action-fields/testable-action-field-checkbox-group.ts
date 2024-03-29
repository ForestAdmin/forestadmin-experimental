import TestableActionField from './testable-action-field';

export default class TestableActionFieldCheckboxGroup<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  private readonly options: string[];

  async check(option: string) {
    const value = (await this.fieldsFormStates.getMultipleChoiceField(this.name)).getOption(option);
    if (!value) throw new Error(`Option "${option}" not found in field "${this.name}"`);

    this.options.push(option);

    await this.fieldsFormStates.setFieldValue(this.name, this.options);
  }

  async uncheck(option: string) {
    const value = (await this.fieldsFormStates.getMultipleChoiceField(this.name)).getOption(option);
    if (!value) throw new Error(`Option "${option}" not found in field "${this.name}"`);

    this.options.splice(this.options.indexOf(option), 1);

    await this.fieldsFormStates.setFieldValue(this.name, this.options);
  }
}
