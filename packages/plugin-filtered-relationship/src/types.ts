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

  /**
   * Function to generate a dynamic ConditionTree to filter records of the foreign collection
   * 
   * @param originId - id of the record from the origin collection on which the filtered relation is created
   * @param context contains the foreign collection as well as the dataSource 
   */
  handler: (
    originId: string | number,
    context: CollectionCustomizationContext<S, N>,
  ) => Promise<TConditionTree<S, N>>;
};
