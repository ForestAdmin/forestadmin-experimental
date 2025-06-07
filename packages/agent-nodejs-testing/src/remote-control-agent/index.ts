import { ActionEndpointsByCollection } from './domains/action';
import RemoteControlAgent from './domains/remote-controle-agent';
import HttpRequester from './http-requester';

// eslint-disable-next-line import/prefer-default-export
export function createRemoteControlAgent(params: {
  actionEndpoints?: ActionEndpointsByCollection;
  httpRequester: HttpRequester;
}) {
  return new RemoteControlAgent({
    actionEndpoints: params.actionEndpoints,
    httpRequester: params.httpRequester,
  });
}
