export default class FieldFormStates {
  private readonly fields: any[];

  private readonly actionName: string;

  constructor(actionName: string) {
    this.fields = [];
    this.actionName = actionName;
  }

  addFields(fields: any[]): void {
    this.fields.push(...fields);
  }

  getFields(): any[] {
    return this.fields;
  }

  getField(name: string): any | undefined {
    return this.getFields().find(({ field }) => field === name);
  }

  setFieldValue(name: string, value: any): void {
    this.getField(name).value = value;
  }

  clear(): void {
    this.fields.splice(0, this.fields.length);
  }

  isEmpty(): boolean {
    return this.fields.length === 0;
  }

  throwIfFieldDoesNotExist(name: string): void {
    const field = this.getField(name);
    if (!field) throw new Error(`Field "${name}" not found in action "${this.actionName}"`);
  }
}
