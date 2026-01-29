/**
 * Introspector - Discovers Airtable schema via Meta API
 */

import Airtable from 'airtable';
import axios from 'axios';

import { AirtableBaseDefinition, AirtableTableDefinition } from '../types/airtable';
import { AirtableLogger, AirtableDataSourceOptions } from '../types/config';
import { AIRTABLE_META_URL } from '../utils/constants';
import { withRetry } from '../utils/retry-handler';
import AirtableModel from '../model-builder/model';

type AirtableBase = ReturnType<typeof Airtable.base>;

/**
 * Result of introspection
 */
export interface IntrospectionResult {
  models: AirtableModel[];
  bases: Map<string, AirtableBase>;
}

export default class Introspector {
  private readonly apiKey: string;
  private readonly options: AirtableDataSourceOptions;
  private readonly logger?: AirtableLogger;

  constructor(
    apiKey: string,
    options: AirtableDataSourceOptions,
    logger?: AirtableLogger,
  ) {
    this.apiKey = apiKey;
    this.options = options;
    this.logger = logger;
  }

  /**
   * Introspect all accessible bases and tables
   */
  async introspect(): Promise<IntrospectionResult> {
    this.logger?.('Info', 'Introspector - Starting Airtable schema discovery');

    // Configure Airtable SDK
    const airtableConfig: { apiKey: string; endpointUrl?: string } = {
      apiKey: this.apiKey,
    };

    if (this.options.endpointUrl) {
      airtableConfig.endpointUrl = this.options.endpointUrl;
    }

    Airtable.configure(airtableConfig);

    // Fetch all bases
    const bases = await this.fetchBases();
    this.logger?.('Info', `Introspector - Found ${bases.length} accessible bases`);

    // Filter bases based on options
    const filteredBases = this.filterBases(bases);
    this.logger?.('Info', `Introspector - Processing ${filteredBases.length} bases after filtering`);

    const models: AirtableModel[] = [];
    const baseInstances = new Map<string, AirtableBase>();

    // Process each base
    for (const baseInfo of filteredBases) {
      this.logger?.('Info', `Introspector - Processing base: ${baseInfo.name} (${baseInfo.id})`);

      try {
        // Create Airtable SDK base instance
        const base = Airtable.base(baseInfo.id);
        baseInstances.set(baseInfo.id, base);

        // Fetch base schema
        // eslint-disable-next-line no-await-in-loop
        const tables = await this.fetchBaseSchema(baseInfo.id);

        // Process each table
        for (const table of tables) {
          // Filter tables based on options
          if (!this.shouldIncludeTable(table)) {
            this.logger?.('Debug', `Introspector - Skipping table: ${table.name}`);
            // eslint-disable-next-line no-continue
            continue;
          }

          // Generate collection name
          const collectionName = this.formatCollectionName(baseInfo, table);

          this.logger?.('Info', `Introspector - Adding collection: ${collectionName}`);

          // Create model
          const model = new AirtableModel(
            collectionName,
            base,
            baseInfo.id,
            table.id,
            table.fields.map(f => ({
              id: f.id,
              name: f.name,
              type: f.type as string,
              options: f.options as Record<string, unknown> | undefined,
            })),
            true,
            this.options.retryOptions,
          );

          models.push(model);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger?.('Warn', `Introspector - Failed to process base ${baseInfo.name}: ${errorMessage}`);
        // Continue with other bases
      }
    }

    this.logger?.(
      'Info',
      `Introspector - Schema discovery complete. Found ${models.length} collections.`,
    );

    return { models, bases: baseInstances };
  }

  /**
   * Fetch all accessible bases from Meta API
   */
  private async fetchBases(): Promise<AirtableBaseDefinition[]> {
    const headers = this.getHeaders();

    const response = await withRetry(async () => {
      const result = await axios.get(`${AIRTABLE_META_URL}/bases`, { headers });

      return result;
    }, this.options.retryOptions);

    return response.data.bases || [];
  }

  /**
   * Fetch schema for a specific base
   */
  private async fetchBaseSchema(baseId: string): Promise<AirtableTableDefinition[]> {
    const headers = this.getHeaders();

    const response = await withRetry(async () => {
      const result = await axios.get(
        `${AIRTABLE_META_URL}/bases/${baseId}/tables`,
        { headers },
      );

      return result;
    }, this.options.retryOptions);

    return response.data.tables || [];
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Filter bases based on include/exclude options
   */
  private filterBases(bases: AirtableBaseDefinition[]): AirtableBaseDefinition[] {
    const { includeBases, excludeBases } = this.options;

    return bases.filter(base => {
      // If includeBases is specified, only include those
      if (includeBases && includeBases.length > 0) {
        return includeBases.includes(base.name);
      }

      // Otherwise, exclude specified bases
      if (excludeBases && excludeBases.length > 0) {
        return !excludeBases.includes(base.name);
      }

      return true;
    });
  }

  /**
   * Check if a table should be included
   */
  private shouldIncludeTable(table: AirtableTableDefinition): boolean {
    const { includeTables, excludeTables } = this.options;

    // If includeTables is specified, only include those
    if (includeTables && includeTables.length > 0) {
      return includeTables.includes(table.name);
    }

    // Otherwise, exclude specified tables
    if (excludeTables && excludeTables.length > 0) {
      return !excludeTables.includes(table.name);
    }

    return true;
  }

  /**
   * Format collection name using custom formatter or default
   */
  private formatCollectionName(
    base: AirtableBaseDefinition,
    table: AirtableTableDefinition,
  ): string {
    if (this.options.collectionNameFormatter) {
      return this.options.collectionNameFormatter(
        { id: base.id, name: base.name },
        { id: table.id, name: table.name },
      );
    }

    // Default format: "Base Name - Table Name"
    return `${base.name} - ${table.name}`;
  }
}
