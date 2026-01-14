import type { IntrospectedSchema } from './types';
import type { Logger } from '@forestadmin/datasource-toolkit';
import type { GraphQLClient } from 'graphql-request';

import { BaseDataSource } from '@forestadmin/datasource-toolkit';

import { GraphqlCollection } from './collection';

export class GraphqlDataSource extends BaseDataSource<GraphqlCollection> {
  constructor(client: GraphQLClient, schema: IntrospectedSchema, logger: Logger) {
    super();

    for (const table of schema.tables) {
      logger('Debug', `Adding collection: ${table.name}`);
      this.addCollection(new GraphqlCollection(this, table, client));
    }
  }
}

export default GraphqlDataSource;
