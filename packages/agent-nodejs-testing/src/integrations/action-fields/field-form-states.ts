import FieldGetter from './field-getter';
import FieldMultipleChoice from './field-multiple-choice';
import { PlainField, ResponseBody } from './types';
import { HttpRequester } from '../http-requester';

export default class FieldFormStates<TypingsSchema> {
  private readonly fields: FieldGetter[];
  private readonly actionName: string;
  private readonly actionPath: string;
  private readonly collectionName: keyof TypingsSchema;
  private readonly httpRequester: HttpRequester;
  private readonly ids: string[];

  constructor(
    actionName: string,
    actionPath: string,
    collectionName: keyof TypingsSchema,
    httpRequester: HttpRequester,
    ids: string[],
  ) {
    this.fields = [];
    this.actionName = actionName;
    this.actionPath = actionPath;
    this.collectionName = collectionName;
    this.httpRequester = httpRequester;
    this.ids = ids;
  }

  getFieldValues(): Record<string, unknown> {
    return this.fields.reduce((acc, f) => {
      if (f.getValue() !== undefined) acc[f.getName()] = f.getValue();

      return acc;
    }, {});
  }

  getMultipleChoiceField(name: string): FieldMultipleChoice {
    const field = this.getField(name);

    return new FieldMultipleChoice(field?.getPlainField());
  }

  getField(name: string): FieldGetter | undefined {
    return this.fields.find(f => f.getName() === name);
  }

  async setFieldValue(name: string, value: unknown): Promise<void> {
    const field = this.getField(name);
    if (!field) throw new Error(`Field "${name}" not found in action "${this.actionName}"`);

    field.getPlainField().value = value;
    await this.loadChanges(name);
  }

  async loadInitialState(): Promise<void> {
    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          ids: this.ids,
          values: {},
        },
        type: 'action-requests',
      },
    };

    const queryResults = await this.httpRequester.query<ResponseBody>({
      method: 'post',
      path: `${this.actionPath}/hooks/load`,
      body: requestBody,
    });

    this.addFields(queryResults.fields);
  }

  private addFields(plainFields: PlainField[]): void {
    plainFields.forEach(f => this.fields.push(new FieldGetter(f)));
  }

  private clear(): void {
    this.fields.splice(0, this.fields.length);
  }

  private async loadChanges(fieldName: string): Promise<void> {
    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          changed_field: fieldName,
          ids: this.ids,
          fields: this.fields.map(f => f.getPlainField()),
        },
        type: 'custom-action-hook-requests',
      },
    };

    const queryResults = await this.httpRequester.query<ResponseBody>({
      method: 'post',
      path: `${this.actionPath}/hooks/change`,
      body: requestBody,
    });

    this.clear();
    this.addFields(queryResults.fields);
  }
}
