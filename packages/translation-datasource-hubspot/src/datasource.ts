import {BaseDataSource, type DataSourceFactory, Logger} from '@forestadmin/datasource-toolkit';
import { Client } from '@hubspot/api-client';
import UsersCollection from "./collections/users";
import HubspotClient from "./services/hubspot-client";
import errorHandler from "./utils/error-handler";
import CommonCollection from "./collections/common";
import { HubSpotDataSourceOptions } from "./types";

export default class HubSpotDatasource extends BaseDataSource {
  constructor(options: HubSpotDataSourceOptions, schema: { [key: string]: any[]}, logger?: Logger) {
    super();

    const hubspotClient = new Client({ accessToken: options.hubSpotToken })
    this.addCollection(new UsersCollection(this, hubspotClient));
    Object.keys(schema).forEach(collectionName => this.addCollection(new CommonCollection(this, collectionName, schema[collectionName], logger)))

    logger?.('Info', 'HubSpot DataSource - Built');
  }
}
