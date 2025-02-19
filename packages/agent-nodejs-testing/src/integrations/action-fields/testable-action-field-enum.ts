import TestableActionField from './testable-action-field';

export default class TestableActionFieldEnum<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  getOptions(): string[] | undefined {
    return this.fieldsFormStates.getField(this.name).getPlainField().enums;
  }

  async check(option: string) {
    if (!this.getOptions().some(o => o === option))
      throw new Error(`Option "${option}" not found in field "${this.name}"`);

    await this.fieldsFormStates.setFieldValue(this.name, option);
  }
}
