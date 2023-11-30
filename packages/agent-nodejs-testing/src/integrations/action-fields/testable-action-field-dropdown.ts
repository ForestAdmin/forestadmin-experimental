import TestableActionField from './testable-action-field';

export default class TestableActionFieldDropdown<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  get options(): any[] {
    return this.fieldsFormStates.getField(this.name).widgetEdit.parameters.static.options;
  }

  async selectOption(option: string): Promise<void> {
    const value = this.options.find(o => o.label === option)?.value;
    await this.fieldsFormStates.setFieldValue(this.name, value);
  }
}
