import { createHmac } from 'crypto';

export function setAuth(req, authSecret: string) {
  const timeStamp = new Date().toUTCString();
  const token = createHmac('sha256', authSecret).update(timeStamp).digest('hex');
  req.set('HTTP_X_SIGNATURE', token);
  req.set('HTTP_X_TIMESTAMP', timeStamp);
}
