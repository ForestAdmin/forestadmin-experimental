import { Caller } from '@forestadmin/datasource-toolkit';
import { createHmac } from 'crypto';

export function getAuthoriztionHeaders(authSecret: string) {
  const timeStamp = new Date().toISOString();
  const token = createHmac('sha256', authSecret).update(timeStamp).digest('hex');

  return { X_SIGNATURE: token, X_TIMESTAMP: timeStamp };
}

export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase();
}

export function toPascalCase(str: string) {
  return str.toLowerCase().replace(/(^|_)([a-z])/g, (_, __, letter) => letter.toUpperCase());
}

export function cameliseKeys(obj: any) {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const newKey = toCamelCase(key);
    acc[newKey] = value;

    return acc;
  }, {});
}

export function keysToCamel(obj: any) {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToCamel(v));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const newKey = toCamelCase(key);
      acc[newKey] = keysToCamel(value);

      return acc;
    }, {});
  }

  return obj;
}

export function keysToSnake(obj: any) {
  if (Array.isArray(obj)) {
    return obj.map(v => keysToSnake(v));
  }

  if (obj !== null && typeof obj === 'object') {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      const newKey = toSnakeCase(key);
      acc[newKey] = keysToSnake(value);

      return acc;
    }, {});
  }

  return obj;
}

export function appendHeaders(req, authSecret: string, caller?: Caller) {
  req.set(getAuthoriztionHeaders(authSecret));

  req.set('Content-Type', 'application/json');

  if (caller) req.set('forest_caller', JSON.stringify(keysToSnake(caller)));
}
