import type { CollectionSchema } from '@forestadmin/datasource-toolkit';

export type RpcSchema = {
  collections: Record<string, CollectionSchema>;
};

export type RpcDataSourceOptions = {
  authSecret: string;
  envSecret: string;
  uri: string;
};

export type RpcDataSourceOptionsWithToken = RpcDataSourceOptions & {
  token: string;
};
