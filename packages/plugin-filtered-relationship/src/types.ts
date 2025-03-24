import type {
  CollectionCustomizationContext,
  TCollectionName,
  TConditionTree,
  TSchema,
} from '@forestadmin/datasource-customizer';

export type Options<
  S extends TSchema = TSchema,
  N extends TCollectionName<S> = TCollectionName<S>,
> = {
  /** Relation name displayed in the UI */
  relationName: string;

  /** Target foreign collection */
  foreignCollection: N;

  /** Target column on the collection default to the primary key */
  originKeyTarget?: string;
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
