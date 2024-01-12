import { Field, ResponseBody } from './types';
import { HttpRequester } from '../http-requester';

export default class FieldFormStates<TypingsSchema> {
  private readonly fields: Field[];

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

  getFields(): Field[] {
    return this.fields;
  }

  getField(name: string): Field | undefined {
    return this.getFields().find(({ field }) => field === name);
  }

  async setFieldValue(name: string, value: unknown): Promise<void> {
    if (this.isEmpty()) {
      await this.loadInitialState(name);
    }

    const field = this.getField(name);
    if (!field) throw new Error(`Field "${name}" not found in action "${this.actionName}"`);

    field.value = value;
    await this.loadChanges(name);
  }

  private addFields(fields: Field[]): void {
    this.fields.push(...fields);
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
          fields: this.getFields(),
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
