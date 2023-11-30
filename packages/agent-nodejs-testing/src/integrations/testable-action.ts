import type { HttpRequester } from './http-requester';
import type { ForestSchema } from '@forestadmin/forestadmin-client';

import FieldFormStates from './action-fields/field-form-states';
import TestableActionFieldCheckbox from './action-fields/testable-action-field-checkbox';
import TestableActionFieldDropdown from './action-fields/testable-action-field-dropdown';
import TestableActionFieldNumber from './action-fields/testable-action-field-number';

export default class TestableAction<TypingsSchema> {
  private readonly name: string;

  private readonly collectionName: keyof TypingsSchema;

  private readonly schema?: ForestSchema;

  private readonly httpRequester: HttpRequester;

  private readonly fieldsFormStates: FieldFormStates<TypingsSchema>;

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
    this.fieldsFormStates = new FieldFormStates(
      this.name,
      this.getActionPath(collectionName, name),
      collectionName,
      this.httpRequester,
    );
  }

  async execute(actionContext?: {
    recordId?: string | number;
    recordIds?: string[] | number[];
  }): Promise<{ success: string; html?: string }> {
    const actionPath = this.getActionPath(this.collectionName, this.name);

    const ids =
      actionContext?.recordIds || actionContext?.recordId ? [`${actionContext?.recordId}`] : [];

    const values = this.fieldsFormStates.getFields().reduce((acc, { field, value }) => {
      if (value !== undefined) acc[field] = value;

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

  async getFieldNumber(fieldName: string): Promise<TestableActionFieldNumber<TypingsSchema>> {
    return new TestableActionFieldNumber<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  async getDropdownField(fieldName: string): Promise<TestableActionFieldDropdown<TypingsSchema>> {
    return new TestableActionFieldDropdown<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  async getCheckboxField(fieldName: string): Promise<TestableActionFieldCheckbox<TypingsSchema>> {
    return new TestableActionFieldCheckbox<TypingsSchema>(fieldName, this.fieldsFormStates);
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
