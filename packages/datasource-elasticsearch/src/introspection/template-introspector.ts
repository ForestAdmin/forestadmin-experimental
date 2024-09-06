import { Client } from '@elastic/elasticsearch';

import { OverrideTypeConverter } from './builder';
import ModelElasticsearch from '../model-builder/model';

/**
 * Handle both type of template: Legacy Template and new Index Template
 */
export default async function introspectTemplate(
  elasticsearchClient: Client,
  templateName: string,
  overrideName?: string,
  generateIndexName?: (record?: unknown) => string,
  overrideTypeConverter?: OverrideTypeConverter,
) {
  const isIndexTemplate = await elasticsearchClient.indices.existsIndexTemplate({
    name: templateName,
  });

  if (isIndexTemplate) {
    const [indexTemplate] = (
      await elasticsearchClient.indices.getIndexTemplate({
        name: templateName,
      })
    ).index_templates;

    const {
      name,
      index_template: {
        index_patterns: indexPatterns,
        template: { mappings, aliases },
      },
    } = indexTemplate;

    return new ModelElasticsearch(
      elasticsearchClient,
      overrideName || name,
      Array.isArray(indexPatterns) ? indexPatterns : [indexPatterns],
      Object.keys(aliases),
      mappings,
      generateIndexName,
      overrideTypeConverter,
    );
  }

  const template = await elasticsearchClient.indices.getTemplate({
    name: templateName,
  });
  const name = Object.keys(template)[0];
  const templateInformation = template[name];

  const { mappings, aliases, index_patterns: indexPatterns } = templateInformation;

  return new ModelElasticsearch(
    elasticsearchClient,
    overrideName || name,
    indexPatterns,
    Object.keys(aliases),
    mappings,
    generateIndexName,
    overrideTypeConverter,
  );
}
