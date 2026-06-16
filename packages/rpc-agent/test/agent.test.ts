import RpcAgent from '../src/agent';

function createAgent(): RpcAgent {
  return Object.create(RpcAgent.prototype) as RpcAgent;
}

function buildCollectionFixture(actionSchema: Record<string, unknown>) {
  return {
    name: 'Files',
    schema: {
      fields: {},
      actions: { download: actionSchema },
      aggregationCapabilities: {
        supportedDateOperations: new Set<string>(),
        supportGroups: false,
      },
      countable: false,
      searchable: false,
      charts: [],
      segments: [],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function buildColumn(operators: string[] = ['Equal']) {
  return { type: 'Column', filterOperators: new Set(operators) };
}

function buildRelation(foreignCollection: string) {
  return { type: 'ManyToOne', foreignCollection, foreignKey: `${foreignCollection}Id` };
}

function buildSchemaCollection(name: string, fields: Record<string, unknown>) {
  return {
    name,
    schema: {
      fields,
      actions: {},
      aggregationCapabilities: {
        supportedDateOperations: new Set<string>(),
        supportGroups: false,
      },
      countable: false,
      searchable: false,
      charts: [],
      segments: [],
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('RpcAgent.buildCollection', () => {
  it('serialises generateFile as is_generate_file so Ruby main agents read it natively', () => {
    const agent = createAgent();
    const collection = buildCollectionFixture({
      scope: 'Single',
      generateFile: true,
      description: 'export',
    });

    const built = agent.buildCollection(collection, {}) as { actions: Record<string, unknown> };
    const action = built.actions.download as Record<string, unknown>;

    expect(action).toEqual({
      scope: 'Single',
      is_generate_file: true,
      description: 'export',
    });
  });
});

describe('RpcAgent.buildSchema', () => {
  function createAgentWithRpcCollections(rpcCollections: string[]): RpcAgent {
    const agent = createAgent();
    (agent as unknown as { rpcCollections: string[] }).rpcCollections = rpcCollections;

    return agent;
  }

  function buildDataSource(collections: unknown[]) {
    return {
      collections,
      schema: { charts: [] },
      nativeQueryConnections: {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
  }

  // Non-regression: a NON-RPC collection holding a relation toward an RPC collection
  // must be exposed in `rpc_relations`. The cross relation used to be computed in
  // buildCollection then dropped because the registration lived inside the RPC branch only.
  it('exposes cross relations from a non-RPC collection pointing to an RPC collection', () => {
    const agent = createAgentWithRpcCollections(['Books']);

    // Authors is a main (non-RPC) collection referencing the RPC collection Books.
    const authors = buildSchemaCollection('Authors', {
      id: buildColumn(),
      myBook: buildRelation('Books'),
    });
    const books = buildSchemaCollection('Books', { id: buildColumn() });

    const schema = agent.buildSchema(buildDataSource([authors, books]));

    expect(schema.rpc_relations.Authors).toBeDefined();
    expect(schema.rpc_relations.Authors.myBook).toMatchObject({
      type: 'ManyToOne',
      foreign_collection: 'Books',
    });

    // The cross relation is stripped from the exposed collection fields.
    const exposedAuthors = schema.collections.find(c => c.name === 'Authors');
    expect(exposedAuthors.fields).toHaveProperty('id');
    expect(exposedAuthors.fields).not.toHaveProperty('myBook');
  });

  it('keeps exposing relations from an RPC collection toward non-RPC collections', () => {
    const agent = createAgentWithRpcCollections(['Books']);

    const books = buildSchemaCollection('Books', {
      id: buildColumn(),
      author: buildRelation('Authors'),
    });
    const authors = buildSchemaCollection('Authors', { id: buildColumn() });

    const schema = agent.buildSchema(buildDataSource([books, authors]));

    expect(schema.rpc_relations.Books).toBeDefined();
    expect(schema.rpc_relations.Books.author).toMatchObject({
      type: 'ManyToOne',
      foreign_collection: 'Authors',
    });
    // The RPC collection itself is not added to the exposed `collections` array.
    expect(schema.collections.find(c => c.name === 'Books')).toBeUndefined();
  });

  it('omits collections without cross relations from rpc_relations', () => {
    const agent = createAgentWithRpcCollections(['Books']);

    const books = buildSchemaCollection('Books', { id: buildColumn() });
    const authors = buildSchemaCollection('Authors', { id: buildColumn() });

    const schema = agent.buildSchema(buildDataSource([books, authors]));

    expect(schema.rpc_relations).toEqual({});
  });
});
