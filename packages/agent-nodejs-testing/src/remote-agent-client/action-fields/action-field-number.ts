import ActionField from './action-field';

export default class ActionFieldNumber<TypingsSchema> extends ActionField<TypingsSchema> {
  async fill(value: number | string) {
    await this.fieldsFormStates.setFieldValue(this.name, Number(value));
  }
}
