import TestableActionField from './testable-action-field';

export default class TestableActionFieldStringList<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async add(value: string) {
    const values = this.fieldsFormStates.getField(this.name)?.getValue() as string[];
    await this.fieldsFormStates.setFieldValue(this.name, [...(values || []), value]);
  }

  async remove(value: string) {
    const values = this.fieldsFormStates.getField(this.name)?.getValue() as string[];
    if (values.includes(value)) throw new Error(`Value ${value} is not in the list`);

    await this.fieldsFormStates.setFieldValue(
      this.name,
      (values || []).filter(val => val !== value),
    );
  }
}
