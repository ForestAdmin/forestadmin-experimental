import { Caller } from '@forestadmin/datasource-toolkit';
import { createHmac } from 'crypto';

export function getAuthoriztionHeaders(authSecret: string) {
  const timeStamp = new Date().toUTCString();
  const token = createHmac('sha256', authSecret).update(timeStamp).digest('hex');

  return { X_SIGNATURE: token, X_TIMESTAMP: timeStamp };
}

export function appendHeaders(req, authSecret: string, caller?: Caller) {
  req.set(getAuthoriztionHeaders(authSecret));

  req.set('Content-Type', 'application/json');

  if (caller) req.set('forest_caller', JSON.stringify(caller));
}
