import type { IntrospectedColumn, IntrospectedRelationship, IntrospectedTable } from '../types';
import type {
  ColumnSchema,
  FieldSchema,
  ManyToOneSchema,
  OneToManySchema,
  Operator,
} from '@forestadmin/datasource-toolkit';

/**
 * Map internal type to Forest Admin column type
 */
function mapToForestColumnType(internalType: string, isArray: boolean): ColumnSchema['columnType'] {
  const typeMapping: Record<string, ColumnSchema['columnType']> = {
    Number: 'Number',
    String: 'String',
    Boolean: 'Boolean',
    Uuid: 'Uuid',
    Date: 'Date',
    Dateonly: 'Dateonly',
    Time: 'Time',
    Json: 'Json',
    Binary: 'Binary',
  };

  const baseType = typeMapping[internalType] || 'String';

  if (isArray) {
    return [baseType as 'String' | 'Number' | 'Boolean' | 'Uuid'];
  }

  return baseType;
}

/**
 * Get supported operators for a given type
 */
function getOperatorsForType(internalType: string, isArray: boolean): Set<Operator> {
  const baseOperators: Operator[] = ['Equal', 'NotEqual', 'Present', 'Missing'];

  if (isArray) {
    return new Set<Operator>([...baseOperators, 'In', 'NotIn', 'IncludesAll', 'IncludesNone']);
  }

  const typeOperators: Record<string, Operator[]> = {
    Number: [...baseOperators, 'LessThan', 'GreaterThan', 'In', 'NotIn'],
    String: [
      ...baseOperators,
      'Contains',
      'NotContains',
      'StartsWith',
      'EndsWith',
      'Like',
      'ILike',
      'In',
      'NotIn',
    ],
    Boolean: baseOperators,
    Uuid: [...baseOperators, 'In', 'NotIn'],
    Date: [
      ...baseOperators,
      'LessThan',
      'GreaterThan',
      'Today',
      'Yesterday',
      'PreviousMonth',
      'PreviousQuarter',
      'PreviousWeek',
      'PreviousYear',
      'PreviousMonthToDate',
      'PreviousQuarterToDate',
      'PreviousWeekToDate',
      'PreviousYearToDate',
      'Past',
      'Future',
      'Before',
      'After',
    ],
    Dateonly: [
      ...baseOperators,
      'LessThan',
      'GreaterThan',
      'Today',
      'Yesterday',
      'Before',
      'After',
    ],
    Time: [...baseOperators, 'LessThan', 'GreaterThan'],
    Json: baseOperators,
    Binary: baseOperators,
  };

  return new Set<Operator>(typeOperators[internalType] || baseOperators);
}

/**
 * Convert an introspected column to a Forest Admin column schema
 */
function convertColumn(column: IntrospectedColumn, primaryKeys: string[]): ColumnSchema {
  const isPrimaryKey = primaryKeys.includes(column.name);
  const columnType = mapToForestColumnType(column.type, column.isArray);

  return {
    type: 'Column',
    columnType,
    isPrimaryKey,
    isReadOnly: isPrimaryKey,
    isSortable: !column.isArray,
    filterOperators: getOperatorsForType(column.type, column.isArray),
    validation: column.nullable ? [] : [{ operator: 'Present' }],
    defaultValue: column.defaultValue,
  };
}

/**
 * Convert an introspected relationship to a Forest Admin relation schema
 */
function convertRelation(
  rel: IntrospectedRelationship,
  primaryKey: string[],
): ManyToOneSchema | OneToManySchema {
  if (rel.type === 'object') {
    // ManyToOne relationship
    const foreignKey = Object.keys(rel.mapping)[0] || `${rel.name}_id`;

    return {
      type: 'ManyToOne',
      foreignCollection: rel.remoteTable,
      foreignKey,
      foreignKeyTarget: rel.mapping[foreignKey] || 'id',
    };
  }

  // OneToMany relationship
  // mapping: { localPK: remoteFK } e.g. { 'id': 'user_id' }
  // originKey = FK column in foreign collection
  // originKeyTarget = PK column in this collection (that the FK references)
  const localPk = Object.keys(rel.mapping)[0] || primaryKey[0] || 'id';
  const remoteFk = rel.mapping[localPk] || `${rel.remoteTable}_id`;

  return {
    type: 'OneToMany',
    foreignCollection: rel.remoteTable,
    originKey: remoteFk,
    originKeyTarget: localPk,
  };
}

/**
 * Build Forest Admin fields from an introspected table
 */
export default function buildFields(table: IntrospectedTable): Record<string, FieldSchema> {
  const fields: Record<string, FieldSchema> = {};

  // Convert columns
  for (const column of table.columns) {
    fields[column.name] = convertColumn(column, table.primaryKey);
  }

  // Convert relationships
  for (const rel of table.relationships) {
    fields[rel.name] = convertRelation(rel, table.primaryKey);
  }

  return fields;
}
