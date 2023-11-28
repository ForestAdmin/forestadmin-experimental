import type { AgentOptions } from '@forestadmin/agent';

import { Deserializer } from 'jsonapi-serializer';
import jsonwebtoken from 'jsonwebtoken';
import superagent from 'superagent';

export class HttpRequester {
  private readonly deserializer: Deserializer;

  private get baseUrl() {
    const prefix = this.agentOptions.prefix ? `/${this.agentOptions.prefix}` : '';

    return `http://localhost:${this.port}${prefix}`;
  }

  constructor(
    private readonly token: string,
    private readonly port: number,
    private readonly agentOptions: AgentOptions,
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
      throw new Error(
        JSON.stringify(
          { error: (error as { response: { error: Record<string, string> } }).response.error, body },
          null,
          4,
        ),
      );
    }
  }
}

export async function createHttpRequester({
                                            agentOptions,
                                            port,
                                          }: {
  agentOptions: AgentOptions;
  port: number;
}): Promise<HttpRequester> {
  const token = jsonwebtoken.sign(
    // getUserInfo is mocked
    await agentOptions.forestAdminClient.authService.getUserInfo(0, ''),
    agentOptions.authSecret,
    { expiresIn: '1 hours' },
  );

  return new HttpRequester(token, port, agentOptions);
}
