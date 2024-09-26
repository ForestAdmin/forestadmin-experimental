import { PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/objects';
import HubSpotCommonCollection from './common';

export default class HubSpotOwnerCollection extends HubSpotCommonCollection {
  override createFields(): void {
    this.addField('id', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: true,
      isReadOnly: true,
      isSortable: false,
      filterOperators: new Set(['Equal']),
    });

    this.addField('firstName', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: false,
      isReadOnly: true,
      isSortable: false,
      filterOperators: new Set(),
    });

    this.addField('lastName', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: false,
      isReadOnly: true,
      isSortable: false,
      filterOperators: new Set(),
    });

    this.addField('email', {
      type: 'Column',
      columnType: 'String',
      isPrimaryKey: false,
      isReadOnly: true,
      isSortable: false,
      filterOperators: new Set(['Equal']),
    });
  }

  override async search(publicObjectSearchRequest: PublicObjectSearchRequest) {
    return this.client.searchOwner(publicObjectSearchRequest);
  }

  override async getOne(id: number) {
    return this.client.getOneOwner(id);
  }
}
