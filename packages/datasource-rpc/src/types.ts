import type { CollectionSchema, RelationSchema } from '@forestadmin/datasource-toolkit';

export type RpcSchema = {
  collections: (CollectionSchema & { name: string })[];
  charts: string[];
  rpcRelations: Record<string, Record<string, RelationSchema>>;
  nativeQueryConnections: { name: string }[];
};

export type RpcDataSourceOptions = {
  authSecret: string;
  uri: string;
  introspection?: RpcSchema;
  disableSSE?: boolean;
};
