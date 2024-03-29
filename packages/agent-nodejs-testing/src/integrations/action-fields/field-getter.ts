import { PlainField } from './types';

export default class FieldGetter {
  private readonly plainField: PlainField;

  constructor(plainField: PlainField) {
    this.plainField = plainField;
  }

  getPlainField() {
    return this.plainField;
  }

  getValue() {
    return this.plainField.value;
  }

  getName() {
    return this.plainField.field;
  }
}
