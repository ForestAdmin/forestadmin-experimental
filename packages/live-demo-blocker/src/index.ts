import type {
  CollectionCustomizer,
  DataSourceCustomizer,
  ActionContext,
} from '@forestadmin/datasource-customizer';
import ResultBuilder from '@forestadmin/datasource-customizer/dist/decorators/actions/result-builder';
import { ActionResult } from '@forestadmin/datasource-toolkit';

type LiveDemoBlockerOptions = {
  userEmail?: string;
  errorMessage?: string;
}

const LIVE_DEMO_USER_EMAIL = 'erlich.bachman@forestadmin.com';

export default (
  dataSourceCustomizer: DataSourceCustomizer,
  collectionCustomizer: CollectionCustomizer,
  options: LiveDemoBlockerOptions = {},
) => {
  const liveDemoErrorMessage = options.errorMessage || 'You can only read data on this live demo.';

  function blockCallIfLiveDemoUser(context) {
    if (LIVE_DEMO_USER_EMAIL === context.caller.email) {
      context.throwForbiddenError(liveDemoErrorMessage);
    }
  }

  dataSourceCustomizer.collections.forEach(collection => {
    collection.addHook('Before', 'Update', blockCallIfLiveDemoUser);
    collection.addHook('Before', 'Delete', blockCallIfLiveDemoUser);
    collection.addHook('Before', 'Create', blockCallIfLiveDemoUser);
  });
};

export function blockActionForLiveDemoUser(smartActionContext: ActionContext, resultBuilder: ResultBuilder): ActionResult | null {
  if (smartActionContext.caller.email === LIVE_DEMO_USER_EMAIL) {
    return resultBuilder.error('You can only read data on this public demo application.');
  }

  return null;
}