import FieldFormStates from './field-form-states';
import FieldGetter from './field-getter';

export default abstract class ActionField<TypingsSchema> extends FieldGetter {
  protected readonly fieldsFormStates: FieldFormStates<TypingsSchema>;
  protected readonly name: string;

  constructor(name: string, fieldsFormStates: FieldFormStates<TypingsSchema>) {
    super(fieldsFormStates.getField(name).getPlainField());
    this.fieldsFormStates = fieldsFormStates;
    this.name = name;
  }

  isRequired() {
    return this.fieldsFormStates.getField(this.name)?.getPlainField().isRequired;
  }

  protected isValueUndefinedOrNull(value: any): boolean {
    return value === undefined || value === null;
  }
}
