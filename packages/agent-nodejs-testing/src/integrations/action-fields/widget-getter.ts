import FieldGetter from './field-getter';

export type PlainField = {
  field: string;
  value?: unknown;
  widgetEdit?: {
    parameters: {
      static: {
        options: {
          label: string;
          value: string;
        }[];
      };
    };
  };
};

export default class WidgetGetter {
  private readonly fieldGetter: FieldGetter;

  constructor(fieldGetter: FieldGetter) {
    this.fieldGetter = fieldGetter;
  }

  getOptions() {
    return this.fieldGetter.getPlainField().widgetEdit?.parameters.static.options;
  }

  getOption(label: string) {
    return this.getOptions()?.find(o => o.label === label);
  }
}
