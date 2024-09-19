import { Logger } from '@forestadmin/datasource-toolkit';
import { Client } from '@hubspot/api-client';

import HubSpotDatasource from './datasource';
import { HubSpotOptions, Introspection } from './types';

export const HUBSPOT_COMMON_COLLECTIONS_TO_API: Record<string, string> = {
  companies: 'companies',
  contacts: 'contacts',
  deals: 'deals',
  line_items: 'lineItems',
  products: 'products',
  quotes: 'quotes',
  tickets: 'tickets',
};

export default function createHubSpotDataSource(options: HubSpotOptions) {
  return async (logger: Logger) => {
    const hubSpotClient = new Client({ accessToken: options.accessToken });

    if (!options.accessToken) {
      throw new Error('Missing hubspot accessKey, please provide your hubspot token.');
    }

    const fieldsByCollection: Introspection = {};

    await Promise.all(
      Object.keys(options.collections).map(async collectionName => {
        try {
          const { results } = await hubSpotClient.crm.properties.coreApi.getAll(
            collectionName,
            false,
          );

          fieldsByCollection[collectionName] = {
            fields: results.filter(r => options.collections[collectionName].includes(r.name)),
            apiPath: HUBSPOT_COMMON_COLLECTIONS_TO_API[collectionName],
            isCustom: false,
          };
        } catch (e) {
          logger('Debug', `${e}`);
        }
      }),
    );

    const customCollections = await hubSpotClient.crm.schemas.coreApi.getAll();
    customCollections.results.forEach(cc => {
      fieldsByCollection[cc.name].apiPath = cc.objectTypeId;
      fieldsByCollection[cc.name].isCustom = true;
    });

    return new HubSpotDatasource(hubSpotClient, fieldsByCollection, logger);
  };
}
