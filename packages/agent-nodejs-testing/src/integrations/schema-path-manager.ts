import { tmpdir } from 'os';
import path from 'path';

const RESERVED_SCHEMA_PREFIX = 'reserved-forestadmin-schema-test-';
export default class SchemaPathManager {
  static generateSchemaPath(): string {
    const random = Math.floor(Math.random() * 1000000);

    return path.join(tmpdir(), `${RESERVED_SCHEMA_PREFIX}-${random}.json`);
  }

  static isTemporarySchemaPath(schemaPath: string): boolean {
    return schemaPath.includes(RESERVED_SCHEMA_PREFIX);
  }
}
