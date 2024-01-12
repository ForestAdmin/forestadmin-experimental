export type ResponseBody = { fields: { field: string }[] };

export type Field = {
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
