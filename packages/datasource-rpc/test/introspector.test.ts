import { parseIntrospection } from '../src/introspector';
import { IntrospectionSchema } from '../src/types';

function buildIntroSchema(actionSchema: Record<string, unknown>): IntrospectionSchema {
  return {
    etag: 'etag',
    charts: [],
    native_query_connections: [],
    rpc_relations: {},
    collections: [
      {
        name: 'Files',
        countable: false,
        searchable: false,
        charts: [],
        segments: [],
        fields: {},
        actions: { download: actionSchema },
        aggregation_capabilities: {
          supported_date_operations: [],
          support_groups: false,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('parseIntrospection', () => {
  it('exposes is_generate_file from the wire as generateFile expected by the JS toolkit', () => {
    const parsed = parseIntrospection(
      buildIntroSchema({ scope: 'Single', is_generate_file: true, description: 'export' }),
    );

    const action = parsed.collections[0].actions.download as Record<string, unknown>;
    expect(action.generateFile).toBe(true);
    expect(action.scope).toBe('Single');
    expect(action.description).toBe('export');
  });

  it('leaves generateFile undefined when is_generate_file is absent', () => {
    const parsed = parseIntrospection(buildIntroSchema({ scope: 'Single' }));

    const action = parsed.collections[0].actions.download as Record<string, unknown>;
    expect(action.generateFile).toBeUndefined();
    expect(action.scope).toBe('Single');
  });
});
