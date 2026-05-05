import { Logger } from '@forestadmin/datasource-toolkit';
import superagent from 'superagent';

import { IntrospectionSchema, RpcSchema } from './types';
import { appendHeaders, cameliseKeys, toPascalCase } from './utils';

export function parseIntrospection(introSchema: IntrospectionSchema): RpcSchema {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { collections, charts, rpc_relations, native_query_connections, etag } = introSchema;

  const parsedCollections = collections.map(collection => {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { actions, fields, aggregation_capabilities, ...rest } = collection;
    const parsedActions = Object.entries(actions).reduce((pActions: any, [name, schema]) => {
      pActions[name] = cameliseKeys(schema);

      return pActions;
    }, {});

    const parsedFields = Object.entries(fields).reduce((pFields: any, [name, schema]) => {
      pFields[name] = cameliseKeys(schema);

      if (schema.type === 'Column') {
        pFields[name].filterOperators = new Set(pFields[name].filterOperators.map(toPascalCase));
      }

      return pFields;
    }, {});

    return {
      ...rest,
      aggregationCapabilities: {
        supportedDateOperations: new Set(aggregation_capabilities.supported_date_operations),
        supportGroups: aggregation_capabilities.support_groups,
      },
      actions: parsedActions,
      fields: parsedFields,
    };
  });

  const parsedRelations = Object.entries(rpc_relations).reduce(
    (rpcRelations: any, [collectionName, collectionRelations]) => {
      rpcRelations[collectionName] = Object.entries(collectionRelations).reduce(
        (relations: any, [name, schema]) => {
          relations[name] = cameliseKeys(schema);

          return relations;
        },
        {},
      );

      return rpcRelations;
    },
    {},
  );

  return {
    collections: parsedCollections,
    charts,
    rpcRelations: parsedRelations,
    nativeQueryConnections: native_query_connections,
    etag,
  };
}

export async function getIntrospection(
  logger: Logger,
  uri: string,
  authSecret: string,
  etag?: string,
): Promise<RpcSchema> {
  logger('Info', `Getting schema from Rpc agent on ${uri}.`);

  const introRq = superagent.get(`${uri}/forest/rpc-schema`);
  appendHeaders(introRq, authSecret);
  if (etag) introRq.set('if-none-match', etag);

  const introResp = await introRq.send();

  return parseIntrospection(introResp.body);
}
