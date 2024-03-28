import FieldFormStates from './field-form-states';

export default abstract class TestableActionField<TypingsSchema> {
  protected readonly fieldsFormStates: FieldFormStates<TypingsSchema>;

  protected readonly name: string;

  constructor(name: string, fieldsFormStates: FieldFormStates<TypingsSchema>) {
    this.name = name;
    this.fieldsFormStates = fieldsFormStates;
  }

  async getValue() {
    return (await this.fieldsFormStates.getField(this.name))?.value;
  }
}
