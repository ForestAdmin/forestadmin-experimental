import FieldGetter from './field-getter';
import FieldMultipleChoice from './field-multiple-choice';
import { PlainField, ResponseBody } from './types';
import { HttpRequester } from '../http-requester';

export default class FieldGetterFormStates<TypingsSchema> {
  private readonly fields: FieldGetter[];

  private readonly actionName: string;

  private readonly actionPath: string;

  private readonly collectionName: keyof TypingsSchema;

  private readonly httpRequester: HttpRequester;

  constructor(
    actionName: string,
    actionPath: string,
    collectionName: keyof TypingsSchema,
    httpRequester: HttpRequester,
  ) {
    this.fields = [];
    this.actionName = actionName;
    this.actionPath = actionPath;
    this.collectionName = collectionName;
    this.httpRequester = httpRequester;
  }

  getFieldValues(): Record<string, unknown> {
    return this.fields.reduce((acc, f) => {
      if (f.getValue() !== undefined) acc[f.getName()] = f.getValue();

      return acc;
    }, {});
  }

  async getMultipleChoiceField(name: string): Promise<FieldMultipleChoice> {
    const field = await this.getField(name);

    return new FieldMultipleChoice(field?.getPlainField());
  }

  async getField(name: string): Promise<FieldGetter | undefined> {
    if (this.isEmpty()) {
      await this.loadInitialState(name);
    }

    return this.fields.find(f => f.getName() === name);
  }

  async setFieldValue(name: string, value: unknown): Promise<void> {
    if (this.isEmpty()) {
      await this.loadInitialState(name);
    }

    const field = await this.getField(name);
    if (!field) throw new Error(`Field "${name}" not found in action "${this.actionName}"`);

    field.getPlainField().value = value;
    await this.loadChanges(name);
  }

  private addFields(plainFields: PlainField[]): void {
    plainFields.forEach(f => this.fields.push(new FieldGetter(f)));
  }

  private clear(): void {
    this.fields.splice(0, this.fields.length);
  }

  private isEmpty(): boolean {
    return this.fields.length === 0;
  }

  private async loadInitialState(fieldName: string): Promise<void> {
    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          ids: [],
          values: {},
          fields: [{ field: fieldName }],
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

  private async loadChanges(fieldName: string): Promise<void> {
    const requestBody = {
      data: {
        attributes: {
          collection_name: this.collectionName,
          changed_field: fieldName,
          ids: [],
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
