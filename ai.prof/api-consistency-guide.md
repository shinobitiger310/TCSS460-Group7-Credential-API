# API Consistency Guide - Creating the Authentication API (API #3)

**Created:** 2025-10-11
**Purpose:** Documentation plan for maintaining consistency across TCSS 460 API examples
**Target:** Authentication API (3rd API Example)
**Source API:** Message API (2nd API Example)

---

## Overview

This guide documents the patterns, conventions, and decisions made in the **Message API** (API #2) to ensure the **Authentication API** (API #3) maintains consistency in design, structure, and educational approach.

### Three API Progression

1. **API #1 (Basic):** Simple Express API, foundational concepts
2. **API #2 (Message API):** This project - CRUD operations, validation, auth, testing
3. **API #3 (Auth API):** Advanced authentication patterns - OAuth, JWT, sessions, etc.

---

## Documentation Structure to Transfer

### Core Documents to Move/Adapt

#### From `docs-2.0/` (Educational Guides - Keep These)
These are concept-based and can be reused across all APIs:

✅ **Keep and reuse in Auth API:**
- `async-javascript-nodejs.md` - Async patterns
- `client-server-architecture.md` - Architecture fundamentals
- `database-fundamentals.md` - PostgreSQL concepts
- `http-fundamentals.md` - HTTP basics
- `http-history-evolution.md` - HTTP evolution
- `http-methods.md` - REST methods
- `http-status-codes.md` - Status code guide
- `import-export-patterns.md` - ES6 modules
- `json-fundamentals.md` - JSON concepts
- `request-response-model.md` - Request/response cycle
- `typescript-patterns.md` - TypeScript best practices

⚠️ **Adapt for Auth API:**
- `authentication-guide.md` - Expand with JWT, OAuth, sessions
- `error-handling-patterns.md` - Add auth-specific errors
- `testing-strategies.md` - Add auth testing patterns
- `validation-strategies.md` - Add credential validation
- `web-security-guide.md` - Expand security concepts

📝 **Create new for Auth API:**
- `jwt-fundamentals.md` - JWT structure and usage
- `oauth-flow-guide.md` - OAuth 2.0 patterns
- `session-management.md` - Session vs token auth
- `password-security.md` - Hashing, salting, bcrypt
- `refresh-token-patterns.md` - Token refresh strategies
- `auth-middleware-patterns.md` - Advanced middleware

#### From `ai.prof/` (Implementation Guides)
- `instructions.md` - AI development guidelines (project-specific)
- `database-mocking-strategies.md` - Testing approaches (reusable)

---

## README.md Header Pattern

**Standard course header for all API examples:**

```markdown
# TCSS 460 {API Name}

> **University of Washington Tacoma**
>
> **School of Engineering and Technology**
>
> **Computer Science and Systems**
>
> **TCSS 460 A - Client/Server Programming for Internet Applications**
>
> **Autumn 2025**
>
> **Instructor:** Professor Charles Bryan
>
> **Email:** cfb3@uw.edu

{Brief description of the API}
```

**Example from Message API:**
```markdown
# TCSS 460 Message API

> **University of Washington Tacoma**
>
> **School of Engineering and Technology**
>
> **Computer Science and Systems**
>
> **TCSS 460 A - Client/Server Programming for Internet Applications**
>
> **Autumn 2025**
>
> **Instructor:** Professor Charles Bryan
>
> **Email:** cfb3@uw.edu

A production-ready RESTful API for managing message entries with priority levels
and API key authentication. Built with Node.js, Express, TypeScript, and PostgreSQL
following professional best practices and educational clarity for senior-level
computer science coursework.
```

**For Auth API, it would be:**
```markdown
# TCSS 460 Authentication API

> **University of Washington Tacoma**
>
> **School of Engineering and Technology**
>
> **Computer Science and Systems**
>
> **TCSS 460 A - Client/Server Programming for Internet Applications**
>
> **Autumn 2025**
>
> **Instructor:** Professor Charles Bryan
>
> **Email:** cfb3@uw.edu

A production-ready authentication and authorization API demonstrating JWT tokens,
OAuth 2.0 flows, session management, and role-based access control. Built with
Node.js, Express, TypeScript, and PostgreSQL following professional best practices
and educational clarity for senior-level computer science coursework.
```

**Key Points:**
- Always use blockquote format (`>`) for institutional header
- Include all lines: University, School, Department, Course, Term, Instructor, Email
- Keep formatting consistent with blank lines between sections
- Update term/year as appropriate (Autumn 2025, Winter 2026, etc.)

---

## Documents to Create for Auth API

### 1. API Implementation Standards Document
**File:** `ai.prof/implementation-standards.md`

**Contents:**
- Project structure conventions
- File naming patterns
- TypeScript configuration standards
- Error code format
- Response structure patterns
- Validation middleware patterns
- Database schema conventions
- Environment variable naming
- Testing structure

### 2. API Design Patterns Document
**File:** `ai.prof/design-patterns.md`

**Contents:**
- Controller pattern (how we structure controllers)
- Middleware chain patterns
- Route organization (open vs closed)
- Barrel export pattern
- Dependency injection pattern (database pool)
- Factory pattern (for test data)
- Repository pattern (if using)
- Error handling strategy

### 3. Code Style Guide
**File:** `ai.prof/code-style-guide.md`

**Contents:**
- Naming conventions (variables, functions, types)
- JSDoc comment standards
- Function structure patterns
- Import organization
- Type definition location
- Async/await patterns
- Error throwing vs returning

### 4. Architecture Decision Records (ADRs)
**File:** `ai.prof/architecture-decisions.md`

**Contents:**
- Why PostgreSQL over MongoDB
- Why name as natural key
- Why TypeScript
- Why Express over alternatives
- Why separate open/closed routes
- Why pg over ORMs
- Why express-validator
- Response structure decisions

### 5. Testing Standards Document
**File:** `ai.prof/testing-standards.md`

**Contents:**
- Test file naming conventions
- Postman collection structure
- Newman automation patterns
- Test data management
- Fixture patterns
- Factory patterns
- Database mocking approach
- Assertion patterns

### 6. API Evolution Guide
**File:** `ai.prof/api-evolution-from-message-to-auth.md`

**Contents:**
- What to keep from Message API
- What to change for Auth API
- New concepts introduced
- Removed concepts (if any)
- Migration path for students
- Learning progression

---

## Patterns and Conventions Established

### 1. Project Structure Pattern

```
api-name/
├── src/
│   ├── index.ts                    # Server lifecycle
│   ├── app.ts                      # Express config
│   ├── types/                      # All TypeScript types
│   │   ├── {domain}Types.ts       # Domain-specific types
│   │   ├── apiTypes.ts            # API response types
│   │   ├── errorTypes.ts          # Error definitions
│   │   └── index.ts               # Barrel export
│   ├── controllers/                # Business logic
│   │   ├── {domain}Controller.ts  # One per domain
│   │   └── index.ts               # Barrel export
│   ├── routes/                     # Express routes
│   │   ├── index.ts               # Main router
│   │   ├── open/                  # Public routes
│   │   └── closed/                # Protected routes
│   ├── core/
│   │   ├── middleware/            # Express middleware
│   │   │   ├── {domain}Validation.ts
│   │   │   ├── {domain}Auth.ts
│   │   │   └── index.ts
│   │   └── utilities/             # Helper functions
│   │       ├── database.ts        # DB connection
│   │       ├── envConfig.ts       # Environment
│   │       ├── responseUtils.ts   # Response helpers
│   │       └── validationUtils.ts # Validation helpers
│   └── test/                      # Test setup
├── data/
│   └── init.sql                   # Schema initialization
├── docs/
│   └── swagger.yaml               # OpenAPI spec
├── testing/
│   └── postman/                   # Postman collections
├── ai.prof/                       # Implementation guides
├── docker-compose.yml             # Database container
└── README.md                      # Complete documentation
```

### 2. Response Structure Pattern

**Success Response:**
```typescript
{
  success: true,
  message: string,
  data: T,
  timestamp: string
}
```

**Error Response:**
```typescript
{
  success: false,
  message: string,
  errorCode: string,
  timestamp: string
}
```

### 3. Error Code Convention

Format: `{DOMAIN}_{DESCRIPTION}`

Examples:
- `MSG_NAME_EXISTS` - Message domain, name exists
- `MSG_NOT_FOUND` - Message not found
- `MSG_NO_PRIORITY_FOUND` - No messages with priority
- `SRVR_INTERNAL_ERROR` - Server error
- `VAL_INVALID_INPUT` - Validation error

**For Auth API:**
- `AUTH_INVALID_CREDENTIALS`
- `AUTH_TOKEN_EXPIRED`
- `AUTH_REFRESH_REQUIRED`
- `USER_NOT_FOUND`
- `USER_ALREADY_EXISTS`

### 4. Validation Pattern

**Structure:**
```typescript
// middleware/{domain}Validation.ts
export const validate{Action} = [
  body('field').validation().withMessage('User-friendly message'),
  // ... more validations
];

// routes/open/index.ts
router.post('/endpoint', validate{Action}, controller{Action});
```

### 5. Controller Pattern

**Structure:**
```typescript
/**
 * JSDoc with description
 * @param request - Express request
 * @param response - Express response
 * @returns Promise<void>
 */
export const controllerFunction = async (
  request: Request,
  response: Response
): Promise<void> => {
  try {
    // 1. Extract data
    const { field } = request.body;

    // 2. Get database pool
    const pool = getPool();

    // 3. Business logic with database
    const result = await pool.query(/* ... */);

    // 4. Send success response
    sendSuccess(response, data, message, statusCode);
  } catch (error) {
    // 5. Log and send error
    console.error('Error context:', error);
    sendError(response, 500, message, errorCode);
  }
};
```

### 6. TypeScript Type Organization

**Pattern:**
```typescript
// {domain}Types.ts

// Request payload type
export interface {Domain}Request {
  // Fields from client
}

// Internal data type
export interface {Domain}Object {
  // Core business fields
}

// API response type
export interface {Domain}Entry extends {Domain}Object {
  // Additional computed/formatted fields
}

// Database record type
export interface {Domain}Record extends {Domain}Object {
  // Database-specific fields (id, timestamps)
}
```

### 7. Database Connection Pattern

```typescript
// utilities/database.ts
let pool: Pool | null = null;

export const connectToDatabase = async (): Promise<void> => { /* ... */ };
export const disconnectFromDatabase = async (): Promise<void> => { /* ... */ };
export const getPool = (): Pool => { /* ... */ };

// For testing:
export const setPool = (mockPool: Pool): void => { /* ... */ };
export const resetPool = (): void => { /* ... */ };
```

### 8. Environment Configuration Pattern

```typescript
// utilities/envConfig.ts
export const getEnvVar = (
  key: string,
  defaultValue?: string
): string => {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

// Usage:
const dbHost = getEnvVar('DB_HOST', 'localhost');
```

### 9. Route Organization Pattern

**Open Routes (Public):**
```typescript
// routes/open/index.ts
import express from 'express';
const router = express.Router();

router.post('/resource', validation, controller);
router.get('/resource', validation, controller);
// etc.

export default router;
```

**Closed Routes (Protected):**
```typescript
// routes/closed/index.ts
import express from 'express';
import { authenticateApiKey } from '@middleware/apiKeyAuth';
const router = express.Router();

router.use(authenticateApiKey); // Apply to all routes

router.post('/resource', validation, controller);
// etc.

export default router;
```

### 10. Swagger/OpenAPI Pattern

**Structure:**
```yaml
openapi: 3.0.0
info:
  title: API Name
  version: 1.0.0
  description: Description

paths:
  /endpoint:
    get:
      summary: Brief description
      description: Detailed description
      parameters: [...]
      responses:
        200:
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuccessResponse'
        400:
          description: Error
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  schemas:
    {Domain}Entry:
      type: object
      properties:
        field: { type: string }

    SuccessResponse:
      type: object
      properties:
        success: { type: boolean }
        message: { type: string }
        data: { type: object }
        timestamp: { type: string }
```

### 11. Postman Collection Pattern

**Structure:**
- Collection-level variables
- Collection-level pre-request scripts
- Folders organized by feature
- Tests for each request
- Cleanup scripts

**Naming Convention:**
- Collection: `{API-Name}-Complete.postman_collection.json`
- Requests: `{Action} {Resource} [- {Scenario}]`
  - Example: `Create Message`
  - Example: `Create Message - Duplicate Name (Error)`

### 12. Testing Pattern

**File naming:**
- Unit tests: `{module}.test.ts`
- Integration tests: `{module}.integration.test.ts`

**Test structure:**
```typescript
describe('{Module} ({TestType})', () => {
  beforeAll(async () => {
    // Setup (once)
  });

  afterAll(async () => {
    // Cleanup (once)
  });

  beforeEach(() => {
    // Reset state
  });

  it('should {behavior} when {condition}', async () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### 13. Database Testing Strategy

**Reference Document:** `ai.prof/database-mocking-strategies.md`

**Comprehensive guide covering:**
- ✅ Four mocking options with trade-offs
- ✅ pg-mem (in-memory PostgreSQL) - Recommended for unit tests
- ✅ Testcontainers (real PostgreSQL in Docker) - For E2E tests
- ✅ Docker Compose test environments - For Newman/Postman
- ✅ Jest mocks - For pure logic testing
- ✅ Complete implementation examples
- ✅ Test fixture and seeding strategies
- ✅ Performance comparisons
- ✅ 4-phase implementation roadmap

**Testing Pyramid Pattern:**
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

**Recommended Approach (from database-mocking-strategies.md):**
1. **Unit Tests (70%):** Use pg-mem for fast execution
   - No Docker required
   - Instant state resets
   - Real SQL validation
   - Perfect for TDD

2. **Integration Tests (20%):** Use pg-mem or Testcontainers
   - Test with real PostgreSQL features
   - Validate migrations
   - Test concurrent operations

3. **E2E Tests (10%):** Use Testcontainers
   - Production-like environment
   - Full database validation
   - Pre-deployment verification

4. **Postman/Newman Tests:** Use Docker Compose
   - Shared test database
   - Easy debugging
   - Automated cleanup

**Key Implementation Patterns (detailed in mocking guide):**

**pg-mem Setup:**
```typescript
// src/test/helpers/pgMemSetup.ts
import { newDb } from 'pg-mem';
import { Pool } from 'pg';

export const createMockDatabase = async () => {
    const db = newDb();
    const { Pool: MockPool } = db.adapters.createPg();
    const pool = new MockPool() as unknown as Pool;

    // Load schema from init.sql
    db.public.none(initSql);

    // Create restore point
    const backup = db.backup();

    return {
        db,
        pool,
        backup,
        reset: () => backup.restore()
    };
};
```

**Dependency Injection for Testing:**
```typescript
// utilities/database.ts
export const setPool = (mockPool: Pool): void => {
    pool = mockPool;
};

export const resetPool = (): void => {
    pool = null;
};
```

**Test Fixtures Pattern:**
```typescript
// test/fixtures/messages.ts
export const messageFixtures = {
    valid: [
        { name: 'Test User', message: 'Test', priority: 1 }
    ],
    invalid: [
        { name: '', message: 'No name', priority: 1 }
    ]
};
```

**Factory Pattern:**
```typescript
// test/factories/messageFactory.ts
export class MessageFactory {
    async create(overrides = {}) {
        // Generate test data with overrides
    }

    async createMany(count: number) {
        // Bulk create test data
    }
}
```

**Important:** The `database-mocking-strategies.md` document is **35KB of comprehensive testing guidance** and should be:
- ✅ Transferred to Auth API
- ✅ Referenced in testing documentation
- ✅ Used as implementation guide
- ✅ Adapted for auth-specific test cases (user creation, token validation, etc.)

**Auth API Testing Additions:**
- Test password hashing with real bcrypt
- Test JWT signing and verification
- Test session creation and validation
- Test token expiration scenarios
- Test refresh token flows
- Test OAuth callback handling
- Mock external OAuth providers

---

## Naming Conventions

### Files and Directories
- **Files:** camelCase - `messageController.ts`
- **Directories:** kebab-case - `message-validation/`
- **Types:** PascalCase - `MessageEntry`
- **Interfaces:** PascalCase - `IMessageService` (if using interface prefix)

### Variables and Functions
- **Variables:** camelCase - `messageData`
- **Constants:** UPPER_SNAKE_CASE - `MAX_RETRIES`
- **Functions:** camelCase - `createMessage`
- **Private functions:** `_privateHelper` (underscore prefix)
- **Async functions:** async/await preferred over promises

### Database
- **Tables:** snake_case - `api_keys`, `messages`
- **Columns:** snake_case - `created_at`, `is_active`
- **Indexes:** `idx_{table}_{column}` - `idx_messages_priority`

### TypeScript Types
- **Interfaces:** PascalCase - `MessageRequest`
- **Types:** PascalCase - `ErrorCode`
- **Enums:** PascalCase - `Priority`
- **Type files:** `{domain}Types.ts`

---

## Educational Documentation Pattern

### Document Structure
```markdown
# {Concept Name}

**Prerequisites:** {List concepts students should know}
**Learning Objectives:** {What students will learn}
**Difficulty:** {Beginner/Intermediate/Advanced}

## Table of Contents
- [Introduction](#introduction)
- [Core Concepts](#core-concepts)
- [Implementation](#implementation)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)
- [Exercises](#exercises)

## Introduction
{Brief overview with real-world context}

## Core Concepts
{Fundamental concepts with diagrams}

## Implementation
{Code examples with explanations}

## Best Practices
{Industry standards and conventions}

## Common Pitfalls
{Mistakes to avoid with examples}

## Exercises
{Hands-on practice problems}

## Additional Resources
{Links to further reading}
```

### Code Example Pattern
```markdown
### Example: {Description}

**Scenario:** {Real-world use case}

```typescript
// Step 1: {Explanation}
const example = {
  // Inline comments for clarity
};

// Step 2: {Explanation}
const result = await doSomething(example);

// Step 3: {Explanation}
return result;
```

**Explanation:**
{Detailed walkthrough of what the code does and why}

**Key Points:**
- {Important concept 1}
- {Important concept 2}
```

---

## Commits and Git Workflow

### Commit Message Convention

**Format:**
```
{type}: {short description}

{detailed description}

{breaking changes if any}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Types:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

**Examples from Message API:**
```
feat: add API key authentication system with comprehensive documentation
test: update Postman collection for consistent MessageEntry responses
docs: update README to reflect complete API implementation
```

### Branch Naming
- Feature branches: `feature/{description}`
- Bug fixes: `fix/{description}`
- Documentation: `docs/{description}`

---

## API-Specific Configurations

### Package.json Scripts Pattern

**Standard scripts:**
```json
{
  "scripts": {
    "dev": "ts-node -r tsconfig-paths/register src/index.ts",
    "local": "nodemon --exec ts-node -r tsconfig-paths/register src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "typecheck": "tsc --noEmit",
    "typecheck:watch": "tsc --noEmit --watch",
    "docker:up": "docker-compose up -d",
    "docker:down": "docker-compose down -v"
  }
}
```

### TypeScript Configuration Pattern

**Key settings:**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "baseUrl": "./",
    "paths": {
      "@/*": ["src/*"],
      "@utilities/*": ["src/core/utilities/*"],
      "@db": ["src/core/utilities/database"]
    }
  }
}
```

### Docker Compose Pattern

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: {api-name}-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
      POSTGRES_DB: {db_name}
    ports:
      - "5433:5432"
    volumes:
      - ./data/init.sql:/docker-entrypoint-initdb.d/init.sql
      - postgres-data:/var/lib/postgresql/data

volumes:
  postgres-data:
```

---

## Security Patterns Established

### 1. Password/Secret Hashing
```typescript
import crypto from 'crypto';

export const hashSecret = (secret: string): string => {
  return crypto.createHash('sha256').update(secret).digest('hex');
};

export const verifySecret = (secret: string, hash: string): boolean => {
  const computedHash = hashSecret(secret);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash),
    Buffer.from(hash)
  );
};
```

### 2. SQL Injection Prevention
```typescript
// ✅ Always use parameterized queries
const result = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
);

// ❌ Never string concatenation
const result = await pool.query(
  `SELECT * FROM users WHERE email = '${email}'`
);
```

### 3. Input Validation
```typescript
// Always validate before processing
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
```

---

## What to Adapt for Auth API

### Changes to Make

**1. Domain Terminology**
- Replace "message" with "user", "auth", "session", etc.
- Update error codes: `AUTH_*`, `USER_*`, `TOKEN_*`
- Update type names: `UserRequest`, `AuthEntry`, `TokenRecord`

**2. New Controllers**
- `authController.ts` - Login, logout, register
- `userController.ts` - User CRUD operations
- `sessionController.ts` - Session management
- `tokenController.ts` - Token operations

**3. New Middleware**
- `jwtAuth.ts` - JWT validation
- `sessionAuth.ts` - Session validation
- `passwordValidation.ts` - Password strength rules
- `rateLimiting.ts` - Rate limiting for auth endpoints

**4. New Utilities**
- `jwtUtils.ts` - JWT creation/validation
- `passwordUtils.ts` - Bcrypt hashing
- `tokenUtils.ts` - Token generation
- `sessionUtils.ts` - Session management

**5. Database Schema**
- `users` table instead of `messages`
- `sessions` table
- `refresh_tokens` table
- `password_resets` table

### What to Keep Exactly the Same

✅ **Keep identical:**
- Response structure pattern
- Error response format
- Project structure
- File organization
- TypeScript path mapping
- Environment configuration pattern
- Docker setup pattern
- Testing structure
- Documentation pattern
- Git workflow
- Commit conventions

---

## Implementation Checklist for Auth API

### Phase 1: Setup
- [ ] Copy project structure
- [ ] Update package.json name and description
- [ ] Update README.md header
- [ ] Set up database schema for auth
- [ ] Configure environment variables

### Phase 2: Core Implementation
- [ ] Implement user registration
- [ ] Implement login with JWT
- [ ] Implement logout
- [ ] Implement token refresh
- [ ] Implement password reset flow

### Phase 3: Documentation
- [ ] Move educational docs from Message API
- [ ] Create auth-specific educational docs
- [ ] Update swagger.yaml for auth endpoints
- [ ] Create comprehensive README
- [ ] Document all endpoints

### Phase 4: Testing
- [ ] Create Postman collection
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Verify all patterns match Message API

### Phase 5: Polish
- [ ] Code review against this guide
- [ ] Verify all naming conventions
- [ ] Check error code consistency
- [ ] Verify response structures
- [ ] Test complete user workflows

---

## Cross-Reference Table

| Message API Concept | Auth API Equivalent | Notes |
|---------------------|---------------------|-------|
| `messages` table | `users` table | Core resource |
| `api_keys` table | `sessions` table | Authentication |
| `MessageEntry` | `UserEntry` | Response type |
| `MSG_*` errors | `AUTH_*`, `USER_*` errors | Error codes |
| Priority filtering | Role-based filtering | Access control |
| Name uniqueness | Email uniqueness | Natural key |
| `messageController` | `authController` | Main controller |
| API key validation | JWT validation | Auth middleware |

---

## Summary

This guide ensures the Auth API maintains consistency with the Message API while introducing new authentication concepts. Key principles:

1. **Structure consistency** - Same project layout
2. **Pattern consistency** - Same coding patterns
3. **Convention consistency** - Same naming and formatting
4. **Documentation consistency** - Same doc structure
5. **Testing consistency** - Same testing approach

The goal is for students to recognize familiar patterns while learning new authentication concepts.

---

**Next Steps:**
1. Review this guide
2. Create the specific implementation documents listed
3. Begin Auth API implementation following these patterns
4. Validate against this guide throughout development

**Last Updated:** 2025-10-11
**Status:** Complete - Ready for Auth API implementation
