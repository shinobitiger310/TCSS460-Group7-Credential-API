# Database Mocking Strategies for API Testing

**Created:** 2025-10-11
**Project:** TCSS-460 Message API
**Purpose:** Comprehensive guide for mocking PostgreSQL database during Postman/Newman and Jest testing

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Strategy Recommendations](#testing-strategy-recommendations)
3. [Option 1: pg-mem (In-Memory PostgreSQL)](#option-1-pg-mem-in-memory-postgresql)
4. [Option 2: Testcontainers (Real PostgreSQL in Docker)](#option-2-testcontainers-real-postgresql-in-docker)
5. [Option 3: Docker Compose Test Environment](#option-3-docker-compose-test-environment)
6. [Option 4: Jest Mocks (Unit Testing Only)](#option-4-jest-mocks-unit-testing-only)
7. [Postman/Newman Testing Strategies](#postmannewman-testing-strategies)
8. [Test Data Management](#test-data-management)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Comparison Matrix](#comparison-matrix)

---

## Overview

### Current Project Stack

- **API Framework:** Express.js 5.1.0 + TypeScript 5.9.2
- **Database:** PostgreSQL 16 (via Docker)
- **Database Client:** pg 8.16.3 with connection pooling
- **Testing:** Jest 30.1.3 + ts-jest 29.4.4
- **E2E Testing:** Postman Collection + Newman CLI
- **Current Database Pool:** `src/core/utilities/database.ts`
- **Database Schema:** `data/init.sql`

### Testing Pyramid for This Project

```
        E2E Tests (10%)
      Testcontainers
        Real DB Tests

    Integration Tests (20%)
      pg-mem or Docker
    Real SQL, Fast Execution

      Unit Tests (70%)
    Jest Mocks or pg-mem
  Pure Logic, No I/O
```

---

## Testing Strategy Recommendations

### Recommended Approach: Layered Testing

**Use different strategies for different test types:**

1. **Unit Tests (70%)** → Use **pg-mem** (fast, no Docker)
2. **Integration Tests (20%)** → Use **pg-mem** or **Docker Compose**
3. **E2E Tests (10%)** → Use **Testcontainers** or **Dedicated Test DB**
4. **Postman/Newman Tests** → Use **Docker Compose** with test environment

### Why This Approach?

| Concern | Solution |
|---------|----------|
| **Speed** | pg-mem executes tests in milliseconds |
| **Reliability** | Real PostgreSQL validates production behavior |
| **CI/CD Cost** | pg-mem has zero infrastructure cost |
| **Development Experience** | Fast feedback loop with pg-mem |
| **Confidence** | Testcontainers validates against real DB |

---

## Option 1: pg-mem (In-Memory PostgreSQL)

### What is pg-mem?

An in-memory PostgreSQL emulator written in TypeScript that runs entirely in JavaScript. No Docker, no external dependencies, instant state resets.

### Pros

✅ **Extremely fast** - Tests run in milliseconds
✅ **No Docker required** - Works in CI/CD without containers
✅ **Instant state reset** - Use backup/restore for zero-cost cleanup
✅ **Real SQL validation** - Catches syntax errors and constraint violations
✅ **TypeScript native** - First-class TypeScript support
✅ **Works with pg driver** - Drop-in replacement for your existing pool
✅ **Zero configuration** - No connection strings or ports

### Cons

⚠️ **Not 100% PostgreSQL** - Some advanced features unsupported
⚠️ **No extensions** - Can't test PostGIS, pg_trgm, etc.
⚠️ **Performance testing impossible** - Not a real database
⚠️ **Experimental** - Edge cases may differ from real PostgreSQL

### Best Use Cases

- Unit testing controllers with database logic
- Testing SQL query correctness
- Fast CI/CD pipeline execution
- Local development testing
- Testing constraint validations

### Installation

```bash
npm install pg-mem --save-dev
```

### Implementation

#### Step 1: Create pg-mem Setup Helper

```typescript
// src/test/helpers/pgMemSetup.ts
import { newDb, IMemoryDb } from 'pg-mem';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface MockDatabase {
    db: IMemoryDb;
    pool: Pool;
    backup: any;
    reset: () => void;
    seed: (data: SeedData) => Promise<void>;
}

export interface SeedData {
    messages?: Array<{ name: string; message: string; priority: number }>;
    apiKeys?: Array<{ api_key: string; name: string; email: string; is_active: boolean }>;
}

export const createMockDatabase = async (): Promise<MockDatabase> => {
    // Create in-memory database
    const db = newDb();

    // Register pg adapter
    const { Pool: MockPool } = db.adapters.createPg();
    const pool = new MockPool() as unknown as Pool;

    // Load and execute init.sql schema
    const initSql = fs.readFileSync(
        path.join(__dirname, '../../../data/init.sql'),
        'utf8'
    );

    db.public.none(initSql);

    // Create restore point for instant resets
    const backup = db.backup();

    // Seed function for test data
    const seed = async (data: SeedData): Promise<void> => {
        if (data.messages) {
            for (const msg of data.messages) {
                await pool.query(
                    'INSERT INTO messages (name, message, priority) VALUES ($1, $2, $3)',
                    [msg.name, msg.message, msg.priority]
                );
            }
        }

        if (data.apiKeys) {
            for (const key of data.apiKeys) {
                await pool.query(
                    'INSERT INTO api_keys (api_key, name, email, is_active) VALUES ($1, $2, $3, $4)',
                    [key.api_key, key.name, key.email, key.is_active]
                );
            }
        }
    };

    return {
        db,
        pool,
        backup,
        reset: () => backup.restore(),
        seed
    };
};
```

#### Step 2: Update Database Module for Dependency Injection

```typescript
// src/core/utilities/database.ts (additions)

// Add to existing exports:
let pool: Pool | null = null;

// Add new functions for testing:
export const setPool = (mockPool: Pool): void => {
    pool = mockPool;
};

export const resetPool = (): void => {
    pool = null;
};
```

#### Step 3: Update Test Setup

```typescript
// src/test/setup.ts
import { createMockDatabase, MockDatabase } from './helpers/pgMemSetup';
import { setPool, resetPool } from '@utilities/database';

let mockDb: MockDatabase;

beforeAll(async () => {
    // Create mock database
    mockDb = await createMockDatabase();

    // Inject into application
    setPool(mockDb.pool);
});

afterAll(() => {
    // Clean up
    resetPool();
});

beforeEach(() => {
    // Reset to clean state before each test
    mockDb.reset();
});

// Export for use in individual tests
export { mockDb };
```

#### Step 4: Write Tests Using pg-mem

```typescript
// src/controllers/__tests__/messageController.test.ts
import { createMessage, getAllMessages, deleteMessageByName } from '../messageController';
import { mockDb } from '@/test/setup';

describe('Message Controller (pg-mem)', () => {
    beforeEach(async () => {
        // Seed test data
        await mockDb.seed({
            messages: [
                { name: 'Alice', message: 'Hello', priority: 1 },
                { name: 'Bob', message: 'World', priority: 2 }
            ]
        });
    });

    it('should create a new message', async () => {
        const req = {
            body: { name: 'Charlie', message: 'Test', priority: 1 }
        } as any;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as any;

        await createMessage(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: expect.objectContaining({
                    name: 'Charlie',
                    message: 'Test',
                    priority: 1,
                    formatted: '{1} - [Charlie] says: Test'
                })
            })
        );
    });

    it('should prevent duplicate names', async () => {
        const req = {
            body: { name: 'Alice', message: 'Duplicate', priority: 1 }
        } as any;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as any;

        await createMessage(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: false,
                errorCode: 'MSG_NAME_EXISTS'
            })
        );
    });

    it('should retrieve all messages', async () => {
        const req = {} as any;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as any;

        await getAllMessages(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        const response = res.json.mock.calls[0][0];
        expect(response.data.entries).toHaveLength(2);
        expect(response.data.totalCount).toBe(2);
    });

    it('should delete message and return deleted data', async () => {
        const req = {
            params: { name: 'Alice' }
        } as any;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as any;

        await deleteMessageByName(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                success: true,
                data: {
                    deleted: expect.objectContaining({
                        name: 'Alice',
                        message: 'Hello',
                        priority: 1
                    })
                }
            })
        );
    });
});
```

### Performance Characteristics

```
Test Suite Execution Times (100 tests):

pg-mem:          0.5 - 2 seconds
Docker Compose:  10 - 30 seconds
Testcontainers:  20 - 60 seconds (includes container startup)
```

---

## Option 2: Testcontainers (Real PostgreSQL in Docker)

### What is Testcontainers?

A Node.js library that programmatically starts Docker containers for testing, then automatically tears them down. Provides real PostgreSQL instances per test suite.

### Pros

✅ **100% production-like** - Real PostgreSQL behavior
✅ **Tests all features** - Extensions, triggers, procedures
✅ **Validates migrations** - Tests actual database schema changes
✅ **Automatic cleanup** - Containers destroyed after tests
✅ **Parallel execution** - Each test suite gets own container
✅ **Performance testing** - Can measure real query performance

### Cons

❌ **Slower execution** - 20-60 seconds container startup overhead
❌ **Requires Docker** - Must have Docker running
❌ **Higher CI/CD cost** - Uses more compute resources
❌ **Complex debugging** - Container logs harder to access
❌ **Not for unit tests** - Too slow for rapid TDD

### Best Use Cases

- End-to-end API testing
- Testing database migrations
- Pre-production validation
- Testing PostgreSQL-specific features
- Performance testing

### Installation

```bash
npm install @testcontainers/postgresql --save-dev
```

### Implementation

#### Step 1: Create Testcontainers Setup

```typescript
// src/test/helpers/testcontainersSetup.ts
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export class TestDatabaseContainer {
    private container: StartedPostgreSqlContainer | null = null;
    private pool: Pool | null = null;

    async start(): Promise<Pool> {
        console.log('Starting PostgreSQL test container...');

        // Start container with PostgreSQL 16
        this.container = await new PostgreSqlContainer('postgres:16-alpine')
            .withDatabase('test_message_db')
            .withUsername('test_user')
            .withPassword('test_password')
            .withExposedPorts(5432)
            .start();

        console.log(`Container started on port ${this.container.getPort()}`);

        // Create connection pool
        this.pool = new Pool({
            host: this.container.getHost(),
            port: this.container.getPort(),
            database: this.container.getDatabase(),
            user: this.container.getUsername(),
            password: this.container.getPassword()
        });

        // Initialize schema
        await this.initializeSchema();

        return this.pool;
    }

    private async initializeSchema(): Promise<void> {
        if (!this.pool) throw new Error('Pool not initialized');

        const initSql = fs.readFileSync(
            path.join(__dirname, '../../../data/init.sql'),
            'utf8'
        );

        await this.pool.query(initSql);
        console.log('Database schema initialized');
    }

    async stop(): Promise<void> {
        await this.pool?.end();
        await this.container?.stop();
        console.log('Test container stopped');
    }

    getPool(): Pool {
        if (!this.pool) throw new Error('Pool not initialized');
        return this.pool;
    }

    async reset(): Promise<void> {
        if (!this.pool) throw new Error('Pool not initialized');

        // Truncate all tables
        await this.pool.query('TRUNCATE TABLE messages RESTART IDENTITY CASCADE');
        await this.pool.query('TRUNCATE TABLE api_keys RESTART IDENTITY CASCADE');
    }

    async seed(data: SeedData): Promise<void> {
        if (!this.pool) throw new Error('Pool not initialized');

        if (data.messages) {
            for (const msg of data.messages) {
                await this.pool.query(
                    'INSERT INTO messages (name, message, priority) VALUES ($1, $2, $3)',
                    [msg.name, msg.message, msg.priority]
                );
            }
        }

        if (data.apiKeys) {
            for (const key of data.apiKeys) {
                await this.pool.query(
                    'INSERT INTO api_keys (api_key, name, email, is_active) VALUES ($1, $2, $3, $4)',
                    [key.api_key, key.name, key.email, key.is_active]
                );
            }
        }
    }
}

interface SeedData {
    messages?: Array<{ name: string; message: string; priority: number }>;
    apiKeys?: Array<{ api_key: string; name: string; email: string; is_active: boolean }>;
}
```

#### Step 2: Jest Global Setup/Teardown

```typescript
// jest.config.js (update)
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/__tests__/**/*.test.ts'],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@utilities/(.*)$': '<rootDir>/src/core/utilities/$1',
        '^@db$': '<rootDir>/src/core/utilities/database'
    },
    setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

    // Add for integration tests:
    globalSetup: '<rootDir>/src/test/globalSetup.ts',
    globalTeardown: '<rootDir>/src/test/globalTeardown.ts',
    testTimeout: 30000 // Containers need time to start
};
```

```typescript
// src/test/globalSetup.ts
import { TestDatabaseContainer } from './helpers/testcontainersSetup';

export default async () => {
    if (process.env.TEST_TYPE === 'integration') {
        const testDb = new TestDatabaseContainer();
        const pool = await testDb.start();

        // Store references globally
        (global as any).__TEST_DB_CONTAINER__ = testDb;
        (global as any).__TEST_DB_POOL__ = pool;

        console.log('✅ Test database container started');
    }
};
```

```typescript
// src/test/globalTeardown.ts
export default async () => {
    if (process.env.TEST_TYPE === 'integration') {
        const testDb = (global as any).__TEST_DB_CONTAINER__;

        if (testDb) {
            await testDb.stop();
            console.log('✅ Test database container stopped');
        }
    }
};
```

#### Step 3: Write Integration Tests

```typescript
// src/controllers/__tests__/messageController.integration.test.ts
import request from 'supertest';
import { app } from '../../app';
import { TestDatabaseContainer } from '@/test/helpers/testcontainersSetup';

describe('Message API Integration Tests (Testcontainers)', () => {
    let testDb: TestDatabaseContainer;

    beforeAll(() => {
        testDb = (global as any).__TEST_DB_CONTAINER__;
    });

    beforeEach(async () => {
        await testDb.reset();
    });

    it('should complete full message workflow', async () => {
        // Create message
        const createRes = await request(app)
            .post('/message')
            .send({ name: 'Integration Test', message: 'Full workflow', priority: 1 });

        expect(createRes.status).toBe(201);
        expect(createRes.body.data.name).toBe('Integration Test');

        // Retrieve message
        const getRes = await request(app)
            .get('/message/all');

        expect(getRes.status).toBe(200);
        expect(getRes.body.data.totalCount).toBe(1);

        // Update message
        const updateRes = await request(app)
            .patch('/message')
            .send({ name: 'Integration Test', message: 'Updated content' });

        expect(updateRes.status).toBe(200);
        expect(updateRes.body.data.message).toBe('Updated content');

        // Delete message
        const deleteRes = await request(app)
            .delete('/message/Integration Test');

        expect(deleteRes.status).toBe(200);
        expect(deleteRes.body.data.deleted.name).toBe('Integration Test');

        // Verify deletion
        const verifyRes = await request(app)
            .get('/message/all');

        expect(verifyRes.body.data.totalCount).toBe(0);
    });

    it('should handle concurrent operations correctly', async () => {
        // Create multiple messages concurrently
        const promises = Array.from({ length: 10 }, (_, i) =>
            request(app)
                .post('/message')
                .send({ name: `User${i}`, message: `Message ${i}`, priority: (i % 3) + 1 })
        );

        const results = await Promise.all(promises);

        // All should succeed
        results.forEach(res => expect(res.status).toBe(201));

        // Verify all created
        const getRes = await request(app).get('/message/all');
        expect(getRes.body.data.totalCount).toBe(10);
    });
});
```

#### Step 4: Package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testMatch='**/*.test.ts' --testPathIgnorePatterns='integration'",
    "test:integration": "TEST_TYPE=integration jest --testMatch='**/*.integration.test.ts'",
    "test:all": "npm run test:unit && npm run test:integration"
  }
}
```

---

## Option 3: Docker Compose Test Environment

### What is This Approach?

Use a dedicated test database container managed by Docker Compose, separate from your development database.

### Pros

✅ **Real PostgreSQL** - Production-like behavior
✅ **Persistent between test runs** - Faster than spinning up containers
✅ **Easy debugging** - Can inspect database state
✅ **Shared across processes** - Works with Postman/Newman
✅ **Cost-effective** - Single container for all tests

### Cons

❌ **Manual lifecycle management** - Must start/stop manually
❌ **State pollution** - Tests can affect each other
❌ **Port conflicts** - Can clash with dev database
❌ **Cleanup required** - Must truncate tables between tests

### Best Use Cases

- Local development testing
- Postman/Newman collection testing
- Manual QA testing
- Debugging test failures
- Team collaboration

### Implementation

#### Step 1: Create Test Docker Compose

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  test-postgres:
    image: postgres:16-alpine
    container_name: message-api-test-db
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_password
      POSTGRES_DB: test_message_db
    ports:
      - "5433:5432"  # Different port to avoid conflict with dev DB
    volumes:
      - ./data/init.sql:/docker-entrypoint-initdb.d/init.sql
      - test-db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d test_message_db"]
      interval: 2s
      timeout: 5s
      retries: 10

volumes:
  test-db-data:
```

#### Step 2: Test Environment Configuration

```env
# .env.test
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5433
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=test_message_db
PORT=3001
```

#### Step 3: Test Scripts

```bash
#!/bin/bash
# scripts/test-integration.sh

set -e

echo "🚀 Starting test database..."
docker-compose -f docker-compose.test.yml up -d

echo "⏳ Waiting for database to be healthy..."
timeout 30s bash -c 'until docker-compose -f docker-compose.test.yml ps | grep healthy; do sleep 1; done'

echo "✅ Database ready!"

echo "🧪 Running integration tests..."
NODE_ENV=test \
DB_HOST=localhost \
DB_PORT=5433 \
DB_USER=test_user \
DB_PASSWORD=test_password \
DB_NAME=test_message_db \
npm run test:integration

EXIT_CODE=$?

if [ "$1" == "--keep-running" ]; then
    echo "🔄 Keeping database running for manual testing..."
else
    echo "🧹 Cleaning up..."
    docker-compose -f docker-compose.test.yml down -v
fi

exit $EXIT_CODE
```

```bash
#!/bin/bash
# scripts/newman-test.sh

set -e

echo "🚀 Starting test environment..."
docker-compose -f docker-compose.test.yml up -d

echo "⏳ Waiting for services..."
sleep 5

# Start API server in background
NODE_ENV=test \
DB_HOST=localhost \
DB_PORT=5433 \
npm run local &
API_PID=$!

echo "⏳ Waiting for API to be ready..."
sleep 3

echo "🧪 Running Newman tests..."
newman run testing/postman/TCSS-460-Message-API-Complete.postman_collection.json \
    --delay-request 200 \
    --reporters cli,json \
    --reporter-json-export newman-results.json

EXIT_CODE=$?

echo "🛑 Stopping API server..."
kill $API_PID

echo "🧹 Cleaning up..."
docker-compose -f docker-compose.test.yml down -v

exit $EXIT_CODE
```

Make scripts executable:
```bash
chmod +x scripts/test-integration.sh
chmod +x scripts/newman-test.sh
```

#### Step 4: Package.json Scripts

```json
{
  "scripts": {
    "test:db:start": "docker-compose -f docker-compose.test.yml up -d",
    "test:db:stop": "docker-compose -f docker-compose.test.yml down -v",
    "test:integration": "bash scripts/test-integration.sh",
    "test:newman": "bash scripts/newman-test.sh"
  }
}
```

---

## Option 4: Jest Mocks (Unit Testing Only)

### What is This Approach?

Mock the database pool entirely using Jest mocks. No real database interaction.

### Pros

✅ **Fastest possible** - No I/O operations
✅ **No infrastructure** - Zero setup required
✅ **Test isolation** - Complete control over behavior
✅ **Error simulation** - Easy to test error paths

### Cons

❌ **No SQL validation** - Can't catch syntax errors
❌ **High maintenance** - Must update mocks when queries change
❌ **False confidence** - Tests may pass but real code fails
❌ **Not suitable for integration tests**

### Best Use Cases

- Pure business logic testing
- Testing error handling
- Testing response formatting
- CI/CD when speed is critical
- Testing middleware

### Implementation

```typescript
// src/test/helpers/mockPool.ts
import { Pool } from 'pg';

export const createMockPool = () => {
    const mockQuery = jest.fn();

    const mockPool = {
        query: mockQuery,
        connect: jest.fn(),
        end: jest.fn()
    } as unknown as Pool;

    return { mockPool, mockQuery };
};

// Usage in test:
import { createMockPool } from '@/test/helpers/mockPool';
import { setPool } from '@utilities/database';
import { createMessage } from '../messageController';

describe('Message Controller (Mocked)', () => {
    let mockPool: any;
    let mockQuery: jest.Mock;

    beforeEach(() => {
        const mock = createMockPool();
        mockPool = mock.mockPool;
        mockQuery = mock.mockQuery;
        setPool(mockPool);
    });

    it('should create message successfully', async () => {
        // Mock existing user check (no duplicates)
        mockQuery.mockResolvedValueOnce({ rows: [] });

        // Mock insert query
        mockQuery.mockResolvedValueOnce({
            rows: [{ name: 'John', message: 'Test', priority: 1 }]
        });

        const req = {
            body: { name: 'John', message: 'Test', priority: 1 }
        } as any;

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as any;

        await createMessage(req, res);

        expect(mockQuery).toHaveBeenCalledTimes(2);
        expect(res.status).toHaveBeenCalledWith(201);
    });
});
```

---

## Postman/Newman Testing Strategies

### Strategy 1: Environment-Based Configuration

**Create test-specific environment:**

```json
// testing/postman/environments/test.postman_environment.json
{
    "name": "Test Environment",
    "values": [
        {
            "key": "base_url",
            "value": "http://localhost:3001",
            "enabled": true
        },
        {
            "key": "db_port",
            "value": "5433",
            "enabled": true
        },
        {
            "key": "test_api_key",
            "value": "",
            "enabled": true
        }
    ]
}
```

**Run Newman with test environment:**

```bash
newman run testing/postman/TCSS-460-Message-API-Complete.postman_collection.json \
    -e testing/postman/environments/test.postman_environment.json \
    --delay-request 200
```

### Strategy 2: Pre-Request Scripts for Data Isolation

**Collection-level pre-request:**

```javascript
// Generate unique identifiers per test run
const timestamp = Date.now();
pm.environment.set('test_timestamp', timestamp);
pm.environment.set('test_name', `TestUser_${timestamp}`);
```

**Request using dynamic data:**

```json
{
    "name": "{{test_name}}",
    "message": "Test message",
    "priority": 1
}
```

### Strategy 3: Cleanup with Post-Response Scripts

```javascript
// Store created resources for cleanup
pm.test("Store message name for cleanup", function() {
    const jsonData = pm.response.json();

    if (pm.response.code === 201) {
        // Add to cleanup list
        const cleanup = pm.environment.get('cleanup_names') || [];
        cleanup.push(jsonData.data.name);
        pm.environment.set('cleanup_names', JSON.stringify(cleanup));
    }
});

// Cleanup folder - run at end
pm.test("Cleanup all created messages", function() {
    const cleanup = JSON.parse(pm.environment.get('cleanup_names') || '[]');

    cleanup.forEach(name => {
        pm.sendRequest({
            url: `${pm.environment.get('base_url')}/message/${name}`,
            method: 'DELETE'
        });
    });

    // Clear cleanup list
    pm.environment.set('cleanup_names', '[]');
});
```

### Strategy 4: Automated Test Database Reset

```javascript
// scripts/newman-with-reset.js
const newman = require('newman');
const { Client } = require('pg');

async function resetDatabase() {
    const client = new Client({
        host: 'localhost',
        port: 5433,
        user: 'test_user',
        password: 'test_password',
        database: 'test_message_db'
    });

    await client.connect();
    await client.query('TRUNCATE TABLE messages RESTART IDENTITY CASCADE');
    await client.query('TRUNCATE TABLE api_keys RESTART IDENTITY CASCADE');

    // Seed required data (like API keys)
    await client.query(`
        INSERT INTO api_keys (api_key, name, email, is_active)
        VALUES ('test-key-123', 'Test User', 'test@example.com', true)
    `);

    await client.end();
    console.log('✅ Database reset complete');
}

async function runTests() {
    await resetDatabase();

    return new Promise((resolve, reject) => {
        newman.run({
            collection: require('../testing/postman/TCSS-460-Message-API-Complete.postman_collection.json'),
            environment: require('../testing/postman/environments/test.postman_environment.json'),
            reporters: ['cli', 'json'],
            reporter: {
                json: { export: './newman-results.json' }
            }
        }, (err, summary) => {
            if (err || summary.run.failures.length) {
                reject(err || new Error(`${summary.run.failures.length} tests failed`));
            } else {
                resolve(summary);
            }
        });
    });
}

runTests()
    .then(() => {
        console.log('✅ Newman tests passed');
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Newman tests failed:', err);
        process.exit(1);
    });
```

---

## Test Data Management

### Strategy 1: Test Fixtures

```typescript
// src/test/fixtures/messages.ts
export const messageFixtures = {
    valid: [
        { name: 'Alice Johnson', message: 'First test message', priority: 1 },
        { name: 'Bob Smith', message: 'Second test message', priority: 2 },
        { name: 'Charlie Brown', message: 'Third test message', priority: 3 }
    ],

    invalid: [
        { name: '', message: 'No name', priority: 1 },
        { name: 'Valid', message: '', priority: 1 },
        { name: 'Valid', message: 'Valid', priority: 4 }
    ],

    edge: [
        { name: 'A'.repeat(100), message: 'Max length name', priority: 1 },
        { name: 'Special', message: '<script>alert("xss")</script>', priority: 2 }
    ]
};
```

### Strategy 2: Factory Pattern

```typescript
// src/test/factories/messageFactory.ts
import { Pool } from 'pg';

export class MessageFactory {
    private counter = 0;

    constructor(private pool: Pool) {}

    async create(overrides: Partial<{ name: string; message: string; priority: number }> = {}) {
        this.counter++;

        const data = {
            name: overrides.name || `TestUser${this.counter}`,
            message: overrides.message || `Test message ${this.counter}`,
            priority: overrides.priority || 1
        };

        const result = await this.pool.query(
            'INSERT INTO messages (name, message, priority) VALUES ($1, $2, $3) RETURNING *',
            [data.name, data.message, data.priority]
        );

        return result.rows[0];
    }

    async createMany(count: number, overrides = {}) {
        return Promise.all(
            Array.from({ length: count }, () => this.create(overrides))
        );
    }
}

// Usage:
// const factory = new MessageFactory(pool);
// const msg = await factory.create({ priority: 3 });
// const msgs = await factory.createMany(10);
```

### Strategy 3: Faker.js for Realistic Data

```bash
npm install @faker-js/faker --save-dev
```

```typescript
// src/test/factories/realisticDataFactory.ts
import { faker } from '@faker-js/faker';
import { Pool } from 'pg';

export const createRealisticMessage = async (pool: Pool) => {
    const result = await pool.query(
        'INSERT INTO messages (name, message, priority) VALUES ($1, $2, $3) RETURNING *',
        [
            faker.person.fullName(),
            faker.lorem.paragraph(),
            faker.number.int({ min: 1, max: 3 })
        ]
    );

    return result.rows[0];
};

export const seedRealisticData = async (pool: Pool, count: number) => {
    return Promise.all(
        Array.from({ length: count }, () => createRealisticMessage(pool))
    );
};
```

---

## Implementation Roadmap

### Phase 1: Quick Wins (Week 1)

**Goal:** Get basic testing infrastructure running

- [ ] Install pg-mem: `npm install pg-mem --save-dev`
- [ ] Create `src/test/helpers/pgMemSetup.ts`
- [ ] Add `setPool()` and `resetPool()` to `src/core/utilities/database.ts`
- [ ] Update `src/test/setup.ts` with pg-mem integration
- [ ] Write first controller test with pg-mem
- [ ] Verify tests pass in CI/CD

**Success Criteria:**
- At least 5 controller tests passing with pg-mem
- Tests complete in < 5 seconds
- Tests pass in CI/CD without Docker

### Phase 2: Test Coverage (Week 2)

**Goal:** Expand test coverage across all endpoints

- [ ] Create test fixtures in `src/test/fixtures/`
- [ ] Implement MessageFactory for test data
- [ ] Write tests for all message endpoints
- [ ] Write tests for API key endpoints
- [ ] Add error case testing
- [ ] Achieve 70% code coverage

**Success Criteria:**
- All 7 message endpoints have tests
- Both public and protected routes tested
- Error paths validated

### Phase 3: Integration Tests (Week 3)

**Goal:** Add Docker-based integration testing

- [ ] Create `docker-compose.test.yml`
- [ ] Create `.env.test`
- [ ] Write `scripts/test-integration.sh`
- [ ] Install Testcontainers: `npm install @testcontainers/postgresql --save-dev`
- [ ] Create `src/test/helpers/testcontainersSetup.ts`
- [ ] Write E2E tests with SuperTest
- [ ] Add to CI/CD pipeline

**Success Criteria:**
- Integration tests pass with real PostgreSQL
- E2E workflow tests complete successfully
- CI/CD runs integration tests on PRs

### Phase 4: Newman Automation (Week 4)

**Goal:** Automate Postman collection testing

- [ ] Create test environment file for Postman
- [ ] Write `scripts/newman-test.sh`
- [ ] Implement database reset script
- [ ] Add pre-request scripts for data isolation
- [ ] Add cleanup scripts
- [ ] Integrate into CI/CD

**Success Criteria:**
- Newman tests run automatically
- 68/68 assertions pass consistently
- Tests clean up after themselves

---

## Comparison Matrix

| Feature | pg-mem | Testcontainers | Docker Compose | Jest Mocks |
|---------|--------|----------------|----------------|------------|
| **Speed** | ⚡⚡⚡ <1s | 🐢 20-60s | 🐢 10-30s | ⚡⚡⚡ <0.1s |
| **Accuracy** | ⚠️ 90% | ✅ 100% | ✅ 100% | ❌ 50% |
| **Setup Complexity** | ✅ Easy | ⚠️ Medium | ✅ Easy | ✅ Easy |
| **Docker Required** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| **CI/CD Cost** | 💰 Free | 💰💰💰 High | 💰💰 Medium | 💰 Free |
| **Parallel Execution** | ✅ Yes | ✅ Yes | ⚠️ Limited | ✅ Yes |
| **SQL Validation** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No |
| **Extension Support** | ❌ No | ✅ Yes | ✅ Yes | ❌ No |
| **State Management** | ⚡ Instant | 🐢 Slow | 🐢 Slow | ⚡ Instant |
| **Best For** | Unit Tests | E2E Tests | Newman Tests | Logic Tests |

### Recommendation Summary

**Recommended Stack for This Project:**

1. **Unit Tests (70%):** Use **pg-mem**
   - Fast, reliable, no Docker needed
   - Perfect for TDD workflow
   - Great CI/CD performance

2. **Integration Tests (20%):** Use **Testcontainers**
   - Real PostgreSQL validation
   - Automatic cleanup
   - Run on PRs before merge

3. **Newman Tests (10%):** Use **Docker Compose**
   - Persistent test environment
   - Easy debugging
   - Matches production setup

**Expected Performance:**
- Unit test suite: < 5 seconds (100+ tests)
- Integration test suite: 30-60 seconds (20+ tests)
- Newman test suite: 30 seconds (33 requests)
- Total CI/CD time: < 2 minutes

---

## Additional Resources

### Documentation
- [pg-mem GitHub](https://github.com/oguimbal/pg-mem)
- [Testcontainers Node.js](https://node.testcontainers.org/modules/postgresql/)
- [Newman Documentation](https://learning.postman.com/docs/collections/using-newman-cli/)
- [Jest Testing Best Practices](https://jestjs.io/docs/setup-teardown)

### Related Files in This Project
- Database pool: `src/core/utilities/database.ts`
- Test setup: `src/test/setup.ts`
- Database schema: `data/init.sql`
- Postman collection: `testing/postman/TCSS-460-Message-API-Complete.postman_collection.json`

---

**Last Updated:** 2025-10-11
**Status:** Ready for Implementation
**Next Steps:** See Phase 1 in Implementation Roadmap
