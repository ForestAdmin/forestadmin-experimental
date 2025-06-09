import ActionField from './action-field';

export default class ActionFieldDate<TypingsSchema> extends ActionField<TypingsSchema> {
  async fill(value: number | Date) {
    await this.fieldsFormStates.setFieldValue(this.name, new Date(value).toISOString());
  }
}
