import type { RpcSchema } from './types';

import { Agent, AgentOptions } from '@forestadmin/agent';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { DataSourceOptions, TCollectionName, TSchema } from '@forestadmin/datasource-customizer';
import { Collection, DataSource, DataSourceFactory } from '@forestadmin/datasource-toolkit';
import { createHash } from 'crypto';
import fs from 'fs/promises';

import RpcDataSourceCustomizer from './datasource-customizer';
import { makeRpcRoutes } from './routes';
import { keysToSnake, transformFilteroperator } from './utils';

export default class RpcAgent<S extends TSchema = TSchema> extends Agent<S> {
  private readonly rpcCollections: string[] = [];
  protected override customizer: RpcDataSourceCustomizer<S>;
  private _buildedSchema: RpcSchema = null;

  constructor(options: AgentOptions) {
    super(options);

    this.customizer = new RpcDataSourceCustomizer<S>({
      ignoreMissingSchemaElementErrors: options.ignoreMissingSchemaElementErrors || false,
    });
  }

  get buildedSchema() {
    return this._buildedSchema;
  }

  override addDataSource(
    factory: DataSourceFactory,
    options?: DataSourceOptions & { markCollectionsAsRpc?: boolean },
  ) {
    let markCollectionsCallback = null;

    if (options?.markCollectionsAsRpc) {
      markCollectionsCallback = (datasource: DataSource) => {
        datasource.collections.forEach(c => this.rpcCollections.push(c.name));
      };
    }

    this.customizer.addDataSource(
      factory,
      { ...options, markCollectionsCallback },
      this.restart.bind(this),
    );

    return this;
  }

  override getRoutes(dataSource: DataSource, services: ForestAdminHttpDriverServices) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return makeRpcRoutes(dataSource, this.options, services, this as RpcAgent<any>);
  }

  override async sendSchema(dataSource: DataSource): Promise<void> {
    this._buildedSchema = this.buildSchema(dataSource);
    this.options.logger('Info', 'RPC agent schema computed from datasource and cached.');

    this._buildedSchema.etag = createHash('sha1')
      .update(JSON.stringify(this._buildedSchema))
      .digest('hex');
    this.options.logger('Debug', `RPC agent schema hash computed: ${this._buildedSchema.etag}`);

    await fs.writeFile(
      '.forestadmin-rpc-schema.json',
      JSON.stringify(this._buildedSchema, null, 2),
    );

    this.options.logger('Info', 'Started as RPC agent, schema not sended.');
  }

  markCollectionsAsRpc<N extends TCollectionName<S>>(...names: N[]): this {
    this.rpcCollections.push(...names);

    return this;
  }

  buildCollection(collection: Collection, relations) {
    const { fields, actions, aggregationCapabilities, ...rest } = collection.schema;

    const buildedFields = Object.entries(fields).reduce((bFields, [name, schema]) => {
      const field = keysToSnake(schema);

      if (schema.type !== 'Column' && this.rpcCollections.includes(schema.foreignCollection)) {
        relations[name] = field;
      } else {
        bFields[name] = keysToSnake(schema);

        if (schema.type === 'Column') {
          bFields[name].filter_operators = transformFilteroperator(schema.filterOperators);
        }
      }

      return bFields;
    }, {});

    const buildedActions = Object.entries(actions).reduce((bActions, [name, schema]) => {
      bActions[name] = keysToSnake(schema);

      return bActions;
    }, {});

    const buildAggregationCapabilities = {
      supported_date_operations: Array.from(aggregationCapabilities.supportedDateOperations),
      support_groups: aggregationCapabilities.supportGroups,
    };

    return {
      name: collection.name,
      ...rest,
      aggregation_capabilities: buildAggregationCapabilities,
      fields: buildedFields,
      actions: buildedActions,
    };
  }

  buildSchema(dataSource: DataSource): RpcSchema {
    const rpcRelations = {};
    const collections = [];

    dataSource.collections.forEach(collection => {
      const relations = {};

      if (this.rpcCollections.includes(collection.name)) {
        Object.entries(collection.schema.fields).forEach(([name, field]) => {
          if (field.type !== 'Column' && !this.rpcCollections.includes(field.foreignCollection)) {
            relations[name] = keysToSnake(field);
          }
        });

        if (Object.keys(relations).length > 0) rpcRelations[collection.name] = relations;
      } else {
        collections.push(this.buildCollection(collection, relations));
      }
    });

    return {
      collections: collections.filter(Boolean),
      charts: dataSource.schema.charts,
      rpc_relations: rpcRelations,
      native_query_connections: Object.keys(dataSource.nativeQueryConnections).map(c => ({
        name: c,
      })),
    };
  }
}
