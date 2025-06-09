import ActionField from './action-field';

export default class ActionFieldColorPicker<TypingsSchema> extends ActionField<TypingsSchema> {
  async fill(value: number | string) {
    await this.fieldsFormStates.setFieldValue(this.name, value.toString());
  }

  async isOpacityEnable() {
    const field = this.fieldsFormStates.getField(this.name);

    return Boolean(field?.getPlainField().widgetEdit.parameters.static.enableOpacity);
  }

  async getQuickPalette(): Promise<string[] | undefined> {
    const field = this.fieldsFormStates.getField(this.name);

    return field?.getPlainField().widgetEdit.parameters.static.quickPalette;
  }
}
