import TestableActionField from './testable-action-field';
import { Field } from './types';

export default class TestableActionFieldEnum<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async getOptions(): Promise<Field['widgetEdit']['parameters']['static']['options'] | undefined> {
    return (await this.fieldsFormStates.getField(this.name))?.widgetEdit.parameters.static.options;
  }

  async checkOption(option: string) {
    const value = (await this.getOptions())?.find(o => o.label === option)?.value;
    if (!value) throw new Error(`Option "${option}" not found in field "${this.name}"`);

    await this.fieldsFormStates.setFieldValue(this.name, value);
  }
}