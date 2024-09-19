import {
  CollectionSchema,
  ColumnSchema,
  ColumnType,
  ConditionTreeBranch,
  ConditionTreeLeaf,
  Logger,
  Operator,
  PaginatedFilter,
  Projection,
  SchemaUtils,
} from '@forestadmin/datasource-toolkit';
import {
  FilterOperatorEnum,
  PublicObjectSearchRequest,
} from '@hubspot/api-client/lib/codegen/crm/objects';

export default class Converter {
  logger: Logger;

  primaryKeyName: string;

  schema: CollectionSchema;

  constructor(schema: CollectionSchema, logger: Logger) {
    this.schema = schema;
    this.logger = logger;
    [this.primaryKeyName] = SchemaUtils.getPrimaryKeys(schema);
  }

  isGetByIdRequest(filter: PaginatedFilter) {
    return (
      !filter.page?.limit &&
      filter.conditionTree &&
      (filter.conditionTree as ConditionTreeLeaf)?.operator === 'Equal' &&
      (filter.conditionTree as ConditionTreeLeaf)?.field === this.primaryKeyName
    );
  }

  static getOperatorsByType(type: ColumnType): Set<Operator> {
    const basic = ['Equal', 'NotEqual', 'Present', 'Blank'];

    switch (type) {
      case 'Number':
        return new Set([...basic, 'In', 'LessThan', 'GreaterThan'] as Operator[]);
      case 'Date':
      case 'Dateonly':
        return new Set([...basic, 'LessThan', 'GreaterThan'] as Operator[]);
      case 'String':
        return new Set([
          ...basic,
          'In',
          'Contains',
          'StartsWith',
          'EndsWith',
          'NotContains',
        ] as Operator[]);
      case 'Boolean':
        return new Set(basic as Operator[]);
      case 'Enum':
        return new Set([...basic, 'In'] as Operator[]);
      default:
        return new Set();
    }
  }

  private static convertOperatorAndValue(
    type: ColumnType,
    operator: Operator,
    value,
  ): { operator: FilterOperatorEnum; value?: string; values?: string[] } {
    switch (operator) {
      case 'Equal':
        if (type === 'Dateonly') {
          return { operator: 'EQ', value: `${+new Date(value)}` };
        }

        return { operator: 'EQ', value };
      case 'NotEqual':
        if (type === 'Dateonly') {
          return { operator: 'NEQ', value: `${+new Date(value)}` };
        }

        return { operator: 'NEQ', value };
      case 'Present':
        return { operator: 'HAS_PROPERTY', value };
      case 'LessThan':
        if (type === 'Dateonly') {
          return { operator: 'LT', value: `${+new Date(value)}` };
        }

        return { operator: 'LT', value };

      case 'GreaterThan':
        if (type === 'Dateonly') {
          return { operator: 'GT', value: `${+new Date(value)}` };
        }

        return { operator: 'GT', value };
      case 'In':
        return {
          operator: 'IN',
          values: value.filter(v => Boolean(v) && v !== ''),
        };
      case 'Blank':
        return { operator: 'NOT_HAS_PROPERTY', value };
      case 'StartsWith':
        return { operator: 'EQ', value: `${value}*` };
      case 'EndsWith':
        return { operator: 'EQ', value: `*${value}` };
      case 'Contains':
        return { operator: 'EQ', value: `*${value}*` };
      case 'NotContains':
        return { operator: 'NEQ', value: `*${value}*` };
      default:
        throw new Error(`Unsupported operator ${operator}`);
    }
  }

  convertFiltersToHubSpotProperties(filter: PaginatedFilter, projection: Projection) {
    const properties: {
      propertyName: string;
      operator: FilterOperatorEnum;
      value?: string;
      values?: string[];
    }[] = [];
    filter.conditionTree?.forEachLeaf(leaf => {
      if (properties.length >= 5) {
        this.logger(
          'Debug',
          // eslint-disable-next-line max-len
          'Too many fields to search for the Hubspot API (More than 5 criterias). Searched fields truncated.',
        );

        return;
      }

      const { columnType } = this.schema.fields[leaf.field] as ColumnSchema;
      const opv = Converter.convertOperatorAndValue(columnType, leaf.operator, leaf.value);
      properties.push({ propertyName: leaf.field, ...opv });
    });

    let filterGroups = [{ filters: properties }];

    if ((filter?.conditionTree as ConditionTreeBranch)?.aggregator === 'Or') {
      filterGroups = properties.map(p => ({ filters: [p] }));
    }

    let sort = filter.sort?.[0].field || this.primaryKeyName;
    if (!filter.sort?.[0].ascending) sort = `-${sort}`;

    const limit = (filter.page?.limit || 0) + (filter.page?.skip || 0);

    const publicObjectSearchRequest: PublicObjectSearchRequest = {
      filterGroups,
      sorts: [sort],
      properties: [...projection],
      limit: limit || 100,
      after: 0,
    };

    return publicObjectSearchRequest;
  }
}
