import {
  Aggregation,
  BaseCollection,
  Caller,
  ConditionTree,
  ConditionTreeLeaf,
  Filter,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';
import type { Client } from '@hubspot/api-client';

import HubSpotDatasource from '../datasource';

/** Minimal implementation of a readonly data source */
export default class UsersCollection extends BaseCollection {
  private client: Client;

  constructor(dataSource: HubSpotDatasource, hubSpotClient: Client) {
    // Set name of the collection once imported
    // NOTICE: not sure If I should pass the actual collection from lib or the whole lib
    super('hubspot__users', dataSource, hubSpotClient.crm);

    this.client = hubSpotClient;

    this.enableCount();

    this.addField('id', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      isPrimaryKey: true,
      filterOperators: new Set(['Equal', 'NotEqual', 'Present', 'Blank', 'In', 'GreaterThan', 'LessThan']),
      isSortable: false,
    });

    this.addField('userId', {
      type: 'Column',
      columnType: 'Number',
      isReadOnly: true,
      filterOperators: new Set(),
      isSortable: false,
    });

    this.addField('email', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set(),
      isSortable: false,
    });

    this.addField('firstName', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set(),
      isSortable: false,
    });

    this.addField('lastName', {
      type: 'Column',
      columnType: 'String',
      isReadOnly: true,
      filterOperators: new Set(),
      isSortable: false,
    });

    this.addField('archived', {
      type: 'Column',
      columnType: 'Boolean',
      isReadOnly: true,
      filterOperators: new Set(),
      isSortable: false,
    });

    this.addField('createdAt', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: new Set(),
      isSortable: false,
    });

    this.addField('updatedAt', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      filterOperators: new Set(),
      isSortable: false,
    });

    this.addField('teams', {
      type: 'Column',
      columnType: [{
        name: 'String',
        id: 'String',
        primary: "Boolean",
      }]
    })
  }

  async list(caller: Caller, filter: PaginatedFilter, projection: Projection) {
    if (filter.conditionTree) {
      return [await this.client.crm.owners.ownersApi.getById((filter.conditionTree as ConditionTreeLeaf).value as number)];
    }

    return (await this.client.crm.owners.ownersApi.getPage(undefined, undefined, 50)).results;
  }

  async aggregate(caller: Caller, filter: Filter, aggregation: Aggregation, limit: number) {
    if (filter.conditionTree) {
      const result = await this.client.crm.owners.ownersApi.getById((filter.conditionTree as ConditionTreeLeaf).value as number);
      return [{ value: result?.id ? 1 : 0, group: {} }]
    }

    const results = await this.client.crm.owners.ownersApi.getPage(undefined, undefined, 50);

    return [{ value: results.results.length, group: {} }];
  }

  async delete() {
    return Promise.reject(new Error('Not implemented'));
  }

  async create() {
    return Promise.reject(new Error('Not implemented'));
  }

  async update(caller: Caller, filter: Filter, patch: RecordData) {
    return Promise.reject(new Error('Not implemented'));
  }
}
