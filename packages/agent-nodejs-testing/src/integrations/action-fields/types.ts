export type ResponseBody = { fields: { field: string }[] };

export type PlainFieldOption = {
  label: string;
  value: string;
};

export type PlainField = {
  field: string;
  value?: unknown;
  widgetEdit?: {
    parameters: {
      static: {
        options: PlainFieldOption[];
      };
    };
  };
};
