import {DataSourceFactory, Logger} from "@forestadmin/datasource-toolkit";
import HubspotClient from "./services/hubspot-client";
import errorHandler from "./utils/error-handler";
import HubSpotDatasource from "./datasource";
import { HUBSPOT_COMMON_COLLECTIONS_TO_API, HubSpotDataSourceOptions } from "./types";

export default function createHubspotDatasource(hubSpotOptions: HubSpotDataSourceOptions): DataSourceFactory {
  return async (logger: Logger) => {
    if (!hubSpotOptions?.hubSpotToken) {
      throw new Error('Missing hubspot token, please provide your hubspot token');
    }

    //TODO also analyse relationships
    //TODO also analyse custom collection (projects from our own hubspot for instance)
    const hubspotClient = HubspotClient.init(hubSpotOptions.hubSpotToken);
    const fieldsByCollection = {};

    //TODO enums of reference does handled
    const promises = Object.keys(HUBSPOT_COMMON_COLLECTIONS_TO_API).map(async collectionName => {
      try {
        const { results } = await hubspotClient.crm.properties.coreApi.getAll(collectionName, false);
        fieldsByCollection[collectionName] = results;
      } catch (e: any) {
        if (e.code === 403) {
          logger?.('Warn', `Unable to get properties for collection "${collectionName}".`);
        } else {
          throw errorHandler(e);
        }
      }
    });

    await Promise.all(promises);

    return new HubSpotDatasource(hubSpotOptions, fieldsByCollection, logger);
  }
}