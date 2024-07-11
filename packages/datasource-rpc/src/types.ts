import type { CollectionSchema } from '@forestadmin/datasource-toolkit';

export type RpcSchema = {
  collections: (CollectionSchema & { name: string })[];
  charts: string[];
};

export type RpcDataSourceOptions = {
  authSecret: string;
  uri: string;
};

export type RpcDataSourceOptionsWithToken = RpcDataSourceOptions & {
  token: string;
};
