import { Client } from '@elastic/elasticsearch';
import { RequestBody } from '@elastic/elasticsearch/lib/Transport';

import ELASTICSEARCH_URL from './connection-details';

export async function createElasticsearchIndex(
  index: string,
  data?: object[],
  createBody?: RequestBody,
) {
  const client = new Client({ node: ELASTICSEARCH_URL });

  const exists = await client.indices.exists({ index });

  if (!exists.body) {
    await client.indices.create({
      index,
      body: createBody,
    });
  }

  if (data) {
    const body = data.flatMap(doc => [{ index: { _index: index } }, doc]);

    return { client, items: (await client.bulk({ refresh: true, body })).body.items };
  }

  return { client, items: [] };
}

export async function deleteElasticsearchIndex(index: string) {
  const client = new Client({ node: ELASTICSEARCH_URL });
  await client.indices.delete({ index });
}
