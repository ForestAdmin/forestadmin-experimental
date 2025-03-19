import { Caller } from '@forestadmin/datasource-toolkit';
import { createHmac } from 'crypto';

// eslint-disable-next-line import/prefer-default-export
export function appendHeaders(req, authSecret: string, caller?: Caller) {
  const timeStamp = new Date().toUTCString();
  const token = createHmac('sha256', authSecret).update(timeStamp).digest('hex');
  req.set('X_SIGNATURE', token);
  req.set('X_TIMESTAMP', timeStamp);

  req.set('Content-Type', 'application/json');

  if (caller) req.set('forest_caller', JSON.stringify(caller));
}
