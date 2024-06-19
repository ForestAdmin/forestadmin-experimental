import type { TCollectionName, TFieldName, TSchema } from '@forestadmin/datasource-customizer';

/**
 * Configuration for the GCS bucket addon of Forest Admin.
 *
 */
export type Options<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> = {
  /** Target field to turn into an enum, for example a status stored as a number */
  field: TFieldName<S, N>; // or TColumnName

  /** The object with enum descriptors as keys, and real values as... values. */
  enumObject: Record<string, unknown>;

  /** If you want a different field name than `${field}Enum` */
  enumFieldName?: string | null;
};
