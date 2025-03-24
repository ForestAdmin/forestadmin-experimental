import BaseRoute from '@forestadmin/agent/dist/routes/base-route';
import { ForestAdminHttpDriverServices } from '@forestadmin/agent/dist/services';
import { AgentOptionsWithDefaults, RouteType } from '@forestadmin/agent/dist/types';
import { Collection, DataSource } from '@forestadmin/datasource-toolkit';
import Router from '@koa/router';

export default class RpcOpenApiRoute extends BaseRoute {
  type = RouteType.PublicRoute;

  protected readonly dataSource: DataSource;

  constructor(
    services: ForestAdminHttpDriverServices,
    options: AgentOptionsWithDefaults,
    dataSource: DataSource,
  ) {
    super(services, options);

    this.dataSource = dataSource;
  }

  override setupRoutes(router: Router): void {
    // Register both paths to be safe: with and without /forest prefix
    const routeHandler = async (ctx, next) => {
      try {
        // Parse query parameters, look for both "exclude" and common misspellings
        const { exclude } = ctx.request.query;
        console.log('Request URL:', ctx.request.url);
        console.log('Raw query string:', ctx.request.querystring);
        console.log('Parsed exclude parameter:', exclude);

        // Add exclude parameter to the context explicitly
        ctx.state.exclude = exclude;

        await this.handleOpenApi(ctx);
      } catch (error) {
        console.error('Error handling OpenAPI request:', error);
        ctx.status = 500;
        ctx.body = { error: 'Internal server error generating OpenAPI schema' };
      }
    };

    // Register both with and without the /forest prefix
    router.get('/openapi.json', routeHandler);
    router.get('/forest/openapi.json', routeHandler);
  }

  private generateSchemaForCollection(collection: Collection) {
    const properties = {};
    const requiredFields = [];

    Object.entries(collection.schema.fields).forEach(([fieldName, fieldSchema]) => {
      let type = 'string';
      let format;

      if (fieldSchema.type === 'Column') {
        // Map column types to OpenAPI types
        switch (fieldSchema.columnType) {
          case 'Number':
            type = 'number';
            break;
          case 'Boolean':
            type = 'boolean';
            break;
          case 'Date':
            type = 'string';
            format = 'date-time';
            break;
          case 'Uuid':
            type = 'string';
            format = 'uuid';
            break;
          case 'Json':
            type = 'object';
            break;
          case 'String':
          default:
            type = 'string';
        }

        if (fieldSchema.isPrimaryKey) {
          requiredFields.push(fieldName);
        }
      } else if (fieldSchema.type === 'ManyToOne' || fieldSchema.type === 'OneToOne') {
        type = 'object';
        properties[`${fieldName}Id`] = { type: 'string' };
      } else if (fieldSchema.type === 'OneToMany' || fieldSchema.type === 'ManyToMany') {
        // Handle relation arrays separately to avoid continue statement
        properties[fieldName] = {
          type: 'array',
          items: { type: 'string' },
        };

        // Skip the remainder of this iteration
        return;
      }

      const property: Record<string, any> = { type };

      if (format) {
        property.format = format;
      }

      if (fieldSchema.type === 'Column' && fieldSchema.enumValues) {
        property.enum = fieldSchema.enumValues;
      }

      properties[fieldName] = property;
    });

    return {
      type: 'object',
      properties,
      required: requiredFields,
    };
  }

  private getFilterSchemaForCollection(collection: Collection) {
    // Get operator examples based on collection fields
    const operatorExamples = [];
    const fieldExamples = [];

    Object.entries(collection.schema.fields).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.type === 'Column') {
        fieldExamples.push(fieldName);

        // Add appropriate operators based on field type
        if (fieldSchema.columnType === 'String') {
          operatorExamples.push(
            'Equal',
            'NotEqual',
            'Contains',
            'StartsWith',
            'EndsWith',
            'Present',
          );
        } else if (fieldSchema.columnType === 'Number') {
          operatorExamples.push('Equal', 'NotEqual', 'GreaterThan', 'LessThan', 'In', 'Present');
        } else if (fieldSchema.columnType === 'Boolean') {
          operatorExamples.push('Equal', 'NotEqual', 'Present');
        } else if (fieldSchema.columnType === 'Date') {
          operatorExamples.push(
            'Equal',
            'NotEqual',
            'GreaterThan',
            'LessThan',
            'Present',
            'Before',
            'After',
          );
        }
      }
    });

    return {
      operators: [...new Set(operatorExamples)],
      fields: fieldExamples,
    };
  }

  private generateListPaths(collections: Collection[]) {
    const paths = {};

    collections.forEach(collection => {
      const collectionName = collection.name;
      const schemaRef = `#/components/schemas/${collectionName}`;
      const { operators, fields } = this.getFilterSchemaForCollection(collection);

      paths[`/forest/mcp/rpc/${collectionName}/list`] = {
        post: {
          summary: `List ${collectionName}`,

          description: `Retrieve a list of ${collectionName} records with filtering, sorting, and pagination. Don't use it to retrieve more than 20 records to avoid ResponseTooLarge error.`,
          operationId: `list_${collectionName}`,
          requestBody: {
            description: `List request configuration with projection and filters`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['projection'],
                  properties: {
                    projection: {
                      type: 'array',
                      description: 'List of fields to include in the response (REQUIRED)',
                      items: {
                        type: 'string',
                      },
                      example: ['id', 'name', 'createdAt'],
                    },
                    filter: {
                      type: 'object',
                      description: 'Filter parameters for the query',
                      properties: {
                        conditionTree: {
                          description: 'Conditions for filtering records',
                          anyOf: [
                            { $ref: '#/components/schemas/LeafCondition' },
                            { $ref: '#/components/schemas/BranchCondition' },
                          ],
                        },
                        sort: {
                          type: 'array',
                          description: 'Sort specifications (applied in order)',
                          items: { $ref: '#/components/schemas/Sort' },
                        },
                        page: {
                          $ref: '#/components/schemas/Page',
                          description: 'Pagination parameters',
                        },
                      },
                    },
                  },
                },
                examples: {
                  projectionOnly: {
                    summary: 'Basic projection only',
                    value: {
                      projection: fields.slice(0, 3) || ['id', 'name', 'createdAt'],
                    },
                  },
                  simpleFilter: {
                    summary: 'With simple filter',
                    value: {
                      projection: fields.slice(0, 3) || ['id', 'name', 'createdAt'],
                      filter: {
                        conditionTree: {
                          field: fields[0] || 'id',
                          operator: 'Equal',
                          value: '123',
                        },
                      },
                    },
                  },
                  complexFilter: {
                    summary: 'With complex filter and sorting',
                    value: {
                      projection: fields.slice(0, 3) || ['id', 'name', 'createdAt'],
                      filter: {
                        conditionTree: {
                          aggregator: 'and',
                          conditions: [
                            {
                              field: fields[0] || 'status',
                              operator: 'Equal',
                              value: 'active',
                            },
                            {
                              aggregator: 'or',
                              conditions: [
                                {
                                  field: fields[1] || 'price',
                                  operator: 'GreaterThan',
                                  value: 100,
                                },
                                {
                                  field: fields[1] || 'price',
                                  operator: 'LessThan',
                                  value: 10,
                                },
                              ],
                            },
                          ],
                        },
                        sort: [
                          { field: fields[0] || 'createdAt', ascending: false },
                          { field: fields[1] || 'id', ascending: true },
                        ],
                        page: { skip: 0, limit: 10 },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: `List of ${collectionName} records`,
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: schemaRef },
                  },
                },
              },
            },
            400: {
              description: 'Bad request - Invalid parameters',
            },
            401: {
              description: 'Unauthorized - Authentication required',
            },
            403: {
              description: 'Forbidden - Insufficient permissions',
            },
          },
        },
      };
    });

    return paths;
  }

  private generateCreatePaths(collections: Collection[]) {
    const paths = {};

    collections.forEach(collection => {
      const collectionName = collection.name;
      const schemaRef = `#/components/schemas/${collectionName}`;
      const { fields } = this.getFilterSchemaForCollection(collection);

      // POST /rpc/{collection}/create
      paths[`/forest/mcp/rpc/${collectionName}/create`] = {
        post: {
          summary: `Create ${collectionName}`,
          description: `Create one or more ${collectionName} records`,
          operationId: `create_${collectionName}`,
          requestBody: {
            description: `${collectionName} record(s) to create`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: { $ref: schemaRef },
                      description:
                        'Records to create. Make sure the primary key is not sent, as it may cause issues.',
                    },
                  },
                  required: ['data'],
                },
                examples: {
                  singleRecord: {
                    summary: 'Create a single record',
                    value: {
                      data: [this.generateExampleRecordForCollection(collection)],
                    },
                  },
                  multipleRecords: {
                    summary: 'Create multiple records',
                    value: {
                      data: [
                        this.generateExampleRecordForCollection(collection),
                        this.generateExampleRecordForCollection(collection, true),
                      ],
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: `Created ${collectionName} record(s)`,
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: { $ref: schemaRef },
                  },
                },
              },
            },
            400: {
              description:
                'Bad request - Invalid data or validation error. Often occurs when caller is not valid JSON.',
              content: {
                'application/json': {
                  examples: {
                    invalidCaller: {
                      summary: 'Invalid caller parameter',
                      value: {
                        error: 'SyntaxError: Unexpected token \'u\', "user" is not valid JSON',
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized - Authentication required',
            },
            403: {
              description: 'Forbidden - Insufficient permissions',
            },
            422: {
              description: 'Unprocessable Entity - Validation error',
            },
          },
        },
      };
    });

    return paths;
  }

  private generateExampleRecordForCollection(collection: Collection, variant = false) {
    const example = {};
    let count = 0;

    Object.entries(collection.schema.fields).forEach(([fieldName, fieldSchema]) => {
      if (fieldSchema.type === 'Column') {
        // Skip primary keys and technical fields for example values
        if (
          fieldSchema.isPrimaryKey ||
          fieldName === 'id' ||
          fieldName.includes('Id') ||
          fieldName === 'createdAt' ||
          fieldName === 'updatedAt'
        ) {
          return;
        }

        // Simple example values based on field type
        switch (fieldSchema.columnType) {
          case 'String':
            if (fieldName.toLowerCase().includes('name')) {
              example[fieldName] = variant ? 'Example Name 2' : 'Example Name';
            } else if (fieldName.toLowerCase().includes('email')) {
              example[fieldName] = variant ? 'user2@example.com' : 'user@example.com';
            } else if (fieldName.toLowerCase().includes('phone')) {
              example[fieldName] = variant ? '+1-555-987-6543' : '+1-555-123-4567';
            } else if (fieldName.toLowerCase().includes('status')) {
              example[fieldName] = variant ? 'inactive' : 'active';
            } else {
              example[fieldName] = variant ? `Example text 2` : `Example text`;
            }

            break;
          case 'Number':
            if (
              fieldName.toLowerCase().includes('price') ||
              fieldName.toLowerCase().includes('amount')
            ) {
              example[fieldName] = variant ? 199.99 : 99.99;
            } else if (
              fieldName.toLowerCase().includes('count') ||
              fieldName.toLowerCase().includes('quantity')
            ) {
              example[fieldName] = variant ? 25 : 10;
            } else {
              example[fieldName] = variant ? 200 + count : 100 + count;
            }

            break;
          case 'Boolean':
            example[fieldName] = variant;
            break;
          case 'Date':
            example[fieldName] = variant
              ? new Date(Date.now() - 86400000).toISOString() // Yesterday
              : new Date().toISOString();
            break;
          case 'Json':
            example[fieldName] = variant
              ? { key1: 'value3', key2: 'value4' }
              : { key1: 'value1', key2: 'value2' };
            break;
          default:
            example[fieldName] = variant ? `Example 2` : `Example`;
        }

        count++;
      } else if (fieldSchema.type === 'ManyToOne' || fieldSchema.type === 'OneToOne') {
        // For relationships, add the ID reference
        example[`${fieldName}Id`] = variant ? '2' : '1';
      }
    });

    return example;
  }

  private generateComponents(collections: Collection[]) {
    const schemas: Record<string, any> = {};

    collections.forEach(collection => {
      schemas[collection.name] = this.generateSchemaForCollection(collection);
    });

    // Get all possible operators from all collections to build a comprehensive list
    const allOperators = new Set<string>();
    collections.forEach(collection => {
      const { operators } = this.getFilterSchemaForCollection(collection);
      operators.forEach(op => allOperators.add(op));
    });

    // Define leaf condition schema (without circular dependency)
    schemas.LeafCondition = {
      type: 'object',
      description: 'Leaf node - direct field condition',
      required: ['field', 'operator'],
      properties: {
        field: {
          type: 'string',
          description: 'Field name to filter on',
        },
        operator: {
          type: 'string',
          description: 'Operator to use for filtering (available operators depend on field type)',
          enum: Array.from(allOperators),
        },
        value: {
          description: 'Value to compare against (type depends on the field and operator)',
        },
      },
    };

    // Add examples for different field types
    schemas.StringCondition = {
      type: 'object',
      description: 'Condition for string fields',
      properties: {
        field: { type: 'string', example: 'name' },
        operator: {
          type: 'string',
          enum: ['Equal', 'NotEqual', 'Contains', 'StartsWith', 'EndsWith', 'Present'],
          example: 'Contains',
        },
        value: { type: 'string', example: 'John' },
      },
    };

    schemas.NumberCondition = {
      type: 'object',
      description: 'Condition for number fields',
      properties: {
        field: { type: 'string', example: 'price' },
        operator: {
          type: 'string',
          enum: ['Equal', 'NotEqual', 'GreaterThan', 'LessThan', 'In', 'Present'],
          example: 'GreaterThan',
        },
        value: { type: ['number', 'array'], example: 100 },
      },
    };

    schemas.BooleanCondition = {
      type: 'object',
      description: 'Condition for boolean fields',
      properties: {
        field: { type: 'string', example: 'isActive' },
        operator: {
          type: 'string',
          enum: ['Equal', 'NotEqual', 'Present'],
          example: 'Equal',
        },
        value: { type: 'boolean', example: true },
      },
    };

    schemas.DateCondition = {
      type: 'object',
      description: 'Condition for date fields',
      properties: {
        field: { type: 'string', example: 'createdAt' },
        operator: {
          type: 'string',
          enum: ['Equal', 'NotEqual', 'GreaterThan', 'LessThan', 'Present'],
          example: 'GreaterThan',
        },
        value: {
          type: ['string', 'array'],
          format: 'date-time',
          example: new Date().toISOString(),
        },
      },
    };

    // Branch condition with simple array items (no circular reference)
    schemas.BranchCondition = {
      type: 'object',
      description: 'Branch node - logical grouping of conditions',
      required: ['aggregator', 'conditions'],
      properties: {
        aggregator: {
          type: 'string',
          enum: ['and', 'or'],
          description: 'Logical operator to combine conditions',
        },
        conditions: {
          type: 'array',
          description: 'List of conditions to combine with the aggregator',
          items: {
            anyOf: [{ $ref: '#/components/schemas/LeafCondition' }],
          },
        },
      },
    };

    // Condition tree schema using anyOf to avoid circular reference
    schemas.ConditionTree = {
      description:
        'A condition tree for filtering records - can be either a leaf condition or branch condition',
      anyOf: [
        { $ref: '#/components/schemas/LeafCondition' },
        { $ref: '#/components/schemas/BranchCondition' },
      ],
    };

    // Add field type specific filter examples to the documentation
    schemas.FieldTypeOperators = {
      type: 'object',
      description: 'Available operators by field type',
      properties: {
        string: {
          type: 'array',
          items: { type: 'string' },
          example: ['Equal', 'NotEqual', 'Contains', 'StartsWith', 'EndsWith', 'Present'],
        },
        number: {
          type: 'array',
          items: { type: 'string' },
          example: ['Equal', 'NotEqual', 'GreaterThan', 'LessThan', 'In', 'Present'],
        },
        boolean: {
          type: 'array',
          items: { type: 'string' },
          example: ['Equal', 'NotEqual', 'Present'],
        },
        date: {
          type: 'array',
          items: { type: 'string' },
          example: ['Equal', 'NotEqual', 'GreaterThan', 'LessThan', 'Present'],
        },
      },
    };

    schemas.Sort = {
      type: 'object',
      description: 'Sort specification for a single field',
      required: ['field'],
      properties: {
        field: { type: 'string', description: 'Field to sort by' },
        ascending: {
          type: 'boolean',
          default: true,
          description: 'Sort direction (true for ascending, false for descending)',
        },
      },
    };

    schemas.Page = {
      type: 'object',
      description: 'Pagination parameters',
      properties: {
        skip: {
          type: 'integer',
          default: 0,
          description: 'Number of records to skip',
        },
        limit: {
          type: 'integer',
          default: 15,
          description: 'Maximum number of records to return',
        },
      },
    };

    schemas.PaginatedFilter = {
      type: 'object',
      description: 'Complete filter object with conditions, sorting and pagination',
      properties: {
        conditionTree: {
          description: 'Conditions for filtering records',
          anyOf: [
            { $ref: '#/components/schemas/LeafCondition' },
            { $ref: '#/components/schemas/BranchCondition' },
          ],
        },
        sort: {
          type: 'array',
          description: 'Sort specifications (applied in order)',
          items: { $ref: '#/components/schemas/Sort' },
        },
        page: {
          $ref: '#/components/schemas/Page',
          description: 'Pagination parameters',
        },
      },
    };

    return {
      schemas,
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x_api_key',
          description: 'API key needed to authenticate requests.',
        },
      },
    };
  }

  private generateSchemaPath() {
    const paths = {};

    paths['/forest/mcp/rpc-schema'] = {
      get: {
        summary: 'Schema Information',
        description: 'Returns schema information about collections, charts, and RPC relations',
        operationId: 'get_rpc_schema',
        responses: {
          200: {
            description: 'Schema information in JSON format',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    collections: {
                      type: 'array',
                      description: 'List of collections with their schema information',
                      items: {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string',
                            description: 'Collection name',
                          },
                          fields: {
                            type: 'object',
                            description: 'Fields in the collection with their schema',
                            additionalProperties: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  description: 'Field type (Column, ManyToOne, etc.)',
                                },
                                columnType: {
                                  type: 'string',
                                  description: 'Column type for Column fields',
                                },
                                filterOperators: {
                                  type: 'array',
                                  description: 'Available filter operators for this field',
                                  items: {
                                    type: 'string',
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                    charts: {
                      type: 'object',
                      description: 'Chart definitions',
                    },
                    rpcRelations: {
                      type: 'object',
                      description: 'RPC relation information',
                    },
                  },
                },
                examples: {
                  response: {
                    summary: 'Example schema response',
                    value: {
                      collections: [
                        {
                          name: 'users',
                          fields: {
                            id: {
                              type: 'Column',
                              columnType: 'Number',
                              isPrimaryKey: true,
                              filterOperators: ['Equal', 'NotEqual', 'Present'],
                            },
                            email: {
                              type: 'Column',
                              columnType: 'String',
                              filterOperators: ['Equal', 'NotEqual', 'Contains'],
                            },
                          },
                        },
                      ],
                      charts: {},
                      rpcRelations: {},
                    },
                  },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized - Authentication required',
          },
          403: {
            description: 'Forbidden - Insufficient permissions',
          },
        },
      },
    };

    return paths;
  }

  async makeOpenApi(collections, exclude, origin) {
    // Get the exclude parameter from state
    const excludeParam = exclude;
    console.log('Processing exclude parameter in handler:', excludeParam);

    // Process excluded collections if parameter is provided
    let filteredCollections = [...collections]; // Create a copy of the array

    if (excludeParam) {
      const excludedCollections = excludeParam.split(',').map(name => name.trim());
      console.log('Collections to exclude:', excludedCollections);
      console.log('All available collections:', collections.map(c => c.name).join(', '));

      // Filter out excluded collections
      filteredCollections = collections.filter(collection => {
        const shouldExclude = excludedCollections.includes(collection.name);
        console.log(`Collection ${collection.name}: ${shouldExclude ? 'EXCLUDED' : 'INCLUDED'}`);

        return !shouldExclude;
      });

      console.log(
        `Filtered from ${collections.length} to ${filteredCollections.length} collections`,
      );
    }

    const openApiSpec = {
      openapi: '3.1.0',
      info: {
        title: 'Forest Admin API',
        version: '1.0.0',
        description: 'API documentation for Forest Admin RPC endpoints',
      },
      servers: [
        {
          url: origin,
          description: 'Current API server',
        },
      ],
      paths: {
        ...this.generateListPaths(filteredCollections),
        ...this.generateCreatePaths(filteredCollections),
        ...this.generateAggregatePaths(filteredCollections),
        ...this.generateUpdatePaths(filteredCollections),
        ...this.generateDeletePaths(filteredCollections),
        ...this.generateSchemaPath(),
      },
      components: this.generateComponents(filteredCollections),
      security: [{ ApiKeyAuth: [] }],
    };

    // Add documentation for the openapi.json endpoint itself with improved description
    openApiSpec.paths['/openapi.json'] = {
      get: {
        summary: 'OpenAPI Specification',
        description:
          'Returns the OpenAPI specification for the API. Use the `exclude` query parameter to filter out specific collections (e.g., `/openapi.json?exclude=users,orders`).',
        operationId: 'get_api_specification',
        parameters: [
          {
            name: 'exclude',
            in: 'query',
            description:
              'Comma-separated list of collection names to exclude from the documentation (e.g., `users,transactions`)',
            required: false,
            schema: {
              type: 'string',
            },
            example: 'users,transactions',
          },
        ],
        responses: {
          200: {
            description: 'OpenAPI specification in JSON format',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['openapi', 'info', 'paths'],
                  properties: {
                    openapi: {
                      type: 'string',
                      description: 'OpenAPI version',
                      example: '3.1.0',
                    },
                    info: {
                      type: 'object',
                      required: ['title', 'version'],
                      properties: {
                        title: {
                          type: 'string',
                          description: 'API title',
                        },
                        version: {
                          type: 'string',
                          description: 'API version',
                        },
                        description: {
                          type: 'string',
                          description: 'API description',
                        },
                      },
                    },
                    servers: {
                      type: 'array',
                      description: 'API servers',
                      items: {
                        type: 'object',
                        required: ['url'],
                        properties: {
                          url: {
                            type: 'string',
                            description: 'Server URL',
                          },
                          description: {
                            type: 'string',
                            description: 'Server description',
                          },
                        },
                      },
                    },
                    paths: {
                      type: 'object',
                      description: 'API paths',
                      additionalProperties: {
                        type: 'object',
                        description: 'Path operations',
                      },
                    },
                    components: {
                      type: 'object',
                      description: 'API components',
                      properties: {
                        schemas: {
                          type: 'object',
                          description: 'Reusable schemas',
                        },
                        securitySchemes: {
                          type: 'object',
                          description: 'Security schemes',
                        },
                      },
                    },
                    security: {
                      type: 'array',
                      description: 'API security requirements',
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    return openApiSpec;
  }

  async handleOpenApi(context: any) {
    const { collections } = this.dataSource;

    context.response.body = await this.makeOpenApi(
      collections,
      context.state.exclude,
      (context.request.origin as string).replace('http', 'https'),
    );
  }

  private generateDeletePaths(collections: Collection[]) {
    const paths = {};

    collections.forEach(collection => {
      const collectionName = collection.name;

      // DELETE /rpc/{collection}/delete
      paths[`/forest/mcp/rpc/${collectionName}/delete`] = {
        delete: {
          summary: `Delete ${collectionName} records`,
          description: `Delete one or more ${collectionName} records based on a filter condition`,
          operationId: `delete_${collectionName}`,
          requestBody: {
            description:
              'Delete record with filter data. The data object MUST contain a "filter" field to specify which records to delete.',
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['filter'],
                  additionalProperties: false,
                  properties: {
                    filter: {
                      type: 'object',
                      description: 'Filter to select which records to delete',
                      required: ['conditionTree'],
                      properties: {
                        conditionTree: {
                          description:
                            'Conditions for filtering records to delete. Accepts a leaf condition or a branch condition.',
                          anyOf: [
                            { $ref: '#/components/schemas/LeafCondition' },
                            { $ref: '#/components/schemas/BranchCondition' },
                          ],
                        },
                      },
                    },
                  },
                },
                examples: {
                  deleteById: {
                    summary: 'Delete a specific record by ID',
                    value: {
                      filter: {
                        conditionTree: {
                          field: 'id',
                          operator: 'Equal',
                          value: '123',
                        },
                      },
                    },
                  },
                  deleteByCondition: {
                    summary: 'Delete multiple records matching a condition',
                    value: {
                      filter: {
                        conditionTree: {
                          aggregator: 'and',
                          conditions: [
                            {
                              field: 'status',
                              operator: 'Equal',
                              value: 'pending',
                            },
                            {
                              field: 'createdAt',
                              operator: 'Before',
                              value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            204: {
              description: 'No Content - Records deleted successfully',
            },
            400: {
              description:
                'Bad Request - Invalid data or validation error. Often occurs when the filter is missing or malformed.',
              content: {
                'application/json': {
                  examples: {
                    missingFilter: {
                      summary: 'Missing required filter',
                      value: {
                        error: 'Missing required field: filter',
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized - Authentication required',
            },
            403: {
              description: 'Forbidden - Insufficient permissions',
            },
            500: {
              description: 'Internal server error',
            },
          },
        },
      };
    });

    return paths;
  }

  private generateUpdatePaths(collections: Collection[]) {
    const paths = {};

    collections.forEach(collection => {
      const collectionName = collection.name;
      const schemaRef = `#/components/schemas/${collectionName}`;
      const { fields } = this.getFilterSchemaForCollection(collection);

      // POST /forest/rpc/{collection}/update
      paths[`/forest/mcp/rpc/${collectionName}/update`] = {
        put: {
          summary: `Update ${collectionName}`,
          description: `Update one or more ${collectionName} records based on a filter condition`,
          operationId: `update_${collectionName}`,
          requestBody: {
            description: `Update configuration with filter and patch data. The data object MUST contain the fields to update with their new values - this is a patch operation, not a full record update.`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['filter', 'patch'],
                  additionalProperties: false,
                  properties: {
                    filter: {
                      type: 'object',
                      description: 'Filter to select which records to update',
                      required: ['conditionTree'],
                      properties: {
                        conditionTree: {
                          description: 'Conditions for filtering records to update',
                          anyOf: [
                            { $ref: '#/components/schemas/LeafCondition' },
                            { $ref: '#/components/schemas/BranchCondition' },
                          ],
                        },
                      },
                    },
                    patch: {
                      type: 'object',
                      description:
                        'Fields and values to update on matched records. This MUST be a PATCH object with only the fields you want to update, not the full record. THIS FIELD IS REQUIRED AND CANNOT BE OMITTED. This is an object with the fields you want to update as keys and the new values as values.',
                      additionalProperties: true,
                      minProperties: 1,
                      nullable: false,
                      properties: {},
                    },
                  },
                },
                examples: {
                  updateById: {
                    summary: 'Update a specific record by ID',
                    value: {
                      filter: {
                        conditionTree: {
                          field: 'id',
                          operator: 'Equal',
                          value: '123',
                        },
                      },
                      patch: {
                        status: 'active',
                        updatedAt: new Date().toISOString(),
                      },
                    },
                  },
                  updateMultipleRecords: {
                    summary: 'Update multiple records matching a condition',
                    value: {
                      filter: {
                        conditionTree: {
                          field: 'status',
                          operator: 'Equal',
                          value: 'pending',
                        },
                      },
                      patch: {
                        status: 'processed',
                        updatedAt: new Date().toISOString(),
                      },
                    },
                  },
                  complexUpdate: {
                    summary: 'Complex update with multiple conditions',
                    value: {
                      filter: {
                        conditionTree: {
                          aggregator: 'and',
                          conditions: [
                            {
                              field: 'status',
                              operator: 'Equal',
                              value: 'pending',
                            },
                            {
                              field: 'createdAt',
                              operator: 'Before',
                              value: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
                            },
                          ],
                        },
                      },
                      patch: {
                        status: 'expired',
                        updatedAt: new Date().toISOString(),
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: `Updated ${collectionName} records information`,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        description: 'Whether the update operation was successful',
                      },
                      count: {
                        type: 'number',
                        description: 'Number of records updated',
                      },
                    },
                    required: ['success', 'count'],
                  },
                  examples: {
                    singleUpdate: {
                      summary: 'Single record updated',
                      value: { success: true, count: 1 },
                    },
                    multipleUpdates: {
                      summary: 'Multiple records updated',
                      value: { success: true, count: 5 },
                    },
                    noRecordsMatched: {
                      summary: 'No records matched the filter',
                      value: { success: true, count: 0 },
                    },
                  },
                },
              },
            },
            400: {
              description:
                'Bad request - Invalid data or validation error. Often occurs when caller is not valid JSON or patch is missing.',
              content: {
                'application/json': {
                  examples: {
                    invalidCaller: {
                      summary: 'Invalid caller parameter',
                      value: {
                        error: 'SyntaxError: Unexpected token \'u\', "user" is not valid JSON',
                      },
                    },
                    missingFilter: {
                      summary: 'Missing required filter',
                      value: {
                        error: 'Missing required field: filter',
                      },
                    },
                    missingPatch: {
                      summary: 'Missing patch data',
                      value: {
                        error:
                          'Missing or empty patch object. Update requests must include a patch object with at least one property.',
                        code: 'MISSING_PATCH',
                      },
                    },
                    emptyPatch: {
                      summary: 'Empty patch object',
                      value: {
                        error:
                          'Missing or empty patch object. Update requests must include a patch object with at least one property.',
                        code: 'MISSING_PATCH',
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized - Authentication required',
            },
            403: {
              description: 'Forbidden - Insufficient permissions',
            },
            422: {
              description: 'Unprocessable Entity - Validation error in the patch data',
              content: {
                'application/json': {
                  examples: {
                    invalidValue: {
                      summary: 'Invalid value for field',
                      value: {
                        error: 'Invalid value for field: status',
                      },
                    },
                    readOnlyField: {
                      summary: 'Attempting to update a read-only field',
                      value: {
                        error: 'Cannot update read-only field: createdAt',
                      },
                    },
                  },
                },
              },
            },
            500: {
              description: 'Internal server error',
            },
          },
        },
      };
    });

    return paths;
  }

  private generateAggregatePaths(collections: Collection[]) {
    const paths = {};

    collections.forEach(collection => {
      const collectionName = collection.name;
      const { fields } = this.getFilterSchemaForCollection(collection);

      // Find appropriate numeric fields for aggregation examples
      const numericField =
        fields.find(
          f =>
            f.toLowerCase().includes('price') ||
            f.toLowerCase().includes('amount') ||
            f.toLowerCase().includes('count'),
        ) ||
        fields[0] ||
        'price';

      // Find appropriate categorical field for grouping examples
      const categoryField =
        fields.find(
          f =>
            f.toLowerCase().includes('category') ||
            f.toLowerCase().includes('type') ||
            f.toLowerCase().includes('status'),
        ) ||
        fields[0] ||
        'category';

      // Find appropriate date field for time range examples
      const dateField =
        fields.find(
          f =>
            f.toLowerCase().includes('date') ||
            f.toLowerCase().includes('created') ||
            f.toLowerCase().includes('updated'),
        ) || 'createdAt';

      paths[`/forest/mcp/rpc/${collectionName}/aggregate`] = {
        post: {
          summary: `Aggregate ${collectionName}`,
          description: `Compute aggregations on ${collectionName} records with filtering, grouping, supports also time-based analysis.`,
          operationId: `aggregate_${collectionName}`,
          requestBody: {
            description: `Aggregate configuration with field, operation, and optional grouping`,
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['aggregation'],
                  properties: {
                    aggregation: {
                      type: 'object',
                      description: 'Aggregation configuration',
                      required: ['operation'],
                      properties: {
                        field: {
                          type: ['string', 'null'],
                          description: 'Field to aggregate. Can be null when operation is Count.',
                          nullable: true,
                        },
                        operation: {
                          type: 'string',
                          description: 'The type of aggregation operation to perform',
                          enum: ['Count', 'Sum', 'Avg', 'Max', 'Min'],
                        },
                        groups: {
                          type: 'array',
                          description: 'Fields to group by with optional operations',
                          items: {
                            type: 'object',
                            required: ['field'],
                            properties: {
                              field: {
                                type: 'string',
                                description: 'Field to group by',
                              },
                              operation: {
                                type: 'string',
                                description:
                                  'Optional operation to apply to the group field (e.g., date grouping). Skip if targeted field is not a date.',
                                enum: ['Day', 'Week', 'Month', 'Year'],
                              },
                            },
                          },
                        },
                      },
                    },
                    filter: {
                      type: 'object',
                      description: 'Filter parameters to apply before aggregation',
                      properties: {
                        conditionTree: {
                          description: 'Conditions for filtering records',
                          anyOf: [
                            { $ref: '#/components/schemas/LeafCondition' },
                            { $ref: '#/components/schemas/BranchCondition' },
                          ],
                        },
                      },
                    },
                    limit: {
                      type: 'number',
                      description: 'Maximum number of aggregated results to return',
                      example: 10,
                    },
                  },
                },
                examples: {
                  countAll: {
                    summary: 'Count all records',
                    value: {
                      aggregation: {
                        field: 'id',
                        operation: 'Count',
                      },
                    },
                  },
                  countWithNullField: {
                    summary: 'Count all records (with null field)',
                    value: {
                      aggregation: {
                        field: null,
                        operation: 'Count',
                        groups: [
                          {
                            field: dateField,
                            operation: 'Year',
                          },
                        ],
                      },
                    },
                  },
                  sumByCategory: {
                    summary: 'Sum with grouping by category',
                    value: {
                      aggregation: {
                        field: numericField,
                        operation: 'Sum',
                        groups: [
                          {
                            field: categoryField,
                          },
                        ],
                      },
                    },
                  },
                  countWithYearGrouping: {
                    summary: 'Count records grouped by year',
                    value: {
                      aggregation: {
                        field: 'id',
                        operation: 'Count',
                        groups: [
                          {
                            field: dateField,
                            operation: 'Year',
                          },
                        ],
                      },
                    },
                  },
                  sumByMonthAndCategory: {
                    summary: 'Sum by month and category',
                    value: {
                      aggregation: {
                        field: numericField,
                        operation: 'Sum',
                        groups: [
                          {
                            field: dateField,
                            operation: 'Month',
                          },
                          {
                            field: categoryField,
                          },
                        ],
                      },
                    },
                  },
                  averageWithFilter: {
                    summary: 'Average with filter and limit',
                    value: {
                      aggregation: {
                        field: numericField,
                        operation: 'Avg',
                        groups: [
                          {
                            field: categoryField,
                          },
                        ],
                      },
                      filter: {
                        conditionTree: {
                          field: dateField,
                          operator: 'GreaterThan',
                          value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                        },
                      },
                      limit: 5,
                    },
                  },
                  complexDateFilter: {
                    summary: 'With complex date range filter',
                    value: {
                      aggregation: {
                        field: numericField,
                        operation: 'Sum',
                      },
                      filter: {
                        conditionTree: {
                          aggregator: 'and',
                          conditions: [
                            {
                              field: dateField,
                              operator: 'After',
                              value: '2022-12-31',
                            },
                            {
                              field: dateField,
                              operator: 'Before',
                              value: '2025-01-01',
                            },
                          ],
                        },
                      },
                      limit: 10,
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: `Aggregation results for ${collectionName}`,
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        value: {
                          description: 'The result of the aggregation operation',
                          type: 'number',
                        },
                        group: {
                          description: 'Grouping values',
                          type: 'object',
                          additionalProperties: true,
                        },
                      },
                      required: ['value'],
                    },
                  },
                  examples: {
                    simpleCount: {
                      summary: 'Simple count result',
                      value: [{ value: 42 }],
                    },
                    groupedByCategory: {
                      summary: 'Grouped by category',
                      value: [
                        {
                          value: 1250,
                          group: { [categoryField]: 'Electronics' },
                        },
                        { value: 980, group: { [categoryField]: 'Clothing' } },
                        { value: 450, group: { [categoryField]: 'Books' } },
                      ],
                    },
                    groupedByYear: {
                      summary: 'Grouped by year',
                      value: [
                        { value: 32, group: { [dateField]: 2021 } },
                        { value: 78, group: { [dateField]: 2022 } },
                        { value: 125, group: { [dateField]: 2023 } },
                      ],
                    },
                    groupedByMonthAndCategory: {
                      summary: 'Grouped by month and category',
                      value: [
                        {
                          value: 450,
                          group: {
                            [dateField]: '2023-01',
                            [categoryField]: 'Electronics',
                          },
                        },
                        {
                          value: 320,
                          group: {
                            [dateField]: '2023-01',
                            [categoryField]: 'Clothing',
                          },
                        },
                        {
                          value: 510,
                          group: {
                            [dateField]: '2023-02',
                            [categoryField]: 'Electronics',
                          },
                        },
                        {
                          value: 380,
                          group: {
                            [dateField]: '2023-02',
                            [categoryField]: 'Clothing',
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
            400: {
              description: 'Bad request - Invalid parameters',
              content: {
                'application/json': {
                  examples: {
                    invalidField: {
                      summary: 'Invalid field specified',
                      value: {
                        error: 'Field not found: nonexistentField',
                      },
                    },
                    missingRequiredField: {
                      summary: 'Missing required parameters',
                      value: {
                        error: 'Missing required parameters: field, operation',
                      },
                    },
                    invalidCaller: {
                      summary: 'Invalid caller parameter',
                      value: {
                        error: 'SyntaxError: Unexpected token \'u\', "user" is not valid JSON',
                      },
                    },
                  },
                },
              },
            },
            401: {
              description: 'Unauthorized - Authentication required',
            },
            403: {
              description: 'Forbidden - Insufficient permissions',
            },
          },
        },
      };
    });

    return paths;
  }
}
