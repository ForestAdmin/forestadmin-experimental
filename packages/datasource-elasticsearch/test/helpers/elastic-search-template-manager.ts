import { Client, estypes } from '@elastic/elasticsearch';

import ELASTICSEARCH_URL from './connection-details';

type Data = Record<string, unknown> & { index: string };

export async function createElasticsearchTemplate(
  template: string,
  config: { indexPattern: string; mapping: estypes.MappingTypeMapping; alias: string },
  data?: Data[],
) {
  const client = new Client({ node: ELASTICSEARCH_URL });

  await client.indices.putTemplate({
    name: template,
    index_patterns: [config.indexPattern],
    mappings: config.mapping,
    aliases: {
      [config.alias]: {},
    },
  });

  if (data) {
    const operations = data.flatMap(({ index, ...doc }) => [{ index: { _index: index } }, doc]);

    return { client, items: (await client.bulk({ refresh: true, operations })).items };
  }

  return { client, items: [] };
}

export async function deleteElasticsearchTemplate(template: string, indexPattern: string) {
  const client = new Client({ node: ELASTICSEARCH_URL });

  // Delete Template
  await client.indices.deleteTemplate({
    name: template,
  });

  // Delete Indices
  const indicesResponse = await client.cat.indices({
    index: indexPattern,
    format: 'json',
  });

  const indicesToDelete = indicesResponse.map(indices => indices.index).filter(Boolean) as string[];

  await Promise.all(indicesToDelete.map(name => client.indices.delete({ index: name })));
}
