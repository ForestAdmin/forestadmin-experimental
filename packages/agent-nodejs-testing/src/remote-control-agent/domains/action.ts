import type HttpRequester from '../http-requester';

import TestableActionLayoutRoot from '../../integrations/action-layout/testable-action-layout-root';
import ActionFieldCheckbox from '../action-fields/action-field-checkbox';
import ActionFieldCheckboxGroup from '../action-fields/action-field-checkbox-group';
import ActionFieldColorPicker from '../action-fields/action-field-color-picker';
import ActionFieldDate from '../action-fields/action-field-date';
import ActionFieldDropdown from '../action-fields/action-field-dropdown';
import ActionFieldEnum from '../action-fields/action-field-enum';
import ActionFieldJson from '../action-fields/action-field-json';
import ActionFieldNumber from '../action-fields/action-field-number';
import ActionFieldNumberList from '../action-fields/action-field-number-list';
import ActionFieldRadioGroup from '../action-fields/action-field-radio-group';
import ActionFieldString from '../action-fields/action-field-string';
import ActionFieldStringList from '../action-fields/action-field-string-list';
import FieldFormStates from '../action-fields/field-form-states';

export type BaseActionContext = {
  recordId?: string | number;
  recordIds?: string[] | number[];
};

export type ActionEndpointsByCollection = {
  [collectionName: string]: {
    [actionName: string]: { name: string; endpoint: string };
  };
};
export default class Action<TypingsSchema> {
  private readonly name: string;
  private readonly collectionName: keyof TypingsSchema;
  private readonly actionEndpoints: ActionEndpointsByCollection;

  private readonly httpRequester: HttpRequester;
  protected readonly fieldsFormStates: FieldFormStates<TypingsSchema>;
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

  getFieldNumber(fieldName: string): ActionFieldNumber<TypingsSchema> {
    return new ActionFieldNumber<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldJson(fieldName: string): ActionFieldJson<TypingsSchema> {
    return new ActionFieldJson<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldNumberList(fieldName: string): ActionFieldNumberList<TypingsSchema> {
    return new ActionFieldNumberList<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldString(fieldName: string): ActionFieldString<TypingsSchema> {
    return new ActionFieldString<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getFieldStringList(fieldName: string): ActionFieldStringList<TypingsSchema> {
    return new ActionFieldStringList<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getDropdownField(fieldName: string): ActionFieldDropdown<TypingsSchema> {
    return new ActionFieldDropdown<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getCheckboxField(fieldName: string): ActionFieldCheckbox<TypingsSchema> {
    return new ActionFieldCheckbox<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getCheckboxGroupField(fieldName: string): ActionFieldCheckboxGroup<TypingsSchema> {
    return new ActionFieldCheckboxGroup<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getColorPickerField(fieldName: string): ActionFieldColorPicker<TypingsSchema> {
    return new ActionFieldColorPicker<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getDateField(fieldName: string): ActionFieldDate<TypingsSchema> {
    return new ActionFieldDate<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getEnumField(fieldName: string): ActionFieldEnum<TypingsSchema> {
    return new ActionFieldEnum<TypingsSchema>(fieldName, this.fieldsFormStates);
  }

  getRadioGroupField(fieldName: string): ActionFieldRadioGroup<TypingsSchema> {
    return new ActionFieldRadioGroup<TypingsSchema>(fieldName, this.fieldsFormStates);
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
