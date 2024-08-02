import { Client } from '@hubspot/api-client';

export default class HubspotClient {
  static #instance: Client;

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor() {
  }

  /**
   * The static getter that controls access to the singleton instance.
   *
   * This implementation allows you to extend the Singleton class while
   * keeping just one instance of each subclass around.
   */
  public static init(accessToken: string): Client {
    HubspotClient.#instance = new Client({accessToken: accessToken});

    return HubspotClient.#instance;
  }

  public static get instance(): Client {
    if (!HubspotClient.#instance) {
      throw new Error('Hubspot client has not been initialized, you need to call init first')
    }

    return HubspotClient.#instance;
  }
}