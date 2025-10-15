import superagent from 'superagent';

import HttpRequester from '../src/remote-agent-client/http-requester';

jest.mock('superagent', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

jest.mock('jsonapi-serializer', () => ({
  Deserializer: jest.fn().mockImplementation(() => ({
    deserialize: jest.fn(() => {
      throw new Error('Not JSON');
    }),
  })),
}));

describe('HttpRequester', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns raw text when response is not JSON', async () => {
    const send = jest.fn().mockResolvedValue({ text: 'id,name\n1,Alice' });
    const request = {
      timeout: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      query: jest.fn().mockReturnThis(),
      send,
    };

    const superagentGet = superagent.get as unknown as jest.Mock;
    superagentGet.mockReturnValue(request);

    const requester = new HttpRequester('token', { url: 'http://localhost' });

    const csv = await requester.query<string>({
      method: 'get',
      path: '/forest/restaurants.csv',
    });

    expect(superagent.get).toHaveBeenCalledWith('http://localhost/forest/restaurants.csv');
    expect(request.timeout).toHaveBeenCalledWith(10000);
    expect(request.set).toHaveBeenCalledWith('Authorization', 'Bearer token');
    expect(request.query).toHaveBeenCalledWith({ timezone: 'Europe/Paris' });
    expect(send).toHaveBeenCalledWith(undefined);
    expect(csv).toBe('id,name\n1,Alice');
  });
});
