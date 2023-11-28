import type { HttpRequester } from './http-requester';
import type { ForestSchema, ForestServerActionField } from '@forestadmin/forestadmin-client';
import FieldFormStates from './utils/field-form-states';

type ResponseBody = {
  fields: {
    field: string;
  }[];
};

export default class TestableActionFieldCheckbox<TypingsSchema> {
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

  async check(): Promise<void> {
    this.fieldsFormStates.setFieldValue(this.name, true);

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
