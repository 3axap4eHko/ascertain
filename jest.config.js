import { readFileSync } from 'node:fs';
const swcrc = JSON.parse(readFileSync('.swcrc', 'utf8'));

export default {
  verbose: true,
  collectCoverage: !!process.env.CI || !!process.env.COVERAGE,
  collectCoverageFrom: [
    'src/**/*.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '__fixtures__',
    '__mocks__',
    '__tests__',
  ],
  coverageDirectory: './coverage',
  transform: {
    '^.+\\.js$': ['@swc/jest', {
      ...swcrc,
      module: {
        type: 'commonjs',
      },
    }],
  },
};
