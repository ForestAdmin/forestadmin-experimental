import type { Client } from '@hubspot/api-client';

import { Logger } from '@forestadmin/datasource-toolkit';
import { PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/objects';

export default class HubSpotClient {
  client: Client;
  logger: Logger;

  constructor(client: Client, logger: Logger) {
    this.client = client;
    this.logger = logger;
  }

  async searchOnCustomHubspotCollection(
    apiName: string,
    publicObjectSearchRequest: PublicObjectSearchRequest,
  ) {
    this.logger(
      'Debug',
      `Calling hubspot API using search endpoint on ${apiName} with ${JSON.stringify(
        publicObjectSearchRequest,
      )}`,
    );

    const { results, paging } = await this.client.crm.objects.searchApi.doSearch(
      apiName,
      publicObjectSearchRequest,
    );

    return { results: results.map(r => r.properties), cursor: paging?.next?.after };
  }

  async searchOnCommonHubspotCollection(
    apiName: string,
    publicObjectSearchRequest: PublicObjectSearchRequest,
  ) {
    this.logger(
      'Debug',
      `Calling hubspot API using search endpoint on ${apiName} with ${JSON.stringify(
        publicObjectSearchRequest,
      )}`,
    );

    const { results, paging } = await this.client.crm[apiName].searchApi.doSearch(
      publicObjectSearchRequest,
    );

    return { results: results.map(r => r.properties), cursor: paging?.next?.after };
  }

  async getOneOnCommonHubspotCollection(apiName: string, id: string, projection: string[]) {
    this.logger(
      'Debug',
      `Calling hubspot API using basic endpoint 
      on ${apiName} on id ${id} with a projection on ${projection},
      `,
    );

    let results = [];

    try {
      const response = await this.client.crm[apiName].basicApi.getById(id, projection);
      results = [response.properties];
    } catch (error) {
      if (error.code !== 404) throw error;
    }

    return results;
  }

  async getOneOnCustomHubspotCollection(apiName: string, id: string, projection: string[]) {
    this.logger(
      'Debug',
      `Calling hubspot API using basic endpoint 
      on ${apiName} on id ${id} with a projection on ${projection},
      `,
    );

    let results = [];

    try {
      const response = await this.client.crm.objects.basicApi.getById(apiName, id, projection);
      results = [response.properties];
    } catch (error) {
      if (error.code !== 404) throw error;
    }

    return results;
  }

  async searchOwner(publicObjectSearchRequest: PublicObjectSearchRequest) {
    this.logger(
      'Debug',
      `Calling hubspot API using owner endpoint 
      on using ${JSON.stringify(publicObjectSearchRequest)},
      `,
    );
    const email = publicObjectSearchRequest.filterGroups.find(filters =>
      filters.filters.find(f => f.propertyName === 'email'),
    )?.filters?.[0].value;
    const { results, paging } = await this.client.crm.owners.ownersApi.getPage(email);

    return { results, cursor: paging?.next?.after };
  }

  async getOneOwner(id: number) {
    this.logger(
      'Debug',
      `Calling hubspot API using owner endpoint 
      on id ${id},
      `,
    );

    let results = [];

    try {
      const owner = await this.client.crm.owners.ownersApi.getById(id);
      results = [owner];
    } catch (error) {
      if (error.code !== 404) throw error;
    }

    return results;
  }
}
