import type { CollectionSchema, RelationSchema } from '@forestadmin/datasource-toolkit';

export type RpcSchema = {
  collections: (CollectionSchema & { name: string })[];
  charts: string[];
  rpc_relations: Record<string, Record<string, RelationSchema>>;
  native_query_connections: { name: string }[];
};

export type BuildedSchema = {
  etag: string | null;
  schema: RpcSchema | null;
};
