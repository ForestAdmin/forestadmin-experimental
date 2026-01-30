console.warn(
  '[@forestadmin-experimental/agent-nodejs-testing] This package is deprecated. ' +
    'Please migrate to @forestadmin/agent-testing. ' +
    'See: https://www.npmjs.com/package/@forestadmin/agent-testing',
);

export * from './integrations';
export * from './units';
export * from './remote-agent-client';
