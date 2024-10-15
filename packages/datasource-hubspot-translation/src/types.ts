import type { Property } from '@hubspot/api-client/lib/codegen/crm/properties';

export type Introspection = {
  [collectionName: string]: CollectionIntrospection;
};

export type CollectionIntrospection = {
  apiPath: string;
  fields: FieldsIntrospection;
  isCustom: boolean;
};

export type FieldsIntrospection = Property[];

export type HubSpotOptions = {
  accessToken: string;
  collections: { [name: string]: string[] };
  excludeOwnerCollection: boolean;
};
