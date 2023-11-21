import type {
  ActionContext,
  ActionContextSingle,
  CollectionCustomizer,
  DataSourceCustomizer,
} from '@forestadmin/datasource-customizer';

import ResultBuilder from '@forestadmin/datasource-customizer/dist/decorators/actions/result-builder';
import { ActionResult } from '@forestadmin/datasource-toolkit';

export type LiveDemoBlockerOptions = {
  userEmail?: string; // The user email to use for the livedemo
  errorMessage?: string; // The error message
};

const LIVE_DEMO_USER_EMAIL_DEFAULT = 'erlich.bachman@forestadmin.com';

export default (
  dataSourceCustomizer: DataSourceCustomizer,
  collectionCustomizer: CollectionCustomizer,
  options: LiveDemoBlockerOptions = {},
) => {
  const liveDemoUserEmail = options.userEmail || LIVE_DEMO_USER_EMAIL_DEFAULT;
  const liveDemoErrorMessage = options.errorMessage || 'You can only read data on this live demo.';

  function blockCallIfLiveDemoUser(context) {
    if (liveDemoUserEmail === context.caller.email) {
      context.throwForbiddenError(liveDemoErrorMessage);
    }
  }

  dataSourceCustomizer.collections.forEach(collection => {
    collection.addHook('Before', 'Update', blockCallIfLiveDemoUser);
    collection.addHook('Before', 'Delete', blockCallIfLiveDemoUser);
    collection.addHook('Before', 'Create', blockCallIfLiveDemoUser);
  });
};

export function blockActionForLiveDemoUser(
  smartActionContext: ActionContextSingle | ActionContext,
  resultBuilder: ResultBuilder,
  options?: LiveDemoBlockerOptions,
): ActionResult | null {
  const liveDemoUserEmail = options?.userEmail || LIVE_DEMO_USER_EMAIL_DEFAULT;
  const liveDemoErrorMessage =
    options?.errorMessage || 'You can only read data on this public demo application.';

  if (smartActionContext.caller.email === liveDemoUserEmail) {
    return resultBuilder.error(liveDemoErrorMessage);
  }

  return null;
}
