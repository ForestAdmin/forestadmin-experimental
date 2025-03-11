import type { Config } from '@jest/types';

// eslint-disable-next-line import/no-relative-packages
import jestConfig from '../../jest.config';

const config: Config.InitialOptions = {
  ...jestConfig,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  testTimeout: 10_000,
  maxWorkers: 1,
};

export default config;
