import { CollectionCustomizer } from '@forestadmin/datasource-customizer';
import { BaseDataSource, DataSourceFactory, Logger } from '@forestadmin/datasource-toolkit';
import superagent from 'superagent';

import RpcDataSource from './datasource';
import { RpcDataSourceOptions } from './types';

export function createRpcDataSource(options: RpcDataSourceOptions): DataSourceFactory {
  return async (logger: Logger) => {
    const { authSecret, uri } = options;

    const authRq = superagent.post(`${uri}/forest/authentication`);
    const authResp = await authRq.send({ authSecret });

    const { token } = authResp.body;

    logger('Info', `Getting schema from Rpc agent on ${uri}.`);

    const introRq = superagent.get(`${uri}/forest/rpc-schema`);
    introRq.auth(token, { type: 'bearer' });
    const introResp = await introRq.send();

    const introspection = introResp.body;

    return new RpcDataSource(logger, { ...options, token }, introspection);
  };
}

export function generateRpcRelations(dataSource) {
  dataSource.compositeDataSource.dataSources.forEach((d: BaseDataSource) => {
    if (d instanceof RpcDataSource) {
      Object.entries(d.rpcRelations).forEach(([name, relations]) => {
        const cz: CollectionCustomizer = dataSource.getCollection(name);

        Object.entries(relations).forEach(([relationName, relationDefinition]) => {
          switch (relationDefinition.type) {
            case 'ManyToMany':
              cz.addManyToManyRelation(
                relationName,
                relationDefinition.foreignCollection,
                relationDefinition.throughCollection,
                {
                  foreignKey: relationDefinition.foreignKey,
                  foreignKeyTarget: relationDefinition.foreignKeyTarget,
                  originKey: relationDefinition.originKey,
                  originKeyTarget: relationDefinition.originKeyTarget,
                },
              );
              break;
            case 'OneToMany':
              cz.addOneToManyRelation(relationName, relationDefinition.foreignCollection, {
                originKey: relationDefinition.originKey,
                originKeyTarget: relationDefinition.originKeyTarget,
              });
              break;
            case 'OneToOne':
              cz.addOneToOneRelation(relationName, relationDefinition.foreignCollection, {
                originKey: relationDefinition.originKey,
                originKeyTarget: relationDefinition.originKeyTarget,
              });
              break;
            default:
              cz.addManyToOneRelation(relationName, relationDefinition.foreignCollection, {
                foreignKey: relationDefinition.foreignKey,
                foreignKeyTarget: relationDefinition.foreignKeyTarget,
              });
              break;
          }
        });
      });
    }
  });
}
