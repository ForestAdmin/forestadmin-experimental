import FieldFormStates from './field-form-states';

export default abstract class ActionField<TypingsSchema> {
  protected readonly fieldsFormStates: FieldFormStates<TypingsSchema>;
  protected readonly name: string;

  constructor(name: string, fieldsFormStates: FieldFormStates<TypingsSchema>) {
    this.name = name;
    this.fieldsFormStates = fieldsFormStates;
  }

  getValue() {
    return this.fieldsFormStates.getField(this.name)?.getValue();
  }

  isRequired() {
    return this.fieldsFormStates.getField(this.name)?.getPlainField().isRequired;
  }

  protected isValueUndefinedOrNull(value: any): boolean {
    return value === undefined || value === null;
  }
}
