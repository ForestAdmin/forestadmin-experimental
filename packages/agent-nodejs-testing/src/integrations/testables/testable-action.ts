import type { HttpRequester } from '../http-requester';

import FieldFormStates from '../action-fields/field-form-states';
import TestableActionFieldCheckbox from '../action-fields/testable-action-field-checkbox';
import TestableActionFieldCheckboxGroup from '../action-fields/testable-action-field-checkbox-group';
import TestableActionFieldColorPicker from '../action-fields/testable-action-field-color-picker';
import TestableActionFieldDate from '../action-fields/testable-action-field-date';
import TestableActionFieldDropdown from '../action-fields/testable-action-field-dropdown';
import TestableActionFieldEnum from '../action-fields/testable-action-field-enum';
import TestableActionFieldJson from '../action-fields/testable-action-field-json';
import TestableActionFieldNumber from '../action-fields/testable-action-field-number';
import TestableActionFieldNumberList from '../action-fields/testable-action-field-number-list';
import TestableActionFieldRadioGroup from '../action-fields/testable-action-field-radio-group';
import TestableActionFieldString from '../action-fields/testable-action-field-string';
import TestableActionFieldStringList from '../action-fields/testable-action-field-string-list';
import TestableActionLayoutRoot from '../action-layout/testable-action-layout-root';

export type BaseActionContext = {
  recordId?: string | number;
  recordIds?: string[] | number[];
};

export type ActionEndpointsByCollection = {
  [collectionName: string]: {
    [actionName: string]: { name: string; endpoint: string };
  };
};
export default class TestableAction<TypingsSchema> {
  private readonly name: string;
  private readonly collectionName: keyof TypingsSchema;
  private readonly actionEndpoints: ActionEndpointsByCollection;

  private readonly httpRequester: HttpRequester;
  private readonly fieldsFormStates: FieldFormStates<TypingsSchema>;
  private readonly ids: string[];

  constructor(
    name: string,
    collectionName: keyof TypingsSchema,
    httpRequester: HttpRequester,
    actionEndpoints: ActionEndpointsByCollection,
    actionContext?: BaseActionContext,
  ) {
    this.name = name;
    this.collectionName = collectionName;
    this.actionEndpoints = actionEndpoints;
    this.httpRequester = httpRequester;
    this.ids = (actionContext?.recordIds ?? [actionContext?.recordId]).filter(Boolean).map(String);

    this.fieldsFormStates = new FieldFormStates(
      this.name,
      this.getActionPath(collectionName, name),
      collectionName,
      this.httpRequester,
      this.ids,
    );
  }

  async reloadForm(): Promise<void> {
    await this.fieldsFormStates.loadInitialState();
  }

  async execute(): Promise<{ success: string; html?: string }> {
    const actionPath = this.getActionPath(this.collectionName, this.name);

    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          ids: this.ids,
          values: this.fieldsFormStates.getFieldValues(),
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

  getFieldNumber(fieldName: string): TestableActionFieldNumber<TypingsSchema> {
    return new TestableActionFieldNumber<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldJson(fieldName: string): TestableActionFieldJson<TypingsSchema> {
    return new TestableActionFieldJson<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldNumberList(fieldName: string): TestableActionFieldNumberList<TypingsSchema> {
    return new TestableActionFieldNumberList<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldString(fieldName: string): TestableActionFieldString<TypingsSchema> {
    return new TestableActionFieldString<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldStringList(fieldName: string): TestableActionFieldStringList<TypingsSchema> {
    return new TestableActionFieldStringList<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getDropdownField(fieldName: string): TestableActionFieldDropdown<TypingsSchema> {
    return new TestableActionFieldDropdown<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getCheckboxField(fieldName: string): TestableActionFieldCheckbox<TypingsSchema> {
    return new TestableActionFieldCheckbox<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getCheckboxGroupField(fieldName: string): TestableActionFieldCheckboxGroup<TypingsSchema> {
    return new TestableActionFieldCheckboxGroup<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getColorPickerField(fieldName: string): TestableActionFieldColorPicker<TypingsSchema> {
    return new TestableActionFieldColorPicker<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getDateField(fieldName: string): TestableActionFieldDate<TypingsSchema> {
    return new TestableActionFieldDate<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getEnumField(fieldName: string): TestableActionFieldEnum<TypingsSchema> {
    return new TestableActionFieldEnum<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getRadioGroupField(fieldName: string): TestableActionFieldRadioGroup<TypingsSchema> {
    return new TestableActionFieldRadioGroup<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  doesFieldExist(fieldName: string): boolean {
    return Boolean(this.fieldsFormStates.getField(fieldName));
  }

  getLayout() {
    return new TestableActionLayoutRoot(this.fieldsFormStates.getLayout());
  }

  private getActionPath(collectionName: keyof TypingsSchema, actionName: string): string {
    const collection = this.actionEndpoints[collectionName as string];
    if (!collection) throw new Error(`Collection ${collectionName as string} not found in schema`);

    const action = collection[actionName];

    if (!action) {
      throw new Error(`Action ${actionName} not found in collection ${collectionName as string}`);
    }

    if (!action.endpoint) {
      throw new Error(`Action ${actionName} not found in collection ${collectionName as string}`);
    }

    return action.endpoint;
  }
}
