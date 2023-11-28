import type { HttpRequester } from './http-requester';
import type { ForestSchema, ForestServerActionField } from '@forestadmin/forestadmin-client';
import FieldFormStates from './utils/field-form-states';

type ResponseBody = {
  fields: {
    field: string;
  }[];
};

export default class TestableActionFieldDropdown<TypingsSchema> {
  private readonly name: string;

  private readonly actionPath: string;

  private readonly collectionName: keyof TypingsSchema;

  private readonly httpRequester: HttpRequester;

  private readonly fieldsFormStates: FieldFormStates;

  constructor(
    name: string,
    collectionName: keyof TypingsSchema,
    actionPath: string,
    fieldsFormStates: FieldFormStates,
    httpRequester: HttpRequester,
  ) {
    this.name = name;
    this.collectionName = collectionName;
    this.actionPath = actionPath;
    this.httpRequester = httpRequester;
    this.fieldsFormStates = fieldsFormStates;
  }

  get options(): any[] {
    return this.fieldsFormStates.getField(this.name).widgetEdit.parameters.static.options;
  }

  async selectOption(option: string): Promise<void> {
    const value = this.options.find((o) => o.label === option)?.value;
    this.fieldsFormStates.setFieldValue(this.name, value);

    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          changed_field: this.name,
          ids: [],
          fields: this.fieldsFormStates.getFields(),
        },
        type: 'custom-action-hook-requests',
      },
    }

    const queryResults = await this.httpRequester.query<ResponseBody>({
      method: 'post',
      path: `${this.actionPath}/hooks/change`,
      body: requestBody,
    });

    this.fieldsFormStates.clear();
    this.fieldsFormStates.addFields(queryResults.fields);
  }
}
