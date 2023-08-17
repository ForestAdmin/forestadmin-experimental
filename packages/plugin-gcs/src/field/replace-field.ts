import type { CollectionCustomizer } from '@forestadmin/datasource-customizer';

import type { Configuration } from '../types';

export default function replaceField(
  collection: CollectionCustomizer,
  config: Configuration,
): void {
  collection.removeField(config.sourcename);
  collection.renameField(config.filename, config.sourcename);
}
