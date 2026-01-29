/**
 * Builder - Fluent API for configuring the Airtable DataSource
 */

import Airtable from 'airtable';
import axios from 'axios';

import { AirtableTableDefinition } from '../types/airtable';
import { AirtableDataSourceBuilder, RetryOptions } from '../types/config';
import { AIRTABLE_META_URL } from '../utils/constants';
import { withRetry } from '../utils/retry-handler';
import AirtableModel from '../model-builder/model';

type AirtableBase = ReturnType<typeof Airtable.base>;

/**
 * Configuration for adding a collection from a specific table
 */
export interface CollectionFromTableConfig {
  name: string;
  baseId: string;
  tableId: string;
}

/**
 * Configuration for adding collections from a base
 */
export interface CollectionsFromBaseConfig {
  baseId: string;
  collectionNameFormatter?: (table: { id: string; name: string }) => string;
  excludeTables?: string[];
  includeTables?: string[];
}

/**
 * Pending configuration entry
 */
interface PendingConfig {
  type: 'table' | 'base';
  config: CollectionFromTableConfig | CollectionsFromBaseConfig;
}

/**
 * AirtableDataSourceBuilder implementation
 */
export class AirtableDatasourceBuilder implements AirtableDataSourceBuilder {
  private readonly apiKey: string;
  private readonly endpointUrl?: string;
  private readonly retryOptions?: RetryOptions;
  private readonly pendingConfigs: PendingConfig[] = [];

  constructor(apiKey: string, endpointUrl?: string, retryOptions?: RetryOptions) {
    this.apiKey = apiKey;
    this.endpointUrl = endpointUrl;
    this.retryOptions = retryOptions;

    // Configure Airtable SDK
    const config: { apiKey: string; endpointUrl?: string } = { apiKey };

    if (endpointUrl) {
      config.endpointUrl = endpointUrl;
    }

    Airtable.configure(config);
  }

  /**
   * Add a collection from a specific table
   */
  addCollectionFromTable(config: CollectionFromTableConfig): AirtableDataSourceBuilder {
    this.pendingConfigs.push({ type: 'table', config });

    return this;
  }

  /**
   * Add all tables from a specific base
   */
  addCollectionsFromBase(config: CollectionsFromBaseConfig): AirtableDataSourceBuilder {
    this.pendingConfigs.push({ type: 'base', config });

    return this;
  }

  /**
   * Build models from the pending configurations
   */
  async build(): Promise<{ models: AirtableModel[]; bases: Map<string, AirtableBase> }> {
    const models: AirtableModel[] = [];
    const bases = new Map<string, AirtableBase>();

    for (const pending of this.pendingConfigs) {
      if (pending.type === 'table') {
        // eslint-disable-next-line no-await-in-loop
        const result = await this.buildCollectionFromTable(
          pending.config as CollectionFromTableConfig,
        );

        if (result) {
          models.push(result.model);

          if (!bases.has(result.baseId)) {
            bases.set(result.baseId, result.base);
          }
        }
      } else if (pending.type === 'base') {
        // eslint-disable-next-line no-await-in-loop
        const result = await this.buildCollectionsFromBase(
          pending.config as CollectionsFromBaseConfig,
        );

        models.push(...result.models);

        if (!bases.has(result.baseId)) {
          bases.set(result.baseId, result.base);
        }
      }
    }

    return { models, bases };
  }

  /**
   * Build a single collection from table configuration
   */
  private async buildCollectionFromTable(
    config: CollectionFromTableConfig,
  ): Promise<{ model: AirtableModel; base: AirtableBase; baseId: string } | null> {
    const { name, baseId, tableId } = config;

    // Fetch table schema
    const tables = await this.fetchBaseSchema(baseId);
    const table = tables.find(t => t.id === tableId);

    if (!table) {
      console.warn(`Table ${tableId} not found in base ${baseId}`);

      return null;
    }

    const base = Airtable.base(baseId);

    const model = new AirtableModel(
      name,
      base,
      baseId,
      tableId,
      table.fields.map(f => ({
        id: f.id,
        name: f.name,
        type: f.type as string,
        options: f.options as Record<string, unknown> | undefined,
      })),
      true,
      this.retryOptions,
    );

    return { model, base, baseId };
  }

  /**
   * Build collections from all tables in a base
   */
  private async buildCollectionsFromBase(
    config: CollectionsFromBaseConfig,
  ): Promise<{ models: AirtableModel[]; base: AirtableBase; baseId: string }> {
    const { baseId, collectionNameFormatter, excludeTables, includeTables } = config;

    const tables = await this.fetchBaseSchema(baseId);
    const base = Airtable.base(baseId);
    const models: AirtableModel[] = [];

    for (const table of tables) {
      // Apply include/exclude filters
      if (includeTables && includeTables.length > 0) {
        if (!includeTables.includes(table.name)) {
          // eslint-disable-next-line no-continue
          continue;
        }
      } else if (excludeTables && excludeTables.length > 0) {
        if (excludeTables.includes(table.name)) {
          // eslint-disable-next-line no-continue
          continue;
        }
      }

      // Generate collection name
      const collectionName = collectionNameFormatter
        ? collectionNameFormatter({ id: table.id, name: table.name })
        : table.name;

      const model = new AirtableModel(
        collectionName,
        base,
        baseId,
        table.id,
        table.fields.map(f => ({
          id: f.id,
          name: f.name,
          type: f.type as string,
          options: f.options as Record<string, unknown> | undefined,
        })),
        true,
        this.retryOptions,
      );

      models.push(model);
    }

    return { models, base, baseId };
  }

  /**
   * Fetch schema for a base
   */
  private async fetchBaseSchema(baseId: string): Promise<AirtableTableDefinition[]> {
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    const response = await withRetry(async () => {
      const result = await axios.get(
        `${AIRTABLE_META_URL}/bases/${baseId}/tables`,
        { headers },
      );

      return result;
    }, this.retryOptions);

    return response.data.tables || [];
  }
}
