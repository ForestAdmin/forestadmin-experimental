import { ActionEndpointsByCollection } from './domains/action';
import RemoteAgentClient from './domains/remote-agent-client';
import HttpRequester from './http-requester';

// eslint-disable-next-line import/prefer-default-export
export function createRemoteAgentClient(params: {
  actionEndpoints?: ActionEndpointsByCollection;
  httpRequester: HttpRequester;
}) {
  return new RemoteAgentClient({
    actionEndpoints: params.actionEndpoints,
    httpRequester: params.httpRequester,
  });
}
