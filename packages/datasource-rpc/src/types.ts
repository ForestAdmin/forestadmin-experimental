import type { DataSourceOptions } from '@forestadmin/datasource-customizer';
import type { CollectionSchema, RelationSchema } from '@forestadmin/datasource-toolkit';

export type RpcSchema = {
  collections: (CollectionSchema & { name: string })[];
  charts: string[];
  rpcRelations: Record<string, Record<string, RelationSchema>>;
  nativeQueryConnections: { name: string }[];
  etag: string;
};

export type RpcDataSourceOptions = {
  authSecret: string;
  uri: string;
  introspection?: RpcSchema;
  pollingInterval?: number;
};

export type PluginOptions = {
  rename?: DataSourceOptions['rename'];
};
