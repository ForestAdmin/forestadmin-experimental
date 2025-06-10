import { ActionEndpointsByCollection } from './domains/action';
import RemoteAgentClient from './domains/remote-agent-client';
import HttpRequester from './http-requester';

// eslint-disable-next-line import/prefer-default-export
export function createRemoteAgentClient(params: {
  actionEndpoints?: ActionEndpointsByCollection;
  token?: string;
  url: string;
}) {
  const httpRequester = new HttpRequester(params.token, { url: params.url });

  return new RemoteAgentClient({ actionEndpoints: params.actionEndpoints, httpRequester });
}
