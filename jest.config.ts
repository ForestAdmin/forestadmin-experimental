import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: ['<rootDir>/packages/*/src/**/*.ts'],
  testMatch: ['<rootDir>/packages/*/test/**/*.test.ts'],
  setupFilesAfterEnv: ['jest-extended/all'],
};
export default config;
