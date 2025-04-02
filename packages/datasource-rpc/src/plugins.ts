import { CollectionCustomizer } from '@forestadmin/datasource-customizer';
import { BaseDataSource } from '@forestadmin/datasource-toolkit';

import RpcDataSource from './datasource';

// eslint-disable-next-line import/prefer-default-export
export function reconciliateRpc(dataSource) {
  dataSource.compositeDataSource.dataSources.forEach((d: BaseDataSource) => {
    if (d instanceof RpcDataSource) {
      d.collections.forEach(c => {
        if (!c.schema.searchable) {
          const cz: CollectionCustomizer = dataSource.getCollection(c.name);
          cz.disableSearch();
        }
      });

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
