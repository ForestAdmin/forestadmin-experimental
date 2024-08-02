import {
  Aggregation,
  BaseCollection,
  Caller,
  Filter, Logger,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';
import type { Client } from '@hubspot/api-client';

import HubSpotDatasource from '../datasource';
import HubspotClient from "../services/hubspot-client";
import { ColumnType, FieldSchema } from "@forestadmin/datasource-toolkit/dist/src/interfaces/schema";
import { HUBSPOT_COMMON_COLLECTIONS_TO_API } from "../types";

interface IHubspotField {
  description: string,
  label: string,
  type: 'bool' | 'enumeration' | 'date' | 'dateTime' | 'string' | 'number' | 'object_coordinates' | 'json',
  createdAt: Date,
  name: string,
  options: any[],
  hasUniqueValue: boolean,
  updatedAt: Date,
}

const TYPE_MAPPING: { [key: string]: ColumnType } = {
  bool: 'Boolean',
  enumeration: 'Enum',
  date: 'Dateonly',
  datetime: 'Date',
  phone_number: 'String',
  string: 'String',
  number: 'Number',
  'object_coordinates': 'Point',
  json: 'Json',
}

/** Minimal implementation of a readonly data source */
export default class CommonCollection extends BaseCollection {
  private client: Client;
  private readonly hubspotCollectionName: string;
  private readonly logger: Logger;

  constructor(dataSource: HubSpotDatasource, collectionName: string, schema: any[], logger?: Logger) {
    // Set name of the collection once imported
    // NOTICE: not sure If I should pass the actual collection from lib or the whole lib
    super(`hubspot__${collectionName}`, dataSource, HubspotClient.instance);

    this.client = HubspotClient.instance;
    this.hubspotCollectionName = collectionName;
    this.logger = logger;

    //this.enableCount();
    //TODO created at fields suddenly starting to create errors, but I don't have such fields in any of the collections (besides Users)
    this.createFields(schema);
  }

  //TODO None of the fields are filterable nor sortable. Use the utils to handle the filters I have implemented. They map the filters + operators
  //from
  createFields(schema: IHubspotField[]) {
    this.addField('id', {
      type: 'Column',
      columnType: 'Number',
      isPrimaryKey: true,
      isReadOnly: true,
      isSortable: false,
      filterOperators: new Set(),
    });
    this.addField('createdAt', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      isSortable: false,
      filterOperators: new Set(),
    });
    this.addField('updatedAt', {
      type: 'Column',
      columnType: 'Date',
      isReadOnly: true,
      isSortable: false,
      filterOperators: new Set(),
    });
    schema.forEach(field => {
      const fieldToAdd: FieldSchema = {
        type: 'Column',
        columnType: TYPE_MAPPING[field.type],
        isPrimaryKey: false,
        isReadOnly: true,
        isSortable: false,
        filterOperators: new Set(),
      }

      if (fieldToAdd.columnType === 'Enum') {
        if (field.options?.length) {
          fieldToAdd.enumValues = field.options.map(option => option.value);
        } else {
          if (this.logger) {
            this.logger('Warn', `No options found for field ${field.name} on collection ${this.hubspotCollectionName}, setting type to string`);
          }

          fieldToAdd.columnType = 'String';
        }
      }

      if (fieldToAdd.columnType === undefined) {
        if (this.logger) {
          this.logger('Warn', `Unsupported type ${field.type} for ${this.hubspotCollectionName} -> ${field.name}.type, skipping.`);
        }
      } else {
        this.addField(field.name, fieldToAdd);
      }
    })
  }

  //TODO handle filters + projection
  async list(caller: Caller, filter: PaginatedFilter, projection: Projection) {
    const apiPath = HUBSPOT_COMMON_COLLECTIONS_TO_API[this.hubspotCollectionName];
    const results = await this.client.crm[apiPath].basicApi.getPage(filter.page.limit);

    return results.results.map(result => {
      return {
        id: result['id'],
        createdAt: result['createdAt'],
        updatedAt: result['updatedAt'],
        ...result.properties,
      }
    });
  }

  async aggregate(caller: Caller, filter: Filter, aggregation: Aggregation, limit: number) {
    return [{ value: 0, group: {} }];
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
