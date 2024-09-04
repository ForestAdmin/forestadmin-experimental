import { Client, estypes } from '@elastic/elasticsearch';

import ELASTICSEARCH_URL from './connection-details';

export async function createElasticsearchIndex(
  index: string,
  data?: object[],
  createBody?: estypes.IndicesCreateRequest,
) {
  const client = new Client({ node: ELASTICSEARCH_URL });

  const exists = await client.indices.exists({ index });

  if (!exists) {
    await client.indices.create({
      index,
      body: createBody,
    });
  }

  if (data) {
    const operations = data.flatMap(doc => [{ index: { _index: index } }, doc]);

    return { client, items: (await client.bulk({ refresh: true, operations })).items };
  }

  return { client, items: [] };
}

export async function deleteElasticsearchIndex(index: string) {
  const client = new Client({ node: ELASTICSEARCH_URL });
  await client.indices.delete({ index });
}
