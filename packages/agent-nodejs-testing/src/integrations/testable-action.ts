import type { HttpRequester } from './http-requester';
import type { ForestSchema, ForestServerActionField } from '@forestadmin/forestadmin-client';
import TestableActionFieldDropdown from './testable-action-field-dropdown';
import FieldFormStates from './utils/field-form-states';
import TestableActionFieldCheckbox from './testable-action-field-checkbox';
import TestableActionFieldNumber from './testable-action-field-number';

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

  private readonly fieldsFormStates: FieldFormStates;

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
    this.fieldsFormStates = new FieldFormStates(this.name);
  }

  async execute(actionContext: {
    recordId?: string | number;
    recordIds?: string[] | number[];
  }): Promise<{ success: string; html?: string }> {
    const actionPath = this.getActionPath(this.collectionName, this.name);

    const ids =
      actionContext?.recordIds || actionContext?.recordId ? [`${actionContext?.recordId}`] : [];

    const values = this.fieldsFormStates.getFields().reduce((acc, { field, value }) => {
      if(value !== undefined) acc[field] = value;
      return acc;
    }, {});

    const requestBody = {
      data: {
        attributes: { collection_name: this.collectionName, ids, values },
        type: 'custom-action-requests',
      },
    };

    return this.httpRequester.query<{ success: string }>({
      method: 'post',
      path: actionPath,
      body: requestBody,
    });
  }

  async getFieldNumber<T extends ForestServerActionField = ForestServerActionField>(
    fieldName: string,
  ): Promise<TestableActionFieldNumber<TypingsSchema>> {
    const actionPath = this.getActionPath(this.collectionName, this.name);

    if (this.fieldsFormStates.isEmpty()) {
      await this.loadState(null, fieldName, actionPath);
    }

    this.fieldsFormStates.throwIfFieldDoesNotExist(fieldName);

    return new TestableActionFieldNumber<TypingsSchema>(
      fieldName,
      this.collectionName,
      actionPath,
      this.fieldsFormStates,
      this.httpRequester,
    );
  }
  async getDropdownField<T extends ForestServerActionField = ForestServerActionField>(
    fieldName: string,

  ): Promise<TestableActionFieldDropdown<TypingsSchema>> {
    const actionPath = this.getActionPath(this.collectionName, this.name);

    if (this.fieldsFormStates.isEmpty()) {
      await this.loadState(null, fieldName, actionPath);
    }

    this.fieldsFormStates.throwIfFieldDoesNotExist(fieldName);

    return new TestableActionFieldDropdown<TypingsSchema>(
      fieldName,
      this.collectionName,
      actionPath,
      this.fieldsFormStates,
      this.httpRequester,
    );
  }

  async getCheckboxField<T extends ForestServerActionField = ForestServerActionField>(
    fieldName: string,
  ): Promise<TestableActionFieldCheckbox<TypingsSchema>> {
    const actionPath = this.getActionPath(this.collectionName, this.name);

    if (this.fieldsFormStates.isEmpty()) {
      await this.loadState(null, fieldName, actionPath);
    }

    this.fieldsFormStates.throwIfFieldDoesNotExist(fieldName);

    return new TestableActionFieldCheckbox<TypingsSchema>(
      fieldName,
      this.collectionName,
      actionPath,
      this.fieldsFormStates,
      this.httpRequester,
    );
  }


  private async loadState(fieldContext: {
    search?: string;
    formValues?: Record<string, unknown>;
  }, fieldName: string, actionPath: string) {
    const { search, formValues } = fieldContext ?? {};

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

    const queryResults = await this.httpRequester.query<ResponseBody>({
      method: 'post',
      path: `${actionPath}/hooks/load`,
      body: requestBody,
    });

    this.fieldsFormStates.addFields(queryResults.fields);
  }

  doesFieldExist(fieldName: string): boolean {
    return !!this.fieldsFormStates.getField(fieldName);
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
