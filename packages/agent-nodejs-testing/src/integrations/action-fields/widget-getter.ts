import FieldGetter from './field-getter';
import { PlainFieldOption } from './types';

export default class WidgetGetter {
  private readonly fieldGetter: FieldGetter;

  constructor(fieldGetter: FieldGetter) {
    this.fieldGetter = fieldGetter;
  }

  getOptions(): PlainFieldOption[] | undefined {
    return this.fieldGetter.getPlainField().widgetEdit?.parameters.static.options;
  }

  getOption(label: string): PlainFieldOption | undefined {
    return this.getOptions()?.find(o => o.label === label);
  }
}
