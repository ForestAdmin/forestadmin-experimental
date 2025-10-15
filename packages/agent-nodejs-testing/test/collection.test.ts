import type HttpRequester from '../src/remote-agent-client/http-requester';
import type { SelectOptions } from '../src/remote-agent-client/types';

import Collection from '../src/remote-agent-client/domains/collection';
import QuerySerializer from '../src/remote-agent-client/query-serializer';

describe('Collection.exportCsv', () => {
  it('should request the CSV export with serialized options', async () => {
    const queryMock = jest.fn().mockResolvedValue('id,name\n1,Alice');
    const httpRequester = { query: queryMock } as unknown as HttpRequester;
    const collection = new Collection('restaurants', httpRequester, {});

    const options: SelectOptions = { search: 'alice' };

    const content = await collection.exportCsv(options);

    expect(queryMock).toHaveBeenCalledWith({
      method: 'get',
      path: '/forest/restaurants.csv',
      query: QuerySerializer.serialize(options, 'restaurants'),
    });
    expect(content).toBe('id,name\n1,Alice');
  });
});
