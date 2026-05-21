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
