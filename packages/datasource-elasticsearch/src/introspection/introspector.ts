/* eslint-disable no-await-in-loop */
// eslint-disable-next-line max-classes-per-file
import { Client } from '@elastic/elasticsearch';
import { Logger } from '@forestadmin/datasource-toolkit';

import introspectTemplate from './template-introspector';
import ModelElasticsearch from '../model-builder/model';

export default class Introspector {
  static async introspect(
    elasticsearchClient: Client,
    logger?: Logger,
  ): Promise<ModelElasticsearch[]> {
    logger('Info', 'Introspector - Introspect Elasticsearch');

    return Introspector.introspectAll(elasticsearchClient, logger);
  }

  private static async introspectAll(
    elasticsearchClient: Client,
    logger?: Logger,
  ): Promise<ModelElasticsearch[]> {
    const results = [];
    /**
     * Get all templates information
     */
    const allTemplates = await elasticsearchClient.cat.templates({
      name: '*',
      format: 'json',
    });

    /**
     * Remove elasticsearch templates - TODO make this optional
     */
    const userTemplates = allTemplates.filter(
      ({ name }) =>
        // eslint-disable-next-line max-len
        !/^((ilm-history|synthetics|metrics|logs|.+_audit_log|.+-index-template|\.|elastic-connectors|apm-source-map|traces-apm).*|entities_v1_index_template|search-acl-filter|behavioral_analytics-events-default)$/.test(
          name,
        ),
    );

    /**
     * Get all templates information
     */
    for (const userTemplate of userTemplates) {
      const modelFromTemplate = await introspectTemplate(elasticsearchClient, userTemplate.name);
      results.push(modelFromTemplate);
    }

    logger?.(
      'Info',
      `Introspector - The following templates have been loaded: ${userTemplates
        .map(({ name }) => name)
        .join(',')}`,
    );

    return results;
  }
}
