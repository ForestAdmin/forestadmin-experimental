import type { ActionContext, CollectionCustomizerFunction, TestableAction } from './types';
import type { DynamicField } from '@forestadmin/datasource-customizer/';

export function getAddedAction(
  collectionCustomizerFunction: CollectionCustomizerFunction,
  ...args: any[]
): TestableAction {
  let action: TestableAction;

  const collection = {
    addAction(name, definition) {
      if (action) throw new Error('You have two addAction in your customization');
      action = { definition, name };

      return this;
    },
  };

  collectionCustomizerFunction(collection as any, ...args);

  return action;
}

export function getFormFieldAction(action: TestableAction, label: string): DynamicField<any> {
  return action.definition.form.find(field => field.label === label) as DynamicField<any>;
}

export function getFormFieldValueAction<ReturnType>(
  action: TestableAction,
  label: string,
): (actionContext: ActionContext) => Promise<ReturnType> {
  return getFormFieldAction(action, label).value as (
    actionContext: ActionContext,
  ) => Promise<ReturnType>;
}
