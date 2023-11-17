import type { HttpRequester } from './http-requester';
import type { ForestSchema, ForestServerActionField } from '@forestadmin/forestadmin-client';

type ResponseBody<T extends ForestServerActionField = ForestServerActionField> = {
  fields: {
    field: string;
    widgetEdit: { parameters: T['widgetEdit']['parameters'] };
  }[];
};

export default class TestableAction<TypingsSchema> {
  private readonly name: string;

  private readonly collectionName: keyof TypingsSchema;

  private readonly schema?: ForestSchema;

  private readonly httpRequester: HttpRequester;

  constructor(
    name: string,
    collectionName: keyof TypingsSchema,
    httpRequester: HttpRequester,
    schema: ForestSchema,
  ) {
    this.name = name;
    this.collectionName = collectionName;
    this.schema = schema;
    this.httpRequester = httpRequester;
  }

  async execute(actionContext: {
    recordId?: string | number;
    recordIds?: string[] | number[];
    formValues?: Record<string, unknown>;
  }): Promise<{ success: string; html?: string }> {
    const actionPath = this.getActionPath(this.collectionName, this.name);

    const ids =
      actionContext.recordIds || actionContext.recordId ? [`${actionContext.recordId}`] : [];

    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          ids,
          values: actionContext.formValues ?? {},
        },
        type: 'custom-action-requests',
      },
    };

    return this.httpRequester.query<{ success: string }>({
      method: 'post',
      path: actionPath,
      body: requestBody,
    });
  }

  /**
   * This method can be used to test the dynamic content of form fields, like defaultValue or dropdown options.
   * @returns Widget parameters of a field
   */
  async getFormField<T extends ForestServerActionField = ForestServerActionField>(
    fieldName: string,
    fieldContext?: {
      search?: string;
      formValues?: Record<string, unknown>;
    },
  ): Promise<T['widgetEdit']['parameters']> {
    const { search, formValues } = fieldContext ?? {};
    const actionPath = this.getActionPath(this.collectionName, this.name);

    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          ids: [],
          values: formValues ?? {},
          fields: [{ field: fieldName, searchValue: search }],
        },
        type: 'action-requests',
      },
    };

    const queryResults = await this.httpRequester.query<ResponseBody<T>>({
      method: 'post',
      path: `${actionPath}/hooks/load`,
      body: requestBody,
    });

    const fieldForm = queryResults.fields.find(({ field }) => field === fieldName);

    if (!fieldForm) {
      throw new Error(`Field ${fieldName} not found in action ${this.name}`);
    }

    return fieldForm.widgetEdit.parameters;
  }

  private getActionPath(collectionName: keyof TypingsSchema, actionName: string): string {
    const { collections } = this.schema;
    const collection = collections.find(c => c.name === collectionName);
    if (!collection) throw new Error(`Collection ${collectionName as string} not found in schema`);

    const actionPath = collection.actions.find(action => action.name === actionName)?.endpoint;

    if (!actionPath) {
      throw new Error(`Action ${actionName} not found in collection ${collectionName as string}`);
    }

    return actionPath;
  }
}
