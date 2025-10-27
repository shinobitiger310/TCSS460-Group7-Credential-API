# TypeScript Patterns

A comprehensive guide to TypeScript patterns and best practices for web application development.

> **💡 Related Code**: See implementations throughout the codebase, especially [`/src/core/models/`](../src/core/models/), [`/src/core/utilities/`](../src/core/utilities/), and [`/src/controllers/`](../src/controllers/)

## Quick Navigation
- 👤 **User Models**: [`models/index.ts`](../src/core/models/index.ts) - User and authentication type definitions
- 🔧 **Response Utilities**: [`responseUtils.ts`](../src/core/utilities/responseUtils.ts) - Type-safe API responses
- ⚠️ **Error Codes**: [`errorCodes.ts`](../src/core/utilities/errorCodes.ts) - Standardized error codes
- 🎯 **Controller Usage**: [`authController.ts`](../src/controllers/authController.ts) - Type usage in authentication
- 🏗️ **Architecture**: [Node.js Architecture](./node-express-architecture.md#mvc-architecture-pattern) - TypeScript in MVC pattern
- 📝 **API Patterns**: [API Design Patterns](./api-design-patterns.md#response-formatting) - Type-safe API responses
- ⚙️ **Development Workflow**: [Development Workflow](./development-workflow.md#typescript-compilation-fundamentals) - TypeScript compilation process

## Table of Contents

- [TypeScript Fundamentals](#typescript-fundamentals)
- [Interface Design](#interface-design)
- [Generic Types](#generic-types)
- [Type Safety Patterns](#type-safety-patterns)
- [Error Handling with Types](#error-handling-with-types)
- [Advanced Patterns](#advanced-patterns)

---

## TypeScript Fundamentals

### Why TypeScript?

TypeScript adds static type checking to JavaScript, helping catch errors at compile time rather than runtime.

#### ✅ **Benefits:**
- **Catch errors early** during development
- **Better IDE support** with autocomplete and refactoring
- **Self-documenting code** through type annotations
- **Easier refactoring** with confidence
- **Better team collaboration** with clear interfaces

#### **TypeScript in Our Project:**
```typescript
// Type-safe function signatures
export const register = async (request: IJwtRequest, response: Response): Promise<void> => {
  const { firstname, lastname, email, password, username, phone }: IRegisterRequest = request.body;
  // TypeScript ensures these fields exist and are the right type
};
```

**📚 Validation & Security:**
- [Validation Strategies](/docs/validation-strategies.md) - Type-safe validation patterns
- [Web Security Guide](/docs/web-security-guide.md) - Security considerations for type handling

### Basic Type Annotations

```typescript
// Primitive types
const name: string = "John Doe";
const age: number = 25;
const isActive: boolean = true;

// Array types
const priorities: number[] = [1, 2, 3];
const messages: string[] = ["Hello", "World"];

// Object types
const user: { name: string; age: number } = {
  name: "John",
  age: 25
};

// Function types
const validator = (input: string): boolean => {
  return input.length > 0;
};
```

---

## Interface Design

### Interface Hierarchy in Our Project

```typescript
// Base interface for user authentication
export interface IAuthRequest {
  email: string;
  password: string;
}

// Registration request extends auth with additional fields
export interface IRegisterRequest {
  firstname: string;
  lastname: string;
  email: string;
  password: string;
  username: string;
  phone: string;
  role?: UserRole; // Optional - admin use only
}

// Full user model from database with all metadata
export interface IUser {
  account_id: number;
  firstname: string;
  lastname: string;
  username: string;
  email: string;
  phone: string;
  account_role: UserRole;
  email_verified: boolean;
  phone_verified: boolean;
  account_status: 'pending' | 'active' | 'suspended' | 'locked';
  created_at?: Date;
  updated_at?: Date;
}

// JWT claims for token payload
export interface IJwtClaims {
  id: number;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
```

### Interface Design Principles

#### **1. Single Responsibility**
Each interface should represent one clear concept.

```typescript
// ✅ GOOD: Focused interfaces
interface User {
  id: number;
  username: string;
  email: string;
}

interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
}

// ❌ BAD: Mixed concerns
interface UserEverything {
  id: number;
  username: string;
  email: string;
  theme: 'light' | 'dark';
  notifications: boolean;
  language: string;
  lastLoginDate: Date;
  profilePicture: Buffer;
  // Too many unrelated fields
}
```

#### **2. Composition Over Large Interfaces**

```typescript
// ✅ GOOD: Composable interfaces
interface UserBasic {
  id: number;
  username: string;
  email: string;
}

interface UserProfile extends UserBasic {
  firstName: string;
  lastName: string;
  bio?: string;
}

interface UserWithPreferences extends UserBasic {
  preferences: UserPreferences;
}

// Use composition for different contexts
type FullUser = UserProfile & UserWithPreferences;
```

#### **3. Optional vs Required Properties**

```typescript
// Clear distinction between required and optional
interface CreateUserRequest {
  username: string;        // Required
  email: string;          // Required
  password: string;       // Required
  firstName?: string;     // Optional
  lastName?: string;      // Optional
}

interface UpdateUserRequest {
  username?: string;      // All optional for partial updates
  email?: string;
  firstName?: string;
  lastName?: string;
}
```

### Interface Documentation

```typescript
/**
 * Request payload for user registration
 * Used by POST /auth/register endpoint validation and processing
 * All fields are required and validated by express-validator middleware
 *
 * @interface IRegisterRequest
 * @example
 * const newUser: IRegisterRequest = {
 *   firstname: "John",
 *   lastname: "Doe",
 *   email: "john.doe@example.com",
 *   password: "SecureP@ss123",
 *   username: "johndoe",
 *   phone: "1234567890"
 * };
 */
export interface IRegisterRequest {
  /** User's first name (required, non-empty) */
  firstname: string;
  /** User's last name (required, non-empty) */
  lastname: string;
  /** User's email address (validated for format and uniqueness) */
  email: string;
  /** User's password (validated for strength requirements) */
  password: string;
  /** Unique username (validated for uniqueness) */
  username: string;
  /** User's phone number (validated for format) */
  phone: string;
  /** Optional role assignment (admin-only, defaults to USER) */
  role?: UserRole;
}
```

---

## Generic Types

### Generic Interfaces

```typescript
// Generic response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
  errors?: any[];
}

// Usage with specific types
const authResponse: ApiResponse<{ accessToken: string; user: Partial<IUser> }> = {
  success: true,
  data: {
    accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    user: {
      account_id: 1,
      email: "john.doe@example.com",
      username: "johndoe",
      account_role: UserRole.USER
    }
  }
};

const userListResponse: ApiResponse<IUser[]> = {
  success: true,
  data: [user1, user2, user3]
};
```

### Generic Functions

```typescript
// Generic transaction result
export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

// Generic transaction utility
export const withTransaction = async <T>(
  operation: (client: PoolClient) => Promise<T>
): Promise<TransactionResult<T>> => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');

    return { success: true, data: result };
  } catch (error) {
    await client.query('ROLLBACK');
    return { success: false, error: error as Error };
  } finally {
    client.release();
  }
};

// Type-safe usage
const result = await withTransaction<IUser>(async (client) => {
  const queryResult = await client.query('INSERT INTO Account...');
  return queryResult.rows[0]; // TypeScript knows this returns IUser
});

if (result.success) {
  console.log(result.data.account_id); // TypeScript knows data is IUser
}
```

### Generic Response Utilities

```typescript
// Generic response function with type safety
export const sendSuccess = <T>(
  response: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): void => {
  const responseBody: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data })
  };

  response.status(statusCode).json(responseBody);
};

// Usage ensures type safety
sendSuccess<IUser>(response, userProfile, "User created successfully");
// TypeScript ensures userProfile matches IUser interface
```

---

## Type Safety Patterns

### Union Types for Controlled Values

```typescript
// Account status as union type
type AccountStatus = 'pending' | 'active' | 'suspended' | 'locked';

// User role enumeration
enum UserRole {
  USER = 1,
  MODERATOR = 2,
  ADMIN = 3,
  SUPER_ADMIN = 4,
  OWNER = 5
}

// Environment types
type Environment = 'development' | 'test' | 'staging' | 'production';

// HTTP methods
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Usage in interfaces
interface IUser {
  account_id: number;
  username: string;
  email: string;
  account_role: UserRole;
  account_status: AccountStatus; // Only allows defined statuses
}

interface RouteConfig {
  method: HttpMethod;
  path: string;
  handler: RequestHandler;
}
```

### Discriminated Unions

```typescript
// Different types of API responses
interface SuccessResponse {
  success: true;
  data: any;
  message?: string;
}

interface ErrorResponse {
  success: false;
  message: string;
  errorCode: string;
  errors?: any[];
}

type ApiResponse = SuccessResponse | ErrorResponse;

// Type guards for discriminated unions
const isSuccessResponse = (response: ApiResponse): response is SuccessResponse => {
  return response.success === true;
};

// Usage with type narrowing
const handleResponse = (response: ApiResponse) => {
  if (isSuccessResponse(response)) {
    // TypeScript knows this is SuccessResponse
    console.log(response.data);
  } else {
    // TypeScript knows this is ErrorResponse
    console.log(response.errorCode);
  }
};
```

### Type Guards

```typescript
// Runtime type checking
export const isStringProvided = (value: any): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const isValidRole = (value: any): value is UserRole => {
  return typeof value === 'number' && [1, 2, 3, 4, 5].includes(value);
};

export const isValidAccountStatus = (value: any): value is AccountStatus => {
  return typeof value === 'string' &&
    ['pending', 'active', 'suspended', 'locked'].includes(value);
};

// Usage in validation
const validateUserInput = (input: any) => {
  if (!isStringProvided(input.email)) {
    throw new Error('Email must be a non-empty string');
  }

  if (input.role !== undefined && !isValidRole(input.role)) {
    throw new Error('Invalid user role');
  }

  // TypeScript now knows input.email is string and input.role is UserRole
  return { email: input.email, role: input.role };
};
```

### Utility Types

```typescript
// Partial for updates
type UpdateUserRequest = Partial<IRegisterRequest>;
// Result: { firstname?: string; lastname?: string; email?: string; ... }

// Pick for selecting specific fields
type UserSummary = Pick<IUser, 'account_id' | 'username' | 'email' | 'account_role'>;
// Result: { account_id: number; username: string; email: string; account_role: UserRole; }

// Omit for excluding fields (useful for API responses without sensitive data)
type PublicUser = Omit<IUser, 'created_at' | 'updated_at'>;
// Result: IUser without timestamp fields

// Required for making all fields required
type CompleteAuthRequest = Required<IAuthRequest>;
// Useful when all fields must be present

// Example usage
const updateUser = (id: number, updates: UpdateUserRequest): Promise<IUser> => {
  // Only provided fields will be updated
  return updateUserInDB(id, updates);
};
```

---

## Error Handling with Types

### Typed Error Classes

```typescript
// Base error with type information
abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

// Specific error types
export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'VALIDATION_ERROR';

  constructor(message: string, public field?: string) {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';

  constructor(resource: string, id: string | number) {
    super(`${resource} with id ${id} not found`);
  }
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}
```

### Result Pattern for Error Handling

```typescript
// Result type for operations that can fail
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

// Usage in functions
const parseInteger = (value: string): Result<number, string> => {
  const parsed = parseInt(value);

  if (isNaN(parsed)) {
    return { success: false, error: 'Invalid number format' };
  }

  return { success: true, data: parsed };
};

// Safe usage without exceptions
const handleInput = (input: string) => {
  const result = parseInteger(input);

  if (result.success) {
    console.log('Parsed number:', result.data);
  } else {
    console.log('Parse error:', result.error);
  }
};
```

### Async Error Handling

```typescript
// Async result pattern
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

const registerUserSafe = async (request: IRegisterRequest): AsyncResult<IUser> => {
  try {
    // Validation
    if (!isStringProvided(request.email)) {
      return { success: false, error: new ValidationError('Email is required') };
    }

    if (!isStringProvided(request.password)) {
      return { success: false, error: new ValidationError('Password is required') };
    }

    // Database operation
    const result = await pool.query('INSERT INTO Account...');
    return { success: true, data: result.rows[0] };

  } catch (error) {
    return { success: false, error: error as Error };
  }
};

// Usage
const result = await registerUserSafe(registerRequest);
if (result.success) {
  sendSuccess(response, result.data);
} else {
  handleError(response, result.error);
}
```

---

## Advanced Patterns

### Conditional Types

```typescript
// Conditional response types based on success
type ApiResponse<T, TSuccess extends boolean = boolean> =
  TSuccess extends true
    ? { success: true; data: T; message?: string }
    : { success: false; message: string; errorCode: string };

// Usage
type SuccessResponse<T> = ApiResponse<T, true>;
type ErrorResponse = ApiResponse<never, false>;
```

### Mapped Types

```typescript
// Make all properties nullable
type Nullable<T> = {
  [K in keyof T]: T[K] | null;
};

// Make all properties optional and nullable
type PartialNullable<T> = {
  [K in keyof T]?: T[K] | null;
};

// Usage for database updates
type UserUpdate = PartialNullable<Omit<IUser, 'account_id' | 'created_at'>>;
// Result: { firstname?: string | null; lastname?: string | null; email?: string | null; ... }
```

### Template Literal Types

```typescript
// Environment-specific configuration keys
type Environment = 'development' | 'test' | 'staging' | 'production';
type ConfigKey = `DB_${Uppercase<Environment>}_URL`;
// Result: "DB_DEVELOPMENT_URL" | "DB_TEST_URL" | "DB_STAGING_URL" | "DB_PRODUCTION_URL"

// HTTP method with path templates
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `${HttpMethod} /api/${string}`;
// Result: "GET /api/${string}" | "POST /api/${string}" | etc.
```

### Decorator Patterns

```typescript
// Method decorator for validation
const validate = (schema: any) => {
  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    const method = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const [req, res] = args;
      const { error } = schema.validate(req.body);

      if (error) {
        return sendValidationError(res, error.message);
      }

      return method.apply(this, args);
    };
  };
};

// Usage
class AuthController {
  @validate(registerSchema)
  async register(req: Request, res: Response) {
    // Request is pre-validated
    const user = await this.authService.register(req.body);
    sendSuccess(res, user);
  }
}
```

---

## Type Configuration

### tsconfig.json Best Practices

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",

    // Type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,

    // Module resolution
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,

    // Path mapping
    "baseUrl": "./src",
    "paths": {
      "@controllers/*": ["controllers/*"],
      "@controllers": ["controllers"],
      "@middleware/*": ["core/middleware/*"],
      "@middleware": ["core/middleware"],
      "@utilities/*": ["core/utilities/*"],
      "@utilities": ["core/utilities"],
      "@models/*": ["core/models/*"],
      "@models": ["core/models"],
      "@db": ["core/utilities/database"],
      "@/types": ["types"],
      "@/types/*": ["types/*"]
    },

    // Additional checks
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "**/*.test.ts"
  ]
}
```

### Type Declaration Files

```typescript
// types/express.d.ts - Extending Express types
import { IJwtClaims, UserRole } from '@models';

declare global {
  namespace Express {
    interface Request {
      claims?: IJwtClaims;
      targetUserRole?: UserRole;
      requestId?: string;
    }
  }
}

// types/environment.d.ts - Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'test' | 'staging' | 'production';
    PORT: string;
    DB_HOST: string;
    DB_PORT: string;
    DB_USER: string;
    DB_PASSWORD: string;
    DB_NAME: string;
    JWT_SECRET: string;
    EMAIL_HOST: string;
    EMAIL_PORT: string;
    EMAIL_USER: string;
    EMAIL_PASS: string;
  }
}
```

---

## Testing with Types

### Type-Safe Test Utilities

```typescript
// Test data factories with types
export const createMockUser = (overrides: Partial<IUser> = {}): IUser => {
  return {
    account_id: 1,
    firstname: 'John',
    lastname: 'Doe',
    username: 'johndoe',
    email: 'john.doe@example.com',
    phone: '1234567890',
    account_role: UserRole.USER,
    email_verified: false,
    phone_verified: false,
    account_status: 'pending',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides
  };
};

// Type-safe API testing
const testApiEndpoint = async <T>(
  method: HttpMethod,
  path: string,
  data?: any
): Promise<ApiResponse<T>> => {
  const response = await request(app)
    .method.toLowerCase()(path)
    .send(data);

  return response.body as ApiResponse<T>;
};

// Usage
const response = await testApiEndpoint<{ accessToken: string; user: Partial<IUser> }>(
  'POST',
  '/auth/register',
  {
    firstname: 'John',
    lastname: 'Doe',
    email: 'john.doe@example.com',
    password: 'SecureP@ss123',
    username: 'johndoe',
    phone: '1234567890'
  }
);

if (response.success) {
  expect(response.data.accessToken).toBeDefined();
  expect(response.data.user.email).toBe('john.doe@example.com');
}
```

---

## Performance with Types

### Tree Shaking with Types

```typescript
// Use const assertions for better tree shaking
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'AUTH001',
  AUTH_EMAIL_EXISTS: 'AUTH002',
  AUTH_USERNAME_EXISTS: 'AUTH003',
  USER_NOT_FOUND: 'USER001',
  PASS_INCORRECT_OLD: 'PASS001',
  VRFY_EMAIL_ALREADY_VERIFIED: 'VRFY001'
} as const;

// Creates type: 'AUTH001' | 'AUTH002' | 'AUTH003' | 'USER001' | 'PASS001' | 'VRFY001'
type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];
```

### Compile-Time Optimizations

```typescript
// Use type-only imports for better compilation
import type { IUser, IAuthRequest, IJwtClaims } from '@models';
import { sendSuccess } from '@utilities/responseUtils'; // Runtime import

// Type-only exports
export type { IUser, IAuthRequest, IJwtClaims };
export { sendSuccess }; // Runtime export
```

---

## Further Reading

- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Official TypeScript documentation
- [Type Challenges](https://github.com/type-challenges/type-challenges) - Practice with advanced types
- [TypeScript Best Practices](https://basarat.gitbook.io/typescript/) - Comprehensive guide

---

*TypeScript's type system enables building more reliable, maintainable, and self-documenting applications. These patterns help leverage TypeScript's full potential for web development.*