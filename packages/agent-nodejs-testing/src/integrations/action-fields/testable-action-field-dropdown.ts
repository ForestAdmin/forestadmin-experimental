import TestableActionField from './testable-action-field';
import { PlainFieldOption } from './types';

export default class TestableActionFieldDropdown<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  getOptions(): PlainFieldOption[] | undefined {
    return this.fieldsFormStates.getMultipleChoiceField(this.name).getOptions();
  }

  async select(option: string): Promise<void> {
    const opt = this.fieldsFormStates.getMultipleChoiceField(this.name).getOption(option);
    await this.fieldsFormStates.setFieldValue(this.name, opt);
  }
}
