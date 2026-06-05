/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
    },
    {
      displayName: 'integration',
      preset: 'ts-jest',
      testEnvironment: 'node',
      rootDir: '.',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      moduleFileExtensions: ['js', 'json', 'ts'],
      transform: { '^.+\\.(t|j)s$': 'ts-jest' },
      setupFilesAfterEnv: ['<rootDir>/test/integration/setup.ts'],
    },
  ],
};
