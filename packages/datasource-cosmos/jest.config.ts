import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-extended/all'],
  testMatch: ['**/*.test.ts'],
  coveragePathIgnorePatterns: ['/node_modules/', '/test/'],
};

export default config;
