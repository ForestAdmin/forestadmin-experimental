import type { CollectionIntrospection, Introspection } from './types';

import { BaseDataSource, Logger } from '@forestadmin/datasource-toolkit';
import { Client } from '@hubspot/api-client';

import HubSpotCommonCollection from './collection/common';
import HubSpotCustomCollection from './collection/custom';
import HubSpotOwnerCollection from './collection/owner';

export default class HubSpotDatasource extends BaseDataSource {
  constructor(client: Client, schema: Introspection, logger: Logger) {
    super();

    Object.entries(schema).forEach(([collectionName, s]: [string, CollectionIntrospection]) => {
      const CollectionCtor = s.isCustom ? HubSpotCustomCollection : HubSpotCommonCollection;

      this.addCollection(
        new CollectionCtor(this, client, collectionName, s.apiPath, s.fields, logger),
      );
    });

    this.addCollection(new HubSpotOwnerCollection(this, client, 'owners', null, null, logger));

    logger('Info', 'HubSpot DataSource - Built');
  }
}
