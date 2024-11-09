import { createForestClient } from '../../src';

describe('test any agent setup', () => {
  it('should return only minor users', async () => {
    const pyhtonAgent = await createForestClient({
      agentForestEnvSecret: 'ceba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
      agentForestAuthSecret: 'aeba742f5bc73946b34da192816a4d7177b3233fee7769955c29c0e90fd584f2',
      agentUrl: `http://127.0.0.1:8000`,
      serverUrl: `http://127.0.0.1:3456`,
      agentSchemaPath:
        '/Users/albanbertolini/Projects/to-remove/agent-python/src/_example/django/django_demo/.forestadmin-schema.json',
    });

    const agentNodejsAgent = await createForestClient({
      agentForestEnvSecret: 'e2b3ad263d5a0e0eea6b373d27696dc7c52919b4c76d09c4ec776d09f12b2a48',
      agentForestAuthSecret: 'b0bdf0a639c16bae8851dd24ee3d79ef0a352e957c5b86cb',
      agentUrl: `http://127.0.0.1:3357`,
      serverUrl: `http://127.0.0.1:3456`,
      agentSchemaPath:
        '/Users/albanbertolini/Projects/agent-nodejs/packages/_example/.forestadmin-schema.json',
    });

    const address = await pyhtonAgent.collection('address').list();
    const users = await agentNodejsAgent.collection('customer').list();

    expect(address.length).toEqual(15);
    expect(users.length).toEqual(15);
  });
});
