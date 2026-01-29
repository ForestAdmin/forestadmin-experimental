/**
 * Manual Schema Converter - Converts manual schema definitions to AirtableModels
 */

import Airtable from 'airtable';

import { AirtableLogger, ManualSchemaConfig } from '../types/config';
import AirtableModel from '../model-builder/model';

type AirtableBase = ReturnType<typeof Airtable.base>;

/**
 * Convert manual schema configuration to AirtableModels
 */
export async function convertManualSchemaToModels(
  apiKey: string,
  schema: ManualSchemaConfig,
  logger?: AirtableLogger,
  endpointUrl?: string,
): Promise<{ models: AirtableModel[]; bases: Map<string, AirtableBase> }> {
  // Configure Airtable SDK
  const config: { apiKey: string; endpointUrl?: string } = { apiKey };

  if (endpointUrl) {
    config.endpointUrl = endpointUrl;
  }

  Airtable.configure(config);

  const models: AirtableModel[] = [];
  const bases = new Map<string, AirtableBase>();

  for (const collection of schema.collections) {
    logger?.('Info', `Manual schema - Creating collection: ${collection.name}`);

    // Get or create base instance
    if (!bases.has(collection.baseId)) {
      bases.set(collection.baseId, Airtable.base(collection.baseId));
    }

    const base = bases.get(collection.baseId)!;

    // Convert field definitions
    const fields = collection.fields.map(f => ({
      id: f.name, // Use name as ID for manual schema
      name: f.name,
      type: f.type,
      options: f.options,
    }));

    const model = new AirtableModel(
      collection.name,
      base,
      collection.baseId,
      collection.tableId,
      fields,
      collection.enableCount !== false,
    );

    models.push(model);
  }

  logger?.('Info', `Manual schema - Created ${models.length} collections`);

  return { models, bases };
}
