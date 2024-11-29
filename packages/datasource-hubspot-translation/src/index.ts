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
    if (!options.hubspotClientConfiguration.accessToken) {
      throw new Error(
        'Missing hubspotClientConfiguration.accessToken, please provide your hubspot token.',
      );
    }

    if (
      !options.hubspotClientConfiguration.limiterOptions ||
      !options.hubspotClientConfiguration.limiterOptions.minTime ||
      !options.hubspotClientConfiguration.limiterOptions.maxConcurrent
    ) {
      logger(
        'Warn',
        'No configuration has been passed for the rate limiting.' +
        'Using maxConcurrent: 1 and minTime: 110 to prevent reaching hubspot API limit',
      );
      options.hubspotClientConfiguration.limiterOptions = {
        maxConcurrent: 1,
        minTime: 110,
      };
    }

    const hubSpotClient = new Client(options.hubspotClientConfiguration);

    const fieldsByCollection: Introspection = {};

    await Promise.all(
      Object.keys(options.collections).map(async collectionName => {
        try {
          const { results } = await hubSpotClient.crm.properties.coreApi.getAll(
            collectionName,
            false,
          );

          const fields = [];
          options.collections[collectionName].forEach(fieldOption => {
            const field = results.find(r => r.name === fieldOption);

            if (field) {
              fields.push(field);
            } else {
              logger(
                'Warn',
                `The field '${fieldOption}' does not exist on the collection '${collectionName}'.` +
                  ` Please choose one of these fields:\n${results.map(r => r.name).join(', ')}`,
              );
            }
          });

          fieldsByCollection[collectionName] = {
            fields,
            apiPath: HUBSPOT_COMMON_COLLECTIONS_TO_API[collectionName],
            isCustom: false,
          };
        } catch (e) {
          logger(
            'Warn',
            `Could not introspect the collection '${collectionName}': ${e?.body?.message}`,
          );
        }
      }),
    );

    const customCollections = await hubSpotClient.crm.schemas.coreApi.getAll();
    customCollections.results.forEach(cc => {
      if (fieldsByCollection[cc.name]) {
        fieldsByCollection[cc.name].apiPath = cc.objectTypeId;
        fieldsByCollection[cc.name].isCustom = true;
      }
    });

    return new HubSpotDatasource(
      hubSpotClient,
      fieldsByCollection,
      options.excludeOwnerCollection,
      logger,
    );
  };
}
