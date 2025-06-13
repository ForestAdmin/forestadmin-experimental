import { ForestServerActionFormLayoutElement } from '@forestadmin/forestadmin-client';

export type ResponseBody = {
  fields: PlainField[];
  layout: ForestServerActionFormLayoutElement[];
};

export type PlainFieldOption = {
  label: string;
  value: string;
};

export type PlainField = {
  field: string;
  type: string;
  value?: unknown;
  isRequired: boolean;
  widgetEdit?: {
    parameters: {
      static: {
        options?: PlainFieldOption[];
        enableOpacity?: boolean;
        quickPalette?: string[];
      };
    };
  };
  enums?: string[];
};
