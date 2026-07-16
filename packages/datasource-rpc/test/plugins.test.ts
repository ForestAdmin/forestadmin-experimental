import { DataSourceDecorator } from '@forestadmin/datasource-toolkit';

import RpcDataSource from '../src/datasource';
import { reconciliateRpc } from '../src/plugins';

function buildRpcDataSource(rpcRelations = {}) {
  const logger = jest.fn();
  const options = { uri: 'http://localhost', authSecret: 'secret' };
  const introspection = {
    collections: [],
    charts: [],
    rpcRelations,
    nativeQueryConnections: [],
    etag: 'x',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new RpcDataSource(logger as any, options, introspection as any);
}

function buildCustomizer() {
  const cz = {
    disableSearch: jest.fn(),
    addManyToOneRelation: jest.fn(),
    addOneToManyRelation: jest.fn(),
    addOneToOneRelation: jest.fn(),
    addManyToManyRelation: jest.fn(),
  };

  const dz = {
    compositeDataSource: { dataSources: [] as unknown[] },
    getCollection: jest.fn(() => cz),
  };

  return { dz, cz };
}

describe('reconciliateRpc', () => {
  // Regression: getRealDatasource used to loop on the unchanging parameter instead of the
  // walked variable, hanging the event loop when the RPC datasource was wrapped by rename.
  it('terminates when the RPC datasource is wrapped in a DataSourceDecorator (rename)', () => {
    const rpc = buildRpcDataSource();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapped = new DataSourceDecorator(rpc as any, class {} as any);
    const { dz } = buildCustomizer();
    dz.compositeDataSource.dataSources = [wrapped];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => reconciliateRpc(dz as any, undefined, {})).not.toThrow();
  });

  it('applies the rename to the relation origin collection and its foreign collection', () => {
    const rpc = buildRpcDataSource({
      books: {
        author: {
          type: 'ManyToOne',
          foreignCollection: 'authors',
          foreignKey: 'author_id',
          foreignKeyTarget: 'id',
        },
      },
    });
    const { dz, cz } = buildCustomizer();
    dz.compositeDataSource.dataSources = [rpc];

    reconciliateRpc(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dz as any,
      undefined,
      { rename: (name: string) => `pre_${name}` },
    );

    expect(dz.getCollection).toHaveBeenCalledWith('pre_books');
    expect(cz.addManyToOneRelation).toHaveBeenCalledWith(
      'author',
      'pre_authors',
      expect.objectContaining({ foreignCollection: 'authors' }),
    );
  });
});
