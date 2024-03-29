import TestableActionField from './testable-action-field';
import { Field } from './types';

export default class TestableActionFieldCheckboxGroup<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  private readonly options: string[];

  async getOptions(): Promise<Field['widgetEdit']['parameters']['static']['options'] | undefined> {
    return (await this.fieldsFormStates.getField(this.name))?.widgetEdit.parameters.static.options;
  }

  async checkOption(option: string) {
    const value = (await this.getOptions())?.find(o => o.label === option)?.value;
    if (!value) throw new Error(`Option "${option}" not found in field "${this.name}"`);

    this.options.push(option);

    await this.fieldsFormStates.setFieldValue(this.name, this.options);
  }

  async uncheckOption(option: string) {
    const value = (await this.getOptions())?.find(o => o.label === option)?.value;
    if (!value) throw new Error(`Option "${option}" not found in field "${this.name}"`);

    const index = this.options.indexOf(option);

    if (index > -1) {
      this.options.splice(index, 1);
    }

    await this.fieldsFormStates.setFieldValue(this.name, this.options);
  }
}
