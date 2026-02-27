import type { DataSourceOptions } from '@forestadmin/datasource-customizer';
import type {
  CollectionSchema,
  DateOperation,
  RelationSchema,
} from '@forestadmin/datasource-toolkit';

export type RpcSchema = {
  collections: (CollectionSchema & { name: string })[];
  charts: string[];
  rpcRelations: Record<string, Record<string, RelationSchema>>;
  nativeQueryConnections: { name: string }[];
  etag: string;
};

type IntrospectionCollection = Omit<CollectionSchema, 'aggregationCapabilities'> & {
  name: string;
  aggregation_capabilities: {
    support_groups: boolean;
    supported_date_operations: DateOperation[];
  };
};

export type IntrospectionSchema = {
  collections: IntrospectionCollection[];
  charts: string[];
  rpc_relations: Record<string, Record<string, RelationSchema>>;
  native_query_connections: { name: string }[];
  etag: string;
};

export type RpcDataSourceOptions = {
  authSecret: string;
  uri: string;
  introspection?: IntrospectionSchema;
  pollingInterval?: number;
};

export type PluginOptions = {
  rename?: DataSourceOptions['rename'];
};
