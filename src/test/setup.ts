// src/test/setup.ts
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Mock console methods during tests to reduce noise
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
};

// Set test environment variables if not in .env.test
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Increase timeout for database operations
jest.setTimeout(10000);

// Mock markdown utilities to avoid ES module issues with 'marked' package
jest.mock('../core/utilities/markdownUtils', () => ({
    convertMarkdownToHtml: jest.fn(),
    renderMarkdownFile: jest.fn(),
}));