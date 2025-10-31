import {
  CollectionSchema,
  ColumnSchema,
  FieldSchema,
  Logger,
} from '@forestadmin/datasource-toolkit';

import TypeConverter, { CosmosDataType } from './type-converter';
import { OverrideTypeConverter } from '../introspection/builder';
import ModelCosmos, { CosmosSchema } from '../model-builder/model';

export default class ModelToCollectionSchemaConverter {
  private static convertAttribute(
    fieldName: string,
    fieldSchema: { type: string; nullable?: boolean; indexed?: boolean },
  ): FieldSchema {
    const cosmosType = fieldSchema.type as CosmosDataType;
    const columnType = TypeConverter.fromDataType(cosmosType);
    const filterOperators = TypeConverter.operatorsForColumnType(columnType);
    const isSortable = TypeConverter.isSortable(cosmosType);

    const column: ColumnSchema = {
      columnType,
      filterOperators,
      type: 'Column',
      validation: [],
      isReadOnly: false, // Cosmos DB fields are generally writable
      isSortable,
    };

    return column;
  }

  private static convertAttributes(
    modelName: string,
    schema: CosmosSchema,
    overrideTypeConverter?: OverrideTypeConverter,
    logger?: Logger,
  ): CollectionSchema['fields'] {
    const fields: CollectionSchema['fields'] = {};

    Object.entries(schema).forEach(([fieldName, fieldSchema]) => {
      try {
        fields[fieldName] = this.getFieldSchemaOrOverride(
          fieldName,
          fieldSchema,
          overrideTypeConverter,
        );
      } catch (error) {
        logger?.('Warn', `Skipping column '${modelName}.${fieldName}' (${error.message})`);
      }
    });

    // Add the 'id' field which is required by Cosmos DB
    const idColumn: ColumnSchema = {
      columnType: 'String',
      type: 'Column',
      filterOperators: TypeConverter.operatorsForId(),
      validation: [],
      isReadOnly: false, // Can be set when creating documents
      isSortable: false, // Cosmos DB doesn't support efficient sorting on id/partition key
      isPrimaryKey: true,
    };

    fields.id = idColumn;

    return fields;
  }

  private static getFieldSchemaOrOverride(
    fieldName: string,
    fieldSchema: { type: string; nullable?: boolean; indexed?: boolean },
    overrideTypeConverter?: OverrideTypeConverter,
  ): FieldSchema {
    const field = ModelToCollectionSchemaConverter.convertAttribute(fieldName, fieldSchema);

    return overrideTypeConverter
      ? overrideTypeConverter({
          fieldName,
          attribute: fieldSchema,
          generatedFieldSchema: field,
        }) || field
      : field;
  }

  public static convert(model: ModelCosmos, logger?: Logger): CollectionSchema {
    if (!model) throw new Error('Invalid (null) model.');

    return {
      actions: {},
      charts: [],
      countable: model.enableCount ?? true,
      fields: {
        ...this.convertAttributes(
          model.name,
          model.getAttributes(),
          model.overrideTypeConverter,
          logger,
        ),
      },
      searchable: false, // Cosmos DB doesn't have built-in full-text search like Elasticsearch
      segments: [],
    };
  }
}
