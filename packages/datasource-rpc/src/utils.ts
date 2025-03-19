import { createHmac } from 'crypto';

// eslint-disable-next-line import/prefer-default-export
export function setAuth(req, authSecret: string) {
  const timeStamp = new Date().toUTCString();
  const token = createHmac('sha256', authSecret).update(timeStamp).digest('hex');
  req.set('X_SIGNATURE', token);
  req.set('X_TIMESTAMP', timeStamp);
}
