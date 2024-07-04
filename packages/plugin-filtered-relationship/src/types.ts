import type {
  TCollectionName,
  TConditionTree,
  TFieldName,
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

  /** Target foreign collection key */
  foreignCollectionKey: TFieldName<S, N>;

  /** Filter condition on the relation */
  conditionTree: TConditionTree<S, N>;
};
