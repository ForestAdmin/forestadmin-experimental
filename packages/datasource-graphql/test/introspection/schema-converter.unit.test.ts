import type { IntrospectedTable } from '../../src/types';
import type {
  ColumnSchema,
  ManyToOneSchema,
  OneToManySchema,
} from '@forestadmin/datasource-toolkit';

import buildFields from '../../src/introspection/schema-converter';

describe('SchemaConverter', () => {
  describe('buildFields', () => {
    it('should build fields from a simple table', () => {
      const table: IntrospectedTable = {
        name: 'users',
        graphqlName: 'users',
        columns: [
          {
            name: 'id',
            type: 'Uuid',
            graphqlType: 'uuid',
            nullable: false,
            isPrimaryKey: true,
            isArray: false,
          },
          {
            name: 'name',
            type: 'String',
            graphqlType: 'String',
            nullable: false,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'email',
            type: 'String',
            graphqlType: 'String',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
        ],
        primaryKey: ['id'],
        relationships: [],
      };

      const fields = buildFields(table);

      expect(Object.keys(fields)).toHaveLength(3);
    });

    it('should mark primary key columns correctly', () => {
      const table: IntrospectedTable = {
        name: 'users',
        graphqlName: 'users',
        columns: [
          {
            name: 'id',
            type: 'Uuid',
            graphqlType: 'uuid',
            nullable: false,
            isPrimaryKey: true,
            isArray: false,
          },
        ],
        primaryKey: ['id'],
        relationships: [],
      };

      const fields = buildFields(table);
      const idField = fields.id as ColumnSchema;

      expect(idField.type).toBe('Column');
      expect(idField.isPrimaryKey).toBe(true);
      expect(idField.isReadOnly).toBe(true);
    });

    it('should add validation for non-nullable fields', () => {
      const table: IntrospectedTable = {
        name: 'users',
        graphqlName: 'users',
        columns: [
          {
            name: 'name',
            type: 'String',
            graphqlType: 'String',
            nullable: false,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'bio',
            type: 'String',
            graphqlType: 'String',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
        ],
        primaryKey: [],
        relationships: [],
      };

      const fields = buildFields(table);
      const nameField = fields.name as ColumnSchema;
      const bioField = fields.bio as ColumnSchema;

      expect(nameField.validation).toEqual([{ operator: 'Present' }]);
      expect(bioField.validation).toEqual([]);
    });

    it('should convert column types correctly', () => {
      const table: IntrospectedTable = {
        name: 'test',
        graphqlName: 'test',
        columns: [
          {
            name: 'int_col',
            type: 'Number',
            graphqlType: 'Int',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'string_col',
            type: 'String',
            graphqlType: 'String',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'bool_col',
            type: 'Boolean',
            graphqlType: 'Boolean',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'uuid_col',
            type: 'Uuid',
            graphqlType: 'uuid',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'date_col',
            type: 'Date',
            graphqlType: 'timestamptz',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'json_col',
            type: 'Json',
            graphqlType: 'jsonb',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
        ],
        primaryKey: [],
        relationships: [],
      };

      const fields = buildFields(table);

      expect((fields.int_col as ColumnSchema).columnType).toBe('Number');
      expect((fields.string_col as ColumnSchema).columnType).toBe('String');
      expect((fields.bool_col as ColumnSchema).columnType).toBe('Boolean');
      expect((fields.uuid_col as ColumnSchema).columnType).toBe('Uuid');
      expect((fields.date_col as ColumnSchema).columnType).toBe('Date');
      expect((fields.json_col as ColumnSchema).columnType).toBe('Json');
    });

    it('should set operators based on column type', () => {
      const table: IntrospectedTable = {
        name: 'test',
        graphqlName: 'test',
        columns: [
          {
            name: 'number_col',
            type: 'Number',
            graphqlType: 'Int',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
          {
            name: 'string_col',
            type: 'String',
            graphqlType: 'String',
            nullable: true,
            isPrimaryKey: false,
            isArray: false,
          },
        ],
        primaryKey: [],
        relationships: [],
      };

      const fields = buildFields(table);
      const numberField = fields.number_col as ColumnSchema;
      const stringField = fields.string_col as ColumnSchema;

      expect(numberField.filterOperators.has('LessThan')).toBe(true);
      expect(numberField.filterOperators.has('GreaterThan')).toBe(true);
      expect(stringField.filterOperators.has('Contains')).toBe(true);
      expect(stringField.filterOperators.has('StartsWith')).toBe(true);
    });

    it('should convert ManyToOne relationships', () => {
      const table: IntrospectedTable = {
        name: 'posts',
        graphqlName: 'posts',
        columns: [
          {
            name: 'id',
            type: 'Uuid',
            graphqlType: 'uuid',
            nullable: false,
            isPrimaryKey: true,
            isArray: false,
          },
        ],
        primaryKey: ['id'],
        relationships: [
          { name: 'author', type: 'object', remoteTable: 'users', mapping: { author_id: 'id' } },
        ],
      };

      const fields = buildFields(table);
      const authorField = fields.author as ManyToOneSchema;

      expect(authorField.type).toBe('ManyToOne');
      expect(authorField.foreignCollection).toBe('users');
      expect(authorField.foreignKey).toBe('author_id');
      expect(authorField.foreignKeyTarget).toBe('id');
    });

    it('should convert OneToMany relationships', () => {
      const table: IntrospectedTable = {
        name: 'users',
        graphqlName: 'users',
        columns: [
          {
            name: 'id',
            type: 'Uuid',
            graphqlType: 'uuid',
            nullable: false,
            isPrimaryKey: true,
            isArray: false,
          },
        ],
        primaryKey: ['id'],
        relationships: [
          { name: 'posts', type: 'array', remoteTable: 'posts', mapping: { id: 'user_id' } },
        ],
      };

      const fields = buildFields(table);
      const postsField = fields.posts as OneToManySchema;

      expect(postsField.type).toBe('OneToMany');
      expect(postsField.foreignCollection).toBe('posts');
      // originKey = FK in foreign collection, originKeyTarget = PK in this collection
      expect(postsField.originKey).toBe('user_id');
      expect(postsField.originKeyTarget).toBe('id');
    });

    it('should handle array columns', () => {
      const table: IntrospectedTable = {
        name: 'test',
        graphqlName: 'test',
        columns: [
          {
            name: 'tags',
            type: 'String',
            graphqlType: '_text',
            nullable: true,
            isPrimaryKey: false,
            isArray: true,
          },
        ],
        primaryKey: [],
        relationships: [],
      };

      const fields = buildFields(table);
      const tagsField = fields.tags as ColumnSchema;

      expect(tagsField.columnType).toEqual(['String']);
      expect(tagsField.isSortable).toBe(false);
    });
  });
});
