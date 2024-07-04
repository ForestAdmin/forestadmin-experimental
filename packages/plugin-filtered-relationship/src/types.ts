import type {
  CollectionCustomizationContext,
  TCollectionName,
  TConditionTree,
  TSchema,
} from '@forestadmin/datasource-customizer';

/**
 * Configuration for the GCS bucket addon of Forest Admin.
 *
 */
export type Options<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> = {
  /** Relation name displayed in the UI */
  relationName: string;

  /** Target foreign collection */
  foreignCollection: N;

  /** Handler to generate  */
  handler: (
    value: string | number,
    context: CollectionCustomizationContext<S, N>,
  ) => Promise<TConditionTree<S, N>>;
};
