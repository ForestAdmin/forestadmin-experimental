import TestableActionField from './testable-action-field';

export default class TestableActionFieldCheckboxGroup<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async check(option: string) {
    const field = await this.fieldsFormStates.getMultipleChoiceField(this.name);
    await this.fieldsFormStates.setFieldValue(this.name, [
      ...((field.getValue() || []) as string[]),
      field.getOption(option).value,
    ]);
  }

  async uncheck(option: string) {
    const field = await this.fieldsFormStates.getMultipleChoiceField(this.name);
    const checkedValues = (field.getValue() as string[]) || [];
    const { value } = field.getOption(option);

    await this.fieldsFormStates.setFieldValue(
      this.name,
      checkedValues.filter(checkedValue => value !== checkedValue),
    );
  }
}
