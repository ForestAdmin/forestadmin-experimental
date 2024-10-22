import { PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/objects';

import HubSpotCommonCollection from './common';

export default class HubSpotCustomCollection extends HubSpotCommonCollection {
  override async search(publicObjectSearchRequest: PublicObjectSearchRequest) {
    return this.client.searchOnCustomHubspotCollection(
      this.hubSpotApiPath,
      publicObjectSearchRequest,
    );
  }

  override async getOne(id: number, projection?: string[]) {
    return this.client.getOneOnCustomHubspotCollection(this.hubSpotApiPath, `${id}`, projection);
  }
}
