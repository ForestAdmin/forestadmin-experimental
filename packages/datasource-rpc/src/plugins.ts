import type { PluginOptions } from './types';

import { CollectionCustomizer } from '@forestadmin/datasource-customizer';
import { BaseDataSource, DataSourceDecorator } from '@forestadmin/datasource-toolkit';

import RpcDataSource from './datasource';

function getRealDatasource(datasource) {
  let d = datasource;

  while (datasource instanceof DataSourceDecorator) {
    // @ts-ignore
    d = datasource.childDataSource;
  }

  return d;
}

function getCollectionName(collectionName: string, rename?: PluginOptions['rename']) {
  if (!rename) return collectionName;

  return typeof rename === 'function' ? rename(collectionName) : rename[collectionName];
}

// eslint-disable-next-line import/prefer-default-export
export function reconciliateRpc(dz, _, options?: PluginOptions) {
  dz.compositeDataSource.dataSources.forEach((datasource: BaseDataSource | DataSourceDecorator) => {
    const d = getRealDatasource(datasource);

    if (d instanceof RpcDataSource) {
      d.collections.forEach(c => {
        if (!c.schema.searchable) {
          const cz: CollectionCustomizer = dz.getCollection(
            getCollectionName(c.name, options.rename),
          );
          cz.disableSearch();
        }
      });

      Object.entries(d.rpcRelations).forEach(([name, relations]) => {
        const cz: CollectionCustomizer = dz.getCollection(name);

        Object.entries(relations).forEach(([relationName, relationDefinition]) => {
          const foreignCollection = getCollectionName(
            relationDefinition.foreignCollection,
            options.rename,
          );

          switch (relationDefinition.type) {
            case 'ManyToMany': {
              const throughCollection = getCollectionName(
                relationDefinition.throughCollection,
                options.rename,
              );
              cz.addManyToManyRelation(
                relationName,
                foreignCollection,
                throughCollection,
                relationDefinition,
              );
              break;
            }

            case 'OneToMany':
              cz.addOneToManyRelation(relationName, foreignCollection, relationDefinition);
              break;
            case 'OneToOne':
              cz.addOneToOneRelation(relationName, foreignCollection, relationDefinition);
              break;
            default:
              cz.addManyToOneRelation(relationName, foreignCollection, relationDefinition);
              break;
          }
        });
      });
    }
  });
}
