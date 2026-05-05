import { Logger } from '@forestadmin/datasource-toolkit';

import { getIntrospection } from './introspector';

let POLLER: Poller;

/** polling interval in second */
const DEFAULT_POLLING_INTERVAL = 600;
const MIN_POLLING_INTERVAL = 1;
const MAX_POLLING_INTERVAL = 3600;

export default class Poller {
  private readonly logger: Logger;
  private readonly onChange: () => Promise<void>;

  private readonly pollingMap: Map<string, string>;

  static getInstance(logger: Logger, onChange: Poller['onChange']) {
    if (!POLLER) POLLER = new Poller(logger, onChange);

    return POLLER;
  }

  constructor(logger: Logger, onChange: Poller['onChange']) {
    this.logger = logger;
    this.onChange = onChange;

    this.pollingMap = new Map();
  }

  startPolling(uri: string, authSecret: string, startingEtag: string, pollingInterval?: number) {
    if (this.pollingMap.has(uri)) return;

    const interval = Math.min(
      Math.max(pollingInterval ?? DEFAULT_POLLING_INTERVAL, MIN_POLLING_INTERVAL),
      MAX_POLLING_INTERVAL,
    );

    this.logger(
      'Debug',
      `Starting polling every ${interval} seconds for Rpc agent schema changes on ${uri}.`,
    );

    this.pollingMap.set(uri, startingEtag);

    setInterval(async () => {
      try {
        const etag = this.pollingMap.get(uri);
        const intro = await getIntrospection(this.logger, uri, authSecret, etag);

        if (etag !== intro?.etag) {
          this.logger('Info', `Schema change detected on Rpc agent ${uri}. Restarting agent.`);

          await this.onChange();
          this.pollingMap.set(uri, intro.etag);
        }
      } catch (error: any) {
        if (error.status === 304) {
          this.logger('Debug', `No schema change detected on Rpc agent ${uri}.`);
        } else if (!error.status) {
          this.logger(
            'Error',
            `Error while polling Rpc agent ${uri} for schema changes: Unreachable.`,
          );
        } else {
          this.logger(
            'Error',
            `Error while polling Rpc agent ${uri} for schema changes: ${error.message}.`,
          );
        }
      }
    }, interval * 1000);
  }
}
