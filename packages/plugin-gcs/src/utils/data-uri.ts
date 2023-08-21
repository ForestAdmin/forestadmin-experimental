import { File } from '../types';

export function parseDataUri(dataUri: string): File {
  if (!dataUri) return null;

  const [header, data] = dataUri.substring(5).split(',');
  const [mimeType, ...mediaTypes] = header.split(';');
  const result = { mimeType, buffer: Buffer.from(data, 'base64') };

  for (const mediaType of mediaTypes) {
    const index = mediaType.indexOf('=');
    if (index !== -1)
      result[mediaType.substring(0, index)] = decodeURIComponent(mediaType.substring(index + 1));
  }

  return result as unknown as File;
}
