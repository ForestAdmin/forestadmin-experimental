import ActionField from './action-field';

export default class ActionFieldCheckbox<TypingsSchema> extends ActionField<TypingsSchema> {
  async check() {
    await this.fieldsFormStates.setFieldValue(this.name, true);
  }

  async uncheck() {
    await this.fieldsFormStates.setFieldValue(this.name, false);
  }
}
