import FieldFormStates from './field-form-states';

export default abstract class ActionField<TypingsSchema> {
  protected readonly fieldsFormStates: FieldFormStates<TypingsSchema>;
  protected readonly name: string;

  constructor(name: string, fieldsFormStates: FieldFormStates<TypingsSchema>) {
    this.name = name;
    this.fieldsFormStates = fieldsFormStates;
  }

  private get field() {
    return this.fieldsFormStates.getField(this.name);
  }

  getName(): string {
    return this.name;
  }

  getType(): string {
    return this.field?.getType();
  }

  getValue() {
    return this.field.getValue();
  }

  isRequired() {
    return this.field?.getPlainField().isRequired;
  }

  protected isValueUndefinedOrNull(value: any): boolean {
    return value === undefined || value === null;
  }
}
