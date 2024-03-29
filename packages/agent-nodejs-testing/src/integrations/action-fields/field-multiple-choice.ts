import FieldGetter from './field-getter';
import { PlainFieldOption } from './types';

export default class FieldMultipleChoice extends FieldGetter {
  getOptions(): PlainFieldOption[] | undefined {
    return this.getPlainField().widgetEdit?.parameters.static.options;
  }

  getOption(label: string): PlainFieldOption | undefined {
    return this.getOptions()?.find(o => o.label === label);
  }
}
