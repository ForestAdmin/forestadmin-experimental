import { UnprocessableError } from '@forestadmin/datasource-toolkit';

export default function errorHandler(error: Error & { code: number }): never {
  switch (error.code) {
    case 429: {
      throw new UnprocessableError(
        'You have reached the limit of allowed requests. ' +
        'If this message continues to appear, please consider adding ' +
        'or increasing your pull delta/dump scheduling.',
      );
    }
    case 429 | 505: {
      throw new UnprocessableError('The request to hubspot has timeout.');
    }
    default: {
      throw new UnprocessableError(error.message);
    }
  }
}