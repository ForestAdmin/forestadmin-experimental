import { CosmosClient } from '@azure/cosmos';
import {
  Caller,
  CollectionSchema,
  ColumnSchema,
  Logger,
  PaginatedFilter,
  Projection,
} from '@forestadmin/datasource-toolkit';

import ArrayCollection from './array-collection';
import CosmosCollection from './collection';
import CosmosDataSource from './datasource';
import Introspector, { VirtualArrayCollectionConfig } from './introspection/introspector';
import { CosmosSchema } from './model-builder/model';
import TypeConverter, { CosmosDataType } from './utils/type-converter';

/**
 * Manages the creation and configuration of virtual array collections
 * Extracted from index.ts to improve maintainability and testability
 */
export default class VirtualCollectionManager {
  constructor(
    private readonly datasource: CosmosDataSource,
    private readonly client: CosmosClient,
    private readonly databaseName: string | undefined,
    private readonly logger?: Logger,
  ) {}

  /**
   * Create virtual array collections from configuration
   */
  async createVirtualCollections(
    configs: VirtualArrayCollectionConfig[],
    sampleSize = 100,
  ): Promise<void> {
    if (!configs || configs.length === 0) {
      return;
    }

    // Track created virtual collections for dependency resolution
    const createdVirtualCollections = new Map<string, ArrayCollection | CosmosCollection>();

    for (const config of configs) {
      try {
        this.logger?.(
          'Info',
          `Creating virtual collection '${config.collectionName}' for array ` +
            `field '${config.arrayFieldPath}'`,
        );

        // Sequential execution required: collections may depend on previously
        // created virtual collections
        // eslint-disable-next-line no-await-in-loop
        await this.createSingleVirtualCollection(config, sampleSize, createdVirtualCollections);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger?.(
          'Warn',
          `Failed to create virtual array collection '${config.collectionName}': ${errorMessage}`,
        );

        // Only log stack trace in development (when DEBUG env var is set)
        if (process.env.DEBUG && error instanceof Error && error.stack) {
          this.logger?.('Debug', `Error stack: ${error.stack}`);
        }
      }
    }

    // After all collections are created, set virtualized child fields
    this.setupVirtualizedFields(configs);
  }

  /**
   * Create a single virtual collection
   */
  private async createSingleVirtualCollection(
    config: VirtualArrayCollectionConfig,
    sampleSize: number,
    createdVirtualCollections: Map<string, ArrayCollection | CosmosCollection>,
  ): Promise<void> {
    // Find the parent collection (could be physical or virtual)
    const parentCollection = this.datasource.getCollection(config.parentContainerName);

    if (!parentCollection) {
      this.logger?.(
        'Warn',
        `Parent collection '${config.parentContainerName}' not found for ` +
          `virtual array collection '${config.collectionName}'`,
      );

      return;
    }

    let arraySchema: CosmosSchema | null = null;

    // Check if parent is a virtual ArrayCollection
    const isParentVirtual = parentCollection instanceof ArrayCollection;

    if (isParentVirtual) {
      arraySchema = await this.introspectFromVirtualParent(
        parentCollection as ArrayCollection,
        config,
        sampleSize,
      );
    } else if (!this.databaseName) {
      this.logger?.(
        'Warn',
        `Database name is required to introspect physical container for ` +
          `virtual collection '${config.collectionName}'`,
      );
    } else {
      arraySchema = await Introspector.introspectArrayField(
        this.client,
        this.databaseName,
        config.parentContainerName,
        config.arrayFieldPath,
      );
    }

    if (arraySchema) {
      const collectionSchema = this.buildCollectionSchema(arraySchema);
      const arrayCollection = this.createArrayCollection(
        parentCollection as CosmosCollection,
        config,
        collectionSchema,
      );

      this.datasource.addCollection(arrayCollection);
      createdVirtualCollections.set(config.collectionName, arrayCollection);

      this.logger?.('Info', `Successfully created virtual collection '${config.collectionName}'`);
    }
  }

  /**
   * Introspect array structure from a virtual parent collection
   */
  private async introspectFromVirtualParent(
    parentCollection: ArrayCollection,
    config: VirtualArrayCollectionConfig,
    sampleSize: number,
  ): Promise<CosmosSchema | null> {
    this.logger?.(
      'Info',
      `Parent '${config.parentContainerName}' is a virtual collection, ` +
        `introspecting from its schema`,
    );

    // Get the field schema from the parent collection
    const parentSchema = parentCollection.schema;
    const arrayField = parentSchema.fields[config.arrayFieldPath];

    if (!arrayField || arrayField.type !== 'Column') {
      this.logger?.(
        'Warn',
        `Array field '${config.arrayFieldPath}' not found in parent ` +
          `virtual collection '${config.parentContainerName}'`,
      );

      return null;
    }

    // Fetch sample data to introspect the structure
    const sampleRecords = await parentCollection.list(
      {} as Caller,
      new PaginatedFilter({
        page: {
          limit: sampleSize,
          skip: 0,
          apply: (records: unknown[]) => records,
        },
      }),
      new Projection(config.arrayFieldPath),
    );

    // Collect array items from sample records
    const arrayItems: unknown[] = [];

    for (const record of sampleRecords) {
      const value = record[config.arrayFieldPath];

      if (Array.isArray(value)) {
        arrayItems.push(...value);
      }
    }

    if (arrayItems.length === 0) {
      this.logger?.(
        'Warn',
        `No array items found in field '${config.arrayFieldPath}' of ` +
          `virtual collection '${config.parentContainerName}'`,
      );

      return null;
    }

    return this.inferSchemaFromArrayItems(arrayItems);
  }

  /**
   * Analyze array items to infer schema
   */
  private inferSchemaFromArrayItems(arrayItems: unknown[]): CosmosSchema {
    const fieldTypes: Record<string, CosmosDataType[]> = {};

    for (const item of arrayItems) {
      if (typeof item === 'object' && item !== null) {
        for (const [fieldKey, value] of Object.entries(item)) {
          if (!fieldTypes[fieldKey]) {
            fieldTypes[fieldKey] = [];
          }

          const type = TypeConverter.inferTypeFromValue(value);
          fieldTypes[fieldKey].push(type);
        }
      }
    }

    // Build schema from inferred types
    const arraySchema: CosmosSchema = {};

    for (const [fieldName, types] of Object.entries(fieldTypes)) {
      const uniqueTypes = Array.from(new Set(types));
      const commonType = TypeConverter.getMostSpecificType(uniqueTypes);
      const nullable = uniqueTypes.includes('null');

      arraySchema[fieldName] = {
        type: commonType,
        nullable,
        indexed: true,
      };
    }

    return arraySchema;
  }

  /**
   * Convert CosmosSchema to Forest Admin CollectionSchema
   */
  private buildCollectionSchema(arraySchema: CosmosSchema): CollectionSchema {
    const fields: Record<string, ColumnSchema> = {};

    for (const [fieldName, fieldInfo] of Object.entries(arraySchema)) {
      const columnType = TypeConverter.getColumnTypeFromDataType(fieldInfo.type as CosmosDataType);
      const operators = TypeConverter.operatorsForColumnType(columnType);

      fields[fieldName] = {
        columnType,
        filterOperators: operators,
        isPrimaryKey: false,
        isReadOnly: false,
        isSortable: TypeConverter.isSortable(fieldInfo.type as CosmosDataType),
        type: 'Column',
      } as ColumnSchema;
    }

    return {
      actions: {},
      charts: [],
      countable: true,
      fields,
      searchable: true,
      segments: [],
    };
  }

  /**
   * Create the ArrayCollection instance
   */
  private createArrayCollection(
    parentCollection: CosmosCollection,
    config: VirtualArrayCollectionConfig,
    collectionSchema: CollectionSchema,
  ): ArrayCollection {
    return new ArrayCollection(
      this.datasource,
      parentCollection,
      config.collectionName,
      config.arrayFieldPath,
      collectionSchema,
      this.logger,
      this.client,
      [], // Empty for now, will be set after all collections are created
      true, // Enable optimizations for better performance with large datasets
    );
  }

  /**
   * Setup virtualized child fields for parent collections
   */
  private setupVirtualizedFields(configs: VirtualArrayCollectionConfig[]): void {
    const parentCollections = new Set(configs.map(c => c.parentContainerName));

    for (const parentName of parentCollections) {
      try {
        const parentCollection = this.datasource.getCollection(parentName);

        // Find all child virtual collections that have this collection as parent
        const childVirtualFields = configs
          .filter(c => c.parentContainerName === parentName)
          .map(c => c.arrayFieldPath);

        if (childVirtualFields.length > 0) {
          // For virtual collections (ArrayCollection), set virtualized child fields for filtering
          if (parentCollection instanceof ArrayCollection) {
            parentCollection.setVirtualizedChildFields(childVirtualFields);
            this.logger?.(
              'Info',
              `Set virtualized child fields for virtual collection '${parentName}': ` +
                `[${childVirtualFields.join(', ')}]`,
            );
          }

          // For physical collections (CosmosCollection), mark array fields as non-sortable
          if (parentCollection instanceof CosmosCollection) {
            parentCollection.markVirtualizedFieldsAsNonSortable(childVirtualFields);
            this.logger?.(
              'Info',
              `Marked virtualized array fields as non-sortable for '${parentName}': ` +
                `[${childVirtualFields.join(', ')}]`,
            );
          }
        }
      } catch (error) {
        // Parent collection might not exist
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger?.(
          'Debug',
          `Skipping virtualized field setup for '${parentName}': ${errorMessage}`,
        );
      }
    }
  }
}
