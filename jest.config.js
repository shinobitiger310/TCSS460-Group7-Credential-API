// jest.config.js
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/index.ts',  // Don't test the main server file
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
    ],
    // Transform ES modules from node_modules
    transformIgnorePatterns: [
        'node_modules/(?!(marked|highlight.js)/)',
    ],
    // Handle your TypeScript path mappings
    moduleNameMapper: {
        '^@core/(.*)$': '<rootDir>/src/core/$1',
        '^@routes/(.*)$': '<rootDir>/src/routes/$1',
        '^@utilities$': '<rootDir>/src/core/utilities/index',
        '^@middleware$': '<rootDir>/src/core/middleware/index',
        '^@models$': '<rootDir>/src/core/models/index',
        '^@db$': '<rootDir>/src/core/utilities/database',
        '^@auth$': '<rootDir>/src/core/utilities/credentialingUtils',
    },
    // Setup files to run before tests
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
    // Coverage settings
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
        },
    },
};
