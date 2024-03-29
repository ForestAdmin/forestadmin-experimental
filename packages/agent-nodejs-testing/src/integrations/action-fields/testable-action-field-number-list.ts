import TestableActionField from './testable-action-field';

export default class TestableActionFieldNumberList<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  private readonly values: number[];

  async add(value: number) {
    this.values.push(value);

    await this.fieldsFormStates.setFieldValue(this.name, this.values);
  }

  async remove(value: number) {
    const index = this.values.indexOf(value);

    if (index > -1) {
      this.values.splice(index, 1);
    }

    await this.fieldsFormStates.setFieldValue(this.name, this.values);
  }
}
