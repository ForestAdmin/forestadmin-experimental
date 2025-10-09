import { Deserializer } from 'jsonapi-serializer';
import superagent from 'superagent';

export default class HttpRequester {
  private readonly deserializer: Deserializer;

  private get baseUrl() {
    const prefix = this.options.prefix ? `/${this.options.prefix}` : '';

    return `${this.options.url}${prefix}`;
  }

  constructor(
    private readonly token: string,
    private readonly options: { prefix?: string; url: string },
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

  static escapeUrlSlug(name: string): string {
    return encodeURI(name).replace(/([+?*])/g, '\\$1');
  }
}
