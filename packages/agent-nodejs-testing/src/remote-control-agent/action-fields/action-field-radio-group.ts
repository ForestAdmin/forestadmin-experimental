import ActionField from './action-field';
import { PlainFieldOption } from './types';

export default class ActionFieldRadioGroup<TypingsSchema> extends ActionField<TypingsSchema> {
  async getOptions(): Promise<PlainFieldOption[] | undefined> {
    return this.fieldsFormStates.getMultipleChoiceField(this.name).getOptions();
  }

  async check(option: string): Promise<void> {
    const opt = this.fieldsFormStates.getMultipleChoiceField(this.name).getOption(option);
    await this.fieldsFormStates.setFieldValue(this.name, opt.value);
  }
}
