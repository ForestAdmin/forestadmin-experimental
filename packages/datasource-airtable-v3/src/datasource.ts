/**
 * AirtableDataSource - Forest Admin DataSource implementation for Airtable
 */

import Airtable from 'airtable';
import { BaseDataSource, Logger } from '@forestadmin/datasource-toolkit';

import AirtableCollection from './collection';
import AirtableModel from './model-builder/model';

type AirtableBase = ReturnType<typeof Airtable.base>;

export default class AirtableDataSource extends BaseDataSource<AirtableCollection> {
  /**
   * Map of base IDs to Airtable base instances
   */
  protected readonly bases: Map<string, AirtableBase>;

  /**
   * Logger instance
   */
  protected readonly logger?: Logger;

  constructor(
    models: AirtableModel[],
    bases: Map<string, AirtableBase>,
    logger?: Logger,
  ) {
    super();

    this.bases = bases;
    this.logger = logger;

    // Create collections from models
    this.createCollections(models);

    logger?.('Info', 'AirtableDataSource - Initialized');
  }

  /**
   * Create collections from models
   */
  protected createCollections(models: AirtableModel[]): void {
    // Sort models by name for consistent ordering
    const sortedModels = [...models].sort((a, b) => a.name.localeCompare(b.name));

    for (const model of sortedModels) {
      const collection = new AirtableCollection(this, model, this.logger);
      this.addCollection(collection);
    }

    this.logger?.('Info', `AirtableDataSource - Created ${sortedModels.length} collections`);
  }

  /**
   * Get a base instance by ID
   */
  getBase(baseId: string): AirtableBase | undefined {
    return this.bases.get(baseId);
  }
}
