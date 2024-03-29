import TestableActionField from './testable-action-field';

export default class TestableActionFieldNumberList<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async add(value: number) {
    const values = (await this.fieldsFormStates.getField(this.name)).getValue() as number[];
    await this.fieldsFormStates.setFieldValue(this.name, [...values, value]);
  }

  async remove(value: number) {
    const values = (await this.fieldsFormStates.getField(this.name)).getValue() as number[];
    if (values.includes(value)) throw new Error(`Value ${value} is not in the list`);

    await this.fieldsFormStates.setFieldValue(
      this.name,
      values.filter(val => val !== value),
    );
  }
}
