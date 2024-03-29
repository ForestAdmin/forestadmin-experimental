export type ResponseBody = { fields: { field: string }[] };

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
