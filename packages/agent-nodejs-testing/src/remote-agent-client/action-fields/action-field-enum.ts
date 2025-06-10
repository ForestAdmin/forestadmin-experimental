import ActionField from './action-field';

export default class ActionFieldEnum<TypingsSchema> extends ActionField<TypingsSchema> {
  getOptions(): string[] | undefined {
    return this.fieldsFormStates.getField(this.name).getPlainField().enums;
  }

  async select(option: string) {
    if (!this.getOptions().some(o => o === option))
      throw new Error(`Option "${option}" not found in field "${this.name}"`);

    await this.fieldsFormStates.setFieldValue(this.name, option);
  }
}
