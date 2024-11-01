import { Deserializer } from 'jsonapi-serializer';
import jsonwebtoken from 'jsonwebtoken';
import superagent from 'superagent';

import { CURRENT_USER } from './forest-admin-client-mock';

export class HttpRequester {
  private readonly deserializer: Deserializer;

  private get baseUrl() {
    const prefix = this.options.prefix ? `/${this.options.prefix}` : '';

    return `http://localhost:${this.options.port}${prefix}`;
  }

  constructor(
    private readonly token: string,
    private readonly options: { prefix?: string; port: number },
  ) {
    this.deserializer = new Deserializer({ keyForAttribute: 'camelCase' });
  }

  async query<Data = unknown>({
    method,
    path,
    body,
    query,
    maxTimeAllowed,
  }: {
    method: 'get' | 'post' | 'put' | 'delete';
    path: string;
    body?: Record<string, unknown>;
    query?: Record<string, unknown>;
    maxTimeAllowed?: number; // Set a default value if not provided
  }): Promise<Data> {
    try {
      const url = new URL(`${this.baseUrl}${path}`).toString();

      const response = await superagent[method](url)
        .timeout(maxTimeAllowed ?? 10000)
        .set('Authorization', `Bearer ${this.token}`)
        .query({ timezone: 'Europe/Paris', ...query })
        .send(body);

      try {
        return (await this.deserializer.deserialize(response.body)) as Data;
      } catch (e) {
        // when it fails, it means the response is not a JSON API response.
        // It's the case for example when we execute an action.
        return response.body as Data;
      }
    } catch (error) {
      if (!error.response) throw error;

      throw new Error(
        JSON.stringify(
          {
            error: (error as { response: { error: Record<string, string> } }).response.error,
            body,
          },
          null,
          4,
        ),
      );
    }
  }
}

export function createHttpRequester(options: {
  prefix?: string;
  port: number;
  authSecret: string;
}): HttpRequester {
  const token = jsonwebtoken.sign(CURRENT_USER, options.authSecret, { expiresIn: '1 hours' });

  return new HttpRequester(token, options);
}
