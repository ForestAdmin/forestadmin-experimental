import ActionField from './action-field';

export default class ActionFieldJson<TypingsSchema> extends ActionField<TypingsSchema> {
  async fill(value?: object) {
    await this.fieldsFormStates.setFieldValue(this.name, value);
  }
}
