import type { ActionContext, CollectionCustomizerFunction, TestableAction } from './types';

/**
 * Return a TestableAction allowing you to unit test action definition
 */
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

/**
 * Static Form field accessor
 */
export function getFormFieldAction<T>(action: TestableAction, label: string): T {
  if (!action.definition.form) return null;

  if (action.definition.form instanceof Function) {
    throw new Error('Use getDynamicFormFieldAction function helper');
  }

  return action.definition.form.find(field => field.label === label) as unknown as T;
}

/**
 * Dynamic Form field accessor
 */
export async function getDynamicFormFieldAction<T>(
  action: TestableAction,
  label: string,
  actionContext: ActionContext,
): Promise<T> {
  if (!action.definition.form) return null;

  if (!(action.definition.form instanceof Function)) {
    throw new Error('Use getFormFieldAction function helper');
  }

  return (await action.definition.form(actionContext)).find(
    field => field.label === label,
  ) as unknown as T;
}

export function getFormFieldValueAction<ReturnType>(
  action: TestableAction,
  label: string,
): (actionContext: ActionContext) => Promise<ReturnType> {
  if (!action.definition.form) return null;

  if (action.definition.form instanceof Function) {
    throw new Error('Use getDynamicFormFieldValueAction function helper');
  }

  return (
    getFormFieldAction(action, label) as {
      value: (actionContext: ActionContext) => Promise<ReturnType>;
    }
  ).value;
}

export async function getDynamicFormFieldValueAction<ReturnType>(
  action: TestableAction,
  label: string,
  actionContext: ActionContext,
): Promise<(actionContext: ActionContext) => Promise<ReturnType>> {
  if (!action.definition.form) return null;

  if (!(action.definition.form instanceof Function)) {
    throw new Error('Use getFormFieldValueAction function helper');
  }

  return (
    (await getDynamicFormFieldAction(action, label, actionContext)) as {
      value: (actionContext: ActionContext) => Promise<ReturnType>;
    }
  ).value;
}
