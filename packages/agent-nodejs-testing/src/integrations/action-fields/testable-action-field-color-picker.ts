import TestableActionField from './testable-action-field';

export default class TestableActionFieldColorPicker<
  TypingsSchema,
> extends TestableActionField<TypingsSchema> {
  async fill(value: number | string) {
    await this.fieldsFormStates.setFieldValue(this.name, value.toString());
  }

  async isOpacityEnable() {
    return (await this.fieldsFormStates.getField(this.name))?.widgetEdit.parameters.static
      .enableOpacity;
  }

  async getQuickPalette() {
    return (await this.fieldsFormStates.getField(this.name))?.widgetEdit.parameters.static
      .quickPalette;
  }
}
