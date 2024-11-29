import type { Property } from '@hubspot/api-client/lib/codegen/crm/properties';
import type Bottleneck from 'bottleneck';
import IConfiguration from '@hubspot/api-client/lib/src/configuration/IConfiguration';

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
  hubspotClientConfiguration: IConfiguration;
  collections: { [name: string]: string[] };
  excludeOwnerCollection: boolean;
};
