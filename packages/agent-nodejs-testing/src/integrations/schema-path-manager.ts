import { tmpdir } from 'os';
import path from 'path';

const RESERVED_SCHEMA_PREFIX = 'reserved-forestadmin-schema-test-';
export default class SchemaPathManager {
  static generateSchemaPath(port: number): string {
    return path.join(tmpdir(), `${RESERVED_SCHEMA_PREFIX}-${port}.json`);
  }

  static isTemporarySchemaPath(schemaPath: string): boolean {
    return schemaPath.includes(RESERVED_SCHEMA_PREFIX);
  }
}
