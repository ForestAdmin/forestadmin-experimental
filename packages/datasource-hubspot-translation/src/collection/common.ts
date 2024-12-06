import {
  AggregateResult,
  BaseCollection,
  Caller,
  ColumnSchema,
  ColumnType,
  ConditionTreeLeaf,
  DataSource,
  FieldSchema,
  Logger,
  PaginatedFilter,
  Projection,
  RecordData,
} from '@forestadmin/datasource-toolkit';
import { Client } from '@hubspot/api-client';
import { PublicObjectSearchRequest } from '@hubspot/api-client/lib/codegen/crm/objects';

import Converter from '../filter-converter';
import HubSpotClient from '../hs-client';
import { FieldsIntrospection } from '../types';

const TYPE_MAPPING: { [key: string]: ColumnType } = {
  bool: 'Boolean',
  enumeration: 'Enum',
  date: 'Dateonly',
  datetime: 'Date',
  phone_number: 'String',
  string: 'String',
  number: 'Number',
  json: 'Json',
};

// Max limit setup by hubspot
const HUBSPOT_MAX_RECORD_LIMIT = 200;

export default class HubSpotCommonCollection extends BaseCollection {
  logger: Logger;

  client: HubSpotClient;

  hubSpotApiPath: string;

  converter: Converter;

  constructor(
    dataSource: DataSource,
    client: Client,
    collectionName: string,
    hubSpotApiPath: string,
    schema: FieldsIntrospection,
    logger: Logger,
  ) {
    super(`hubspot__${collectionName}`, dataSource, client);
    this.client = new HubSpotClient(client, logger);
    this.logger = logger;
    this.hubSpotApiPath = hubSpotApiPath;

    this.createFields(schema);

    this.converter = new Converter(this.schema, logger);
  }

  protected createFields(schema: FieldsIntrospection) {
    this.addField('hs_object_id', {
      type: 'Column',
      columnType: 'Number',
      isPrimaryKey: true,
      isReadOnly: true,
      isSortable: true,
      filterOperators: Converter.getOperatorsByType('Number'),
    });

    schema.forEach(field => {
      const faField: FieldSchema = {
        type: 'Column',
        columnType: TYPE_MAPPING[field.type],
        isReadOnly: true,
        isSortable: true,
        filterOperators: Converter.getOperatorsByType(TYPE_MAPPING[field.type]),
      };

      const options = field.options.map(option => option.value);

      if (faField.columnType === 'Enum') {
        if (options.length > 0) {
          faField.enumValues = options;
        } else {
          faField.columnType = 'String';
          this.logger(
            'Debug',
            `No options found for field ${field.name} 
            on collection ${this.name}, setting type to string.`,
          );
        }
      }

      if (field.referencedObjectType) {
        this.logger(
          'Debug',
          `Not supported relation ${field.referencedObjectType} 
          for ${field.name} on collection ${this.name}, 
          please make it manually using our relation API.`,
        );
      }

      this.addField(field.name, faField);
    });
  }

  protected async search(publicObjectSearchRequest: PublicObjectSearchRequest) {
    return this.client.searchOnCommonHubspotCollection(
      this.hubSpotApiPath,
      publicObjectSearchRequest,
    );
  }

  protected async getOne(id: number, projection?: string[]) {
    return this.client.getOneOnCommonHubspotCollection(this.hubSpotApiPath, `${id}`, projection);
  }

  /**
   * pagination work (limit 200 by hubspot)
   * norminal case limit lower max hubspot limit records
   *  eg limit 15 page 1
   *  => should be fine only one call with limit 15 after 0
   *  => should not slice
   * another case limit lower max hubspot limit records
   *  eg limit 15 page 2
   *  => should be fine only one call with limit 30 after 0
   *  => should send the second page with slice
   * pagination case limit higher max hubspot limit records
   *  eg limit 100 page 3
   *  => should call one time with limit 200 after 0
   *  => should call another time with limit 100 after the last of the previous call
   *  => should slice to show the third page
   * no limit case
   *  eg relationship
   *  => should call as many time as necessay unless batch of record was not rich the limit
   */

  override async list(
    caller: Caller,
    filter: PaginatedFilter,
    projection: Projection,
  ): Promise<RecordData[]> {
    let results: Record<string, string | number>[] = [];

    if (!this.converter.isGetByIdRequest(filter)) {
      const NumberOfRecordNeded = filter.page ? filter.page.limit + filter.page.skip : null;
      let currentResults: Record<string, string | number>[] = [];
      let cursor: string;
      let currentlimit: number;

      do {
        currentlimit = NumberOfRecordNeded
          ? Math.min(NumberOfRecordNeded - results.length, HUBSPOT_MAX_RECORD_LIMIT)
          : HUBSPOT_MAX_RECORD_LIMIT;

        const publicObjectSearchRequest = this.converter.convertFiltersToHubSpotProperties(
          filter,
          projection,
          currentlimit,
          cursor,
        );

        // eslint-disable-next-line no-await-in-loop
        ({ results: currentResults, cursor } = await this.search(publicObjectSearchRequest));

        results = results.concat(currentResults);
      } while (NumberOfRecordNeded ? results.length < NumberOfRecordNeded && cursor : cursor);

      if (filter.page) {
        const start = filter.page.skip;
        const end = start + filter.page.limit;
        results = results.slice(start, end);
      }
    } else {
      results = await this.getOne(
        Number((filter.conditionTree as ConditionTreeLeaf).value),
        projection,
      );
    }

    // Ignoring pagination emulation for now
    const projectedResult = projection.apply(results);

    projectedResult.forEach(r => {
      Object.entries(r).forEach(([key, value]) => {
        if ((this.schema.fields[key] as ColumnSchema).columnType === 'Number') {
          r[key] = Number(value);
        }
      });
    });

    return projectedResult;
  }

  // eslint-disable-next-line class-methods-use-this
  override create(): Promise<RecordData[]> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this
  override update(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this
  override delete(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line class-methods-use-this
  override aggregate(): Promise<AggregateResult[]> {
    throw new Error('Method not implemented.');
  }
}
