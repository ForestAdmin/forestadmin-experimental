import type { CollectionSchema, RelationSchema } from '@forestadmin/datasource-toolkit';

export type RpcSchema = {
  collections: (CollectionSchema & { name: string })[];
  charts: string[];
  rpcRelations: Record<string, Record<string, RelationSchema>>;
};

export type RpcDataSourceOptions = {
  authSecret: string;
  uri: string;
};
