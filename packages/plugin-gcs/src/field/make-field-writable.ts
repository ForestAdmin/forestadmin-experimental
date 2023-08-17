import type { CollectionCustomizer } from '@forestadmin/datasource-customizer';
import type { ColumnSchema, RecordData } from '@forestadmin/datasource-toolkit';

import { Configuration, File } from '../types';
import { parseDataUri } from '../utils/data-uri';

function shouldSkipFile(file: string) {
  return file.startsWith('https://');
}

async function computeFile(file: string, recordId, context, config: Configuration): Promise<File> {
  const fileParsed = parseDataUri(file);
  fileParsed.name = await config.storeAt(recordId, fileParsed.name, context);
  return fileParsed;
}

function getPks(collection: CollectionCustomizer): string[] {
  return Object.entries(collection.schema.fields)
    .filter(([, schema]) => schema.type === 'Column' && schema.isPrimaryKey)
    .map(([name]) => name);
}

function computeProjection(collection: CollectionCustomizer, config: Configuration): string[] {
  return [
    // @ts-ignore
    ...new Set([
      config.sourcename, // storage field
      ...getPks(collection), // pk
      ...(config.objectKeyFromRecord?.extraDependencies ?? []), // extra deps
    ]),
  ];
}

export default function makeFieldWritable(
  collection: CollectionCustomizer,
  config: Configuration,
): void {
  const schema = collection.schema.fields[config.sourcename] as ColumnSchema;
  if (schema.isReadOnly) return;

  collection.replaceFieldWriting(config.filename, async (value: string | [string], context) => {
    const patch = {};

    if (!value) {
      return patch;
    }

    let record: RecordData = null;
    let recordId: string = null;

    if (context.action === 'update') {
      // On updates, we fetch the missing information from the database.
      const pks = getPks(collection);
      const projection = computeProjection(collection, config);
      const records = await context.collection.list(context.filter || {}, projection);

      // context.record is the patch coming from the frontend.
      record = { ...(records?.[0] ?? {}), ...context.record };
      recordId = pks.map(pk => record[pk]).join('|');
    } else {
      // context.record is the record coming from the frontend.
      record = { ...context.record };
    }

    const filesToUpload: { index: number, file: File }[] = [];

    if (schema.columnType === 'String') {
      const stringValue = value as string;

      if (shouldSkipFile(stringValue)) {
        return patch;
      } else {
        const file = await computeFile(stringValue, recordId, context, config)
        patch[config.sourcename] = file.name;
        filesToUpload.push({ index: 0, file });
      }
    } else {
      const arrayValue = value as string[];

      for (const [index, file] of (value as unknown as string[]).entries()) {
        if (shouldSkipFile(file)) continue;
        const fileParsed = await computeFile(file, recordId, context, config);
        filesToUpload.push({ index, file: fileParsed });
        arrayValue[index] = fileParsed.name;
      }

      patch[config.sourcename] = arrayValue;
    }

    let resultMappedKeys: string | string[];
    if (config.objectKeyFromRecord?.mappingFunction) {
      resultMappedKeys = await config.objectKeyFromRecord.mappingFunction({ ...record, ...patch }, context);
    } else {
      resultMappedKeys = value;
    }

    let mappedKeys: string[];

    if (schema.columnType === 'String') {
      mappedKeys = [resultMappedKeys as string];
    } else {
      mappedKeys = resultMappedKeys as string[];
    }

    for (const fileToUpload of filesToUpload) {
      await config.client.save(mappedKeys[fileToUpload.index], fileToUpload.file);
    }

    return patch;
  });
}
