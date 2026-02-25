import type { GraphqlDataSourceOptions, IntrospectedSchema } from './types';
import type { DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';

import { GraphQLClient } from 'graphql-request';

import { GraphqlDataSource } from './datasource';
import { introspect } from './introspection';

// Re-export main classes
export { GraphqlDataSource } from './datasource';
export { GraphqlCollection } from './collection';

// Re-export types
export type {
  GraphqlDataSourceOptions,
  IntrospectedSchema,
  IntrospectedTable,
  IntrospectedColumn,
  IntrospectedRelationship,
  HasuraWhereClause,
  HasuraOperator,
  HasuraOrderBy,
} from './types';

// Re-export introspection utilities
export { introspect } from './introspection';

/**
 * Create a Forest Admin datasource connected to a Hasura GraphQL API
 *
 * @example
 * ```typescript
 * import { createAgent } from '@forestadmin/agent';
 * import { createGraphqlDataSource } from '@forestadmin/datasource-graphql';
 *
 * const agent = createAgent({
 *   authSecret: process.env.FOREST_AUTH_SECRET,
 *   envSecret: process.env.FOREST_ENV_SECRET,
 * });
 *
 * agent.addDataSource(
 *   createGraphqlDataSource({
 *     uri: 'https://my-hasura-instance.hasura.app/v1/graphql',
 *     headers: {
 *       'x-hasura-admin-secret': process.env.HASURA_ADMIN_SECRET,
 *     },
 *     excludedTables: ['_prisma_migrations'],
 *   })
 * );
 *
 * agent.start();
 * ```
 *
 * @param options - Configuration options for the GraphQL datasource
 * @param cachedIntrospection - Optional cached introspection to skip schema discovery
 * @returns A datasource factory function
 */
export function createGraphqlDataSource(
  options: GraphqlDataSourceOptions,
  cachedIntrospection?: { introspection: IntrospectedSchema },
): DataSourceFactory {
  return async (logger: Logger) => {
    const client = new GraphQLClient(options.uri, {
      headers: options.headers,
    });

    logger('Info', `Connecting to GraphQL endpoint: ${options.uri}`);

    // Use cached introspection or perform a new one
    let schema: IntrospectedSchema;

    if (cachedIntrospection?.introspection) {
      logger('Info', 'Using cached introspection');
      schema = cachedIntrospection.introspection;
    } else {
      logger('Info', 'Introspecting GraphQL schema...');
      schema = await introspect(options);
      logger('Info', `Found ${schema.tables.length} tables`);
    }

    logger('Info', `GraphQL datasource ready with ${schema.tables.length} collections`);

    return new GraphqlDataSource(client, schema, logger);
  };
}
