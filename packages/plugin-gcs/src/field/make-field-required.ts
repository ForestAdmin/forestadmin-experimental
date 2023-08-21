import type { Configuration } from '../types';
import type { CollectionCustomizer } from '@forestadmin/datasource-customizer';
import type { ColumnSchema } from '@forestadmin/datasource-toolkit';

export default function makeFieldRequired(
  collection: CollectionCustomizer,
  config: Configuration,
): void {
  const schema = collection.schema.fields[config.sourceName] as ColumnSchema;

  if (schema.validation?.find(rule => rule.operator === 'Present')) {
    collection.addFieldValidation(config.fileName, 'Present');
  }
}
