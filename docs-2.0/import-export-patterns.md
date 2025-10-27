# JavaScript/TypeScript Import & Export Patterns

## Introduction

Understanding how to organize, import, and export code is fundamental to building maintainable JavaScript and TypeScript applications. This guide covers the module system used throughout this project and explains the patterns you'll encounter in professional codebases.

**Why Modules Matter:**
- **Organization** - Break code into logical, reusable pieces
- **Encapsulation** - Control what's exposed to other parts of your application
- **Maintainability** - Easier to find, update, and debug specific functionality
- **Reusability** - Share code across multiple files and projects
- **Dependency Management** - Clear declaration of what each file needs

---

## What Can Be Exported and Imported?

Before diving into module systems, let's understand what you can actually export and import. JavaScript and TypeScript allow you to export almost anything, but some patterns work better than others.

### Primitive Values (Constants)

Export simple values like strings, numbers, and booleans.

**Syntax:**
```typescript
// config.ts
export const API_VERSION = '1.0.0';
export const PORT = 4000;
export const IS_PRODUCTION = false;
export const MAX_RETRIES = 3;
```

**Importing:**
```typescript
import { API_VERSION, PORT } from './config';

console.log(`API v${API_VERSION} running on port ${PORT}`);
```

**Real Example from This Project:**
```typescript
// src/core/utilities/envConfig.ts exports configuration values
export const config = {
    PORT: 4000,
    NODE_ENV: 'development',
    // ...
};
```

**When to use:**
- ✅ Application-wide constants
- ✅ Configuration values
- ✅ Magic numbers that need names
- ⚠️ Avoid mutable primitives (use functions to get current values instead)

---

### Functions

Export both arrow functions and traditional function declarations.

**Arrow Functions:**
```typescript
// math.ts
export const add = (a: number, b: number): number => a + b;
export const multiply = (a: number, b: number): number => a * b;
export const divide = (a: number, b: number): number => {
    if (b === 0) throw new Error('Division by zero');
    return a / b;
};
```

**Function Declarations:**
```typescript
// helpers.ts
export function formatDate(date: Date): string {
    return date.toISOString();
}

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
```

**Importing:**
```typescript
import { add, multiply } from './math';
import { formatDate, capitalize } from './helpers';

const result = add(5, 3);
const now = formatDate(new Date());
```

**Real Examples from This Project:**
```typescript
// src/core/utilities/responseUtils.ts
export const sendSuccess = <T>(response: Response, data: T, ...): void => {
    // Send standardized success response
};

export const sendError = (response: Response, statusCode: number, ...): void => {
    // Send standardized error response
};
```

**When to use:**
- ✅ Utility functions (validation, formatting, calculations)
- ✅ Helper functions used across multiple files
- ✅ Pure functions without side effects
- ✅ Middleware functions in Express

---

### Classes

Export classes for object-oriented patterns.

**Syntax:**
```typescript
// errorHandler.ts
export class AppError extends Error {
    public statusCode: number;
    public errorCode: string;

    constructor(message: string, statusCode: number, errorCode: string) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}

export class ValidationError extends AppError {
    constructor(message: string) {
        super(message, 400, 'VALIDATION_ERROR');
    }
}
```

**Importing:**
```typescript
import { AppError, ValidationError } from './errorHandler';

throw new AppError('Not found', 404, 'NOT_FOUND');
throw new ValidationError('Invalid email');
```

**Real Example from This Project:**
```typescript
// src/core/middleware/errorHandler.ts
export class AppError extends Error {
    public statusCode: number;
    public errorCode: ErrorCodes;
    public isOperational: boolean;
    // ...
}
```

**When to use:**
- ✅ Custom error classes
- ✅ Service classes (UserService, DatabaseService)
- ✅ Data models
- ✅ Stateful components
- ⚠️ Consider functions over classes for simpler use cases

---

### Interfaces & Types (TypeScript Only)

Export type definitions for type safety across your application.

**Interfaces:**
```typescript
// types/user.ts
export interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
}

export interface CreateUserRequest {
    name: string;
    email: string;
}
```

**Type Aliases:**
```typescript
// types/responses.ts
export type ResponseStatus = 'success' | 'error' | 'pending';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiResponse<T> = {
    success: boolean;
    data: T;
    timestamp: string;
};
```

**Importing:**
```typescript
import { User, CreateUserRequest } from './types/user';
import { ResponseStatus, ApiResponse } from './types/responses';

const user: User = { id: '1', name: 'Alice', email: 'alice@example.com', createdAt: new Date() };
const status: ResponseStatus = 'success';
```

**Real Examples from This Project:**
```typescript
// src/core/models/index.ts
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    timestamp: string;
}

export interface IRegisterRequest {
    username: string;
    email: string;
    password: string;
}
```

**When to use:**
- ✅ API request/response shapes
- ✅ Data structures used across files
- ✅ Function parameter types
- ✅ Return types for complex data
- ✅ Use `interface` for objects, `type` for unions/primitives

---

### Objects (Configuration, Constants)

Export object literals for grouped configuration or constants.

**Simple Objects:**
```typescript
// config.ts
export const apiConfig = {
    baseUrl: 'http://localhost:4000',
    timeout: 5000,
    retries: 3
};

export const errorMessages = {
    notFound: 'Resource not found',
    unauthorized: 'Authentication required',
    serverError: 'Internal server error'
};
```

**Objects with Methods:**
```typescript
// logger.ts
export const logger = {
    info: (message: string) => console.log(`[INFO] ${message}`),
    error: (message: string) => console.error(`[ERROR] ${message}`),
    warn: (message: string) => console.warn(`[WARN] ${message}`)
};
```

**Importing:**
```typescript
import { apiConfig, errorMessages } from './config';
import { logger } from './logger';

logger.info(`Starting API at ${apiConfig.baseUrl}`);
```

**Real Example from This Project:**
```typescript
// src/core/utilities/responseUtils.ts
export const ErrorResponses = {
    badRequest: (response: Response, message: string = 'Bad Request', details?: any): void => {
        sendError(response, 400, message, ErrorCodes.BAD_REQUEST, details);
    },
    unauthorized: (response: Response, message: string = 'Unauthorized'): void => {
        sendError(response, 401, message, ErrorCodes.UNAUTHORIZED);
    },
    // ... more error helpers
};
```

**When to use:**
- ✅ Configuration objects
- ✅ Grouped utility functions
- ✅ Constants that belong together
- ⚠️ Avoid large mutable objects (hard to track changes)

---

### Arrays (Lists of Constants)

Export arrays of related constants or configuration values.

**Syntax:**
```typescript
// constants.ts
export const ALLOWED_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export const VALID_STATUS_CODES = [200, 201, 204, 400, 401, 403, 404, 500];

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de'];
```

**Importing:**
```typescript
import { ALLOWED_HTTP_METHODS, VALID_STATUS_CODES } from './constants';

if (ALLOWED_HTTP_METHODS.includes(method)) {
    // Process request
}
```

**Real Example from This Project:**
```typescript
// The project uses arrays in configuration
// src/core/utilities/envConfig.ts
export const config = {
    CORS_ORIGINS: ['http://localhost:3000', 'http://localhost:4000'],
    // ...
};
```

**When to use:**
- ✅ Whitelist/blacklist values
- ✅ Allowed options for validation
- ✅ Menu items, navigation links
- ✅ Use `as const` for TypeScript to infer literal types

---

### Enums (TypeScript)

Export enums for a set of named constants.

**Syntax:**
```typescript
// errorCodes.ts
export enum ErrorCodes {
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    INTERNAL_ERROR = 'INTERNAL_ERROR'
}

export enum HttpStatus {
    OK = 200,
    CREATED = 201,
    BAD_REQUEST = 400,
    NOT_FOUND = 404,
    SERVER_ERROR = 500
}
```

**Importing:**
```typescript
import { ErrorCodes, HttpStatus } from './errorCodes';

throw new AppError('Not found', HttpStatus.NOT_FOUND, ErrorCodes.NOT_FOUND);
```

**Real Example from This Project:**
```typescript
// src/types/errorTypes.ts
export enum ErrorCodes {
    BAD_REQUEST = 'BAD_REQUEST',
    UNAUTHORIZED = 'UNAUTHORIZED',
    FORBIDDEN = 'FORBIDDEN',
    NOT_FOUND = 'NOT_FOUND',
    INVALID_REQUEST_FORMAT = 'INVALID_REQUEST_FORMAT',
    INTERNAL_ERROR = 'INTERNAL_ERROR',
    SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}
```

**When to use:**
- ✅ Error codes
- ✅ Status values
- ✅ State machine states
- ⚠️ Consider string literal unions (`type Status = 'active' | 'inactive'`) for simpler cases

---

### Mixed Exports (Multiple Types)

You can export different types from the same file.

**Syntax:**
```typescript
// userService.ts
export interface User {
    id: string;
    name: string;
}

export const DEFAULT_USER: User = {
    id: '0',
    name: 'Guest'
};

export const createUser = (name: string): User => ({
    id: Math.random().toString(),
    name
});

export class UserService {
    getUser(id: string): User | null {
        // Implementation
        return null;
    }
}
```

**Importing:**
```typescript
import { User, DEFAULT_USER, createUser, UserService } from './userService';

const user: User = createUser('Alice');
const service = new UserService();
```

**Real Example from This Project:**
```typescript
// src/core/middleware/errorHandler.ts exports multiple things:
export class AppError extends Error { /* ... */ }
export const errorHandler = (error: Error, ...) => { /* ... */ };
export const asyncHandler = (handler: Function) => { /* ... */ };
export const notFoundHandler = (request: Request, ...) => { /* ... */ };
```

**When to use:**
- ✅ Related functionality in one file
- ✅ Types alongside functions that use them
- ✅ Utilities with their configuration
- ⚠️ Keep files focused - if it grows too large, split it up

---

### What You CANNOT Export

Some things cannot be exported directly:

**❌ Local Variables (without export keyword):**
```typescript
const localValue = 42;  // NOT exported
// Other files cannot import this
```

**❌ Statements (only declarations):**
```typescript
export if (condition) { }  // ❌ Syntax error
export for (let i = 0; i < 10; i++) { }  // ❌ Syntax error
```

**❌ Multiple default exports:**
```typescript
export default function foo() { }
export default function bar() { }  // ❌ Only one default allowed
```

---

### Best Practices for What to Export

**✅ Do:**
```typescript
// Export related, cohesive functionality
export const sendEmail = (to: string, subject: string) => { /* ... */ };
export const validateEmail = (email: string) => { /* ... */ };
export interface EmailConfig { /* ... */ }
```

**❌ Avoid:**
```typescript
// Exporting unrelated things
export const sendEmail = () => { /* ... */ };
export const calculateTax = () => { /* ... */ };  // Unrelated
export const formatDate = () => { /* ... */ };    // Unrelated
```

**✅ Do:**
```typescript
// Export const for immutability
export const API_KEY = 'your-key';
```

**❌ Avoid:**
```typescript
// Exporting mutable values (hard to track)
export let counter = 0;  // Can be changed by importers!
```

**✅ Do:**
```typescript
// Use clear, descriptive names
export const validateUserEmail = (email: string) => { /* ... */ };
```

**❌ Avoid:**
```typescript
// Unclear names
export const v = (e: string) => { /* ... */ };  // What does this do?
```

---

### Summary: Export Checklist

When deciding what to export, ask:

1. **Is this used in multiple files?** → Export it
2. **Is this an implementation detail?** → Don't export it (keep it private)
3. **Does this belong in this file?** → If not, move it first
4. **Is the name clear and descriptive?** → Rename if needed
5. **Is this mutable?** → Prefer exporting functions over mutable values

---

## ES6 Modules vs CommonJS

JavaScript has two main module systems. Understanding both helps you work with different codebases and tools.

### ES6 Modules (ESM) - Modern Standard

**Syntax:**
```javascript
// Exporting
export const myFunction = () => { ... };
export default MyClass;

// Importing
import { myFunction } from './myModule';
import MyClass from './myModule';
```

**Characteristics:**
- ✅ Static analysis (tools can analyze imports without running code)
- ✅ Tree shaking (unused exports can be removed)
- ✅ Browser native support
- ✅ Strict mode by default
- ✅ Top-level await support
- ⚠️ Always asynchronous

**Used in:** Modern frontend code, Node.js (with `"type": "module"`), TypeScript source files

### CommonJS (CJS) - Node.js Traditional

**Syntax:**
```javascript
// Exporting
module.exports = { myFunction, MyClass };
exports.myFunction = () => { ... };

// Importing
const { myFunction } = require('./myModule');
const MyClass = require('./myModule');
```

**Characteristics:**
- ✅ Synchronous loading
- ✅ Dynamic imports (can require based on conditions)
- ✅ Node.js traditional standard
- ⚠️ No static analysis
- ⚠️ No tree shaking
- ⚠️ Not browser compatible without bundling

**Used in:** Traditional Node.js applications, npm packages

### This Project's Approach

**Source Code (TypeScript):** ES6 modules
```typescript
// src/index.ts uses ES6 syntax
import { createApp } from '@/app';
```

**Compiled Output:** CommonJS
```javascript
// dist/index.js compiles to CommonJS
const app_1 = require("./app");
```

**Why?** TypeScript compiles ES6 modules to CommonJS for Node.js compatibility. We get modern syntax benefits while maintaining Node.js compatibility.

**Configuration:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "CommonJS"  // Output format
  }
}
```

---

## Export Patterns

### Named Exports

Export multiple values from a single file.

**Syntax:**
```typescript
// src/core/utilities/responseUtils.ts
export const sendSuccess = <T>(
    response: Response,
    data: T,
    message?: string
): void => {
    // Implementation
};

export const sendError = (
    response: Response,
    statusCode: number,
    message: string
): void => {
    // Implementation
};
```

**Importing:**
```typescript
// Import specific functions
import { sendSuccess, sendError } from '@utilities/responseUtils';

// Import with renaming
import { sendSuccess as success } from '@utilities/responseUtils';

// Import everything as namespace
import * as ResponseUtils from '@utilities/responseUtils';
ResponseUtils.sendSuccess(...);
```

**When to use:**
- ✅ Exporting multiple related utilities
- ✅ When you want explicit import names
- ✅ For tree-shaking benefits
- ✅ When all exports are equally important

### Default Exports

Export a single primary value from a file.

**Syntax:**
```typescript
// src/app.ts
export const createApp = (): Express => {
    const app = express();
    // Configuration
    return app;
};

// This could also be:
// export default createApp;
```

**Importing:**
```typescript
// Import with any name
import createApp from '@/app';
import myApp from '@/app';  // Works, but confusing!
```

**When to use:**
- ✅ One primary export per file
- ✅ Classes or React components
- ✅ Configuration objects
- ⚠️ Be careful: can be renamed arbitrarily on import

**Best Practice:**
```typescript
// Prefer this pattern for clarity
export const createApp = () => { ... };

// Over this
const createApp = () => { ... };
export default createApp;
```

### Mixed Exports (Named + Default)

Combine default and named exports (use sparingly).

**Syntax:**
```typescript
// Main export
export default class ApiClient {
    // Implementation
}

// Helper exports
export const API_VERSION = '1.0.0';
export const BASE_URL = 'http://localhost:4000';
```

**Importing:**
```typescript
import ApiClient, { API_VERSION, BASE_URL } from './apiClient';
```

**When to use:**
- ⚠️ Rarely - can be confusing
- ✅ When you have one primary export with configuration constants
- ❌ Avoid if it makes the API unclear

### Re-exports (Barrel Pattern)

Re-export from other modules to create a unified API.

**Syntax:**
```typescript
// src/types/index.ts - Barrel export
export * from './apiTypes';
export * from './errorTypes';
export { SpecificType } from './utilTypes';
```

**Benefits:**
```typescript
// Without barrel export (verbose)
import { ApiResponse } from '@/types/apiTypes';
import { ErrorCodes } from '@/types/errorTypes';

// With barrel export (clean)
import { ApiResponse, ErrorCodes } from '@/types';
```

**Real Example from This Project:**
```typescript
// src/types/index.ts
export * from './apiTypes';
export * from './errorTypes';

// Now you can import from types/
import { ApiResponse, ErrorResponse, ErrorCodes } from '@/types';
```

**When to use:**
- ✅ Grouping related exports
- ✅ Simplifying import paths
- ✅ Creating public APIs for modules
- ⚠️ Be aware: can slow down cold starts in large projects

---

## Import Patterns

### Basic Imports

**Named imports:**
```typescript
import { Request, Response } from 'express';
```

**Default import:**
```typescript
import express from 'express';
```

**Mixed:**
```typescript
import express, { Request, Response } from 'express';
```

### Namespace Imports

Import everything as a single object.

**Syntax:**
```typescript
import * as fs from 'fs';
import * as path from 'path';

fs.readFileSync(path.join(__dirname, 'file.txt'));
```

**When to use:**
- ✅ When you need many exports from a module
- ✅ To avoid naming conflicts
- ✅ For clarity about where functions come from

**Example from this project:**
```typescript
import * as hljs from 'highlight.js';

hljs.highlight(code, { language: 'typescript' });
```

### Selective Imports

Import only what you need for better performance and clarity.

**Good:**
```typescript
// Only import what you use
import { sendSuccess } from '@utilities/responseUtils';
```

**Avoid:**
```typescript
// Importing everything when you only need one function
import * as ResponseUtils from '@utilities/responseUtils';
ResponseUtils.sendSuccess(...);  // Only using one function
```

### Renaming Imports

Resolve naming conflicts or improve clarity.

**Syntax:**
```typescript
// Rename on import
import { config as envConfig } from '@utilities/envConfig';

// Rename on export
export { originalName as newName } from './module';
```

**Example:**
```typescript
// Avoid conflict with local variable
import { Request as ExpressRequest } from 'express';

const Request = class MyCustomRequest { };  // No conflict
```

### Side-Effect Imports

Import a module just for its side effects (no exports needed).

**Syntax:**
```typescript
// Load environment variables
import 'dotenv/config';

// Apply polyfills
import 'core-js/stable';
```

**Real Example from This Project:**
```typescript
// src/index.ts
import 'dotenv/config';  // Loads .env file, no exports needed

import { createApp } from '@/app';
```

**When to use:**
- ✅ Configuration/setup modules (dotenv, polyfills)
- ✅ Global CSS/style imports
- ⚠️ Be aware: runs code at import time

---

## Barrel Exports (index.ts Pattern)

### What Are Barrel Exports?

A barrel is an `index.ts` file that re-exports items from multiple files in a directory, creating a single entry point.

**Structure:**
```
types/
├── index.ts        ← Barrel (re-exports everything)
├── apiTypes.ts
├── errorTypes.ts
└── utilTypes.ts
```

**Implementation:**
```typescript
// types/index.ts
export * from './apiTypes';
export * from './errorTypes';
export * from './utilTypes';
```

### Why This Project Uses Barrels

**Without barrels:**
```typescript
import { ApiResponse } from '@/types/apiTypes';
import { ErrorCodes, ErrorResponse } from '@/types/errorTypes';
import { PaginatedResponse } from '@/types/utilTypes';
```

**With barrels:**
```typescript
import { ApiResponse, ErrorCodes, ErrorResponse, PaginatedResponse } from '@/types';
```

**Benefits:**
- ✅ Cleaner imports
- ✅ Single source of truth for a module's API
- ✅ Easier to refactor internal file structure
- ✅ Hides implementation details

**Drawbacks:**
- ⚠️ Can slow down cold starts (loads all files)
- ⚠️ Less explicit (harder to find where types are defined)

### Examples from This Project

**Controllers Barrel:**
```typescript
// src/controllers/index.ts
export * from './authController';

// Usage:
import { register, login, resetPassword } from '@controllers';
```

**Types Barrel:**
```typescript
// src/core/models/index.ts
export * from './user';
export * from './enums';

// Usage:
import { IRegisterRequest, IUser, UserRole } from '@/types';
```

### Best Practices for Barrels

**Do:**
```typescript
// Re-export everything from related modules
export * from './userTypes';
export * from './postTypes';
```

**Don't:**
```typescript
// Avoid circular dependencies
// userTypes.ts imports from index.ts while index.ts exports userTypes
```

**Tip:** Use barrels for public APIs, not for internal organization.

---

## Path Aliases

### What Are Path Aliases?

Path aliases let you use short, absolute-style imports instead of relative paths.

**Without aliases (relative paths):**
```typescript
import { sendSuccess } from '../../../core/utilities/responseUtils';
import { ApiResponse } from '../../../types/apiTypes';
```

**With aliases:**
```typescript
import { sendSuccess } from '@utilities/responseUtils';
import { ApiResponse } from '@/types';
```

### This Project's Path Aliases

**Configuration in `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"],
      "@/types": ["types"],
      "@controllers/*": ["controllers/*"],
      "@middleware/*": ["core/middleware/*"],
      "@utilities/*": ["core/utilities/*"],
      "@routes/*": ["routes/*"]
    }
  }
}
```

**Available Aliases:**
```typescript
import { createApp } from '@/app';                      // @/ → src/
import { ApiResponse } from '@/types';                  // @/types → src/types
import { getHealth } from '@controllers/healthController'; // @controllers/ → src/controllers/
import { errorHandler } from '@middleware/errorHandler';   // @middleware/ → src/core/middleware/
import { sendSuccess } from '@utilities/responseUtils';    // @utilities/ → src/core/utilities/
import { routes } from '@routes/index';                    // @routes/ → src/routes/
```

### Benefits of Path Aliases

**1. Cleaner Imports**
```typescript
// Before
import { config } from '../../../core/utilities/envConfig';

// After
import { config } from '@utilities/envConfig';
```

**2. Easier Refactoring**
```typescript
// If you move a file, relative imports break:
// ../../../utils/helper.ts → ../../utils/helper.ts

// Path aliases stay the same:
// @utilities/helper → @utilities/helper
```

**3. Better Readability**
```typescript
// Clear what you're importing
import { sendSuccess } from '@utilities/responseUtils';  // Utility function
import { ApiResponse } from '@/types';                   // Type definition
```

### Setting Up Path Aliases

**1. Configure TypeScript (`tsconfig.json`):**
```json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  }
}
```

**2. Configure Runtime (for ts-node-dev):**
```json
// tsconfig.json
{
  "ts-node": {
    "require": ["tsconfig-paths/register"]
  }
}
```

**3. Install path resolution:**
```bash
npm install --save-dev tsconfig-paths
```

**4. Use in npm scripts:**
```json
{
  "scripts": {
    "start:dev": "ts-node-dev -r tsconfig-paths/register src/index.ts"
  }
}
```

---

## Dynamic Imports

### What Are Dynamic Imports?

Load modules conditionally or lazily at runtime instead of at the top of the file.

**Static Import (always loaded):**
```typescript
import { heavyModule } from './heavy';  // Loaded immediately

if (condition) {
    heavyModule.doSomething();
}
```

**Dynamic Import (loaded on demand):**
```typescript
if (condition) {
    const { heavyModule } = await import('./heavy');  // Loaded only if needed
    heavyModule.doSomething();
}
```

### Syntax

**Promise-based:**
```typescript
// Returns a promise
const module = await import('./myModule');
module.default();  // Call default export
module.namedExport();  // Call named export
```

**Example:**
```typescript
// Load markdown renderer only when needed
async function renderMarkdown(content: string): Promise<string> {
    const { marked } = await import('marked');
    return marked(content);
}
```

### When to Use Dynamic Imports

**✅ Good use cases:**
```typescript
// 1. Conditional features
if (user.hasPermission('admin')) {
    const { AdminPanel } = await import('./AdminPanel');
    return new AdminPanel();
}

// 2. Code splitting (reduce initial bundle size)
button.addEventListener('click', async () => {
    const { Modal } = await import('./Modal');
    new Modal().show();
});

// 3. Environment-specific code
if (process.env.NODE_ENV === 'development') {
    const { devTools } = await import('./devTools');
    devTools.init();
}
```

**❌ Avoid:**
```typescript
// Don't use for simple modules
const { config } = await import('./config');  // Just use static import

// Don't overuse (makes code harder to follow)
const module1 = await import('./module1');
const module2 = await import('./module2');
const module3 = await import('./module3');
// Consider static imports if you always need these
```

---

## Module Resolution

### How Node.js Finds Modules

When you write `import { something } from 'module'`, Node.js searches:

**1. Built-in modules** (highest priority)
```typescript
import * as fs from 'fs';       // Node.js built-in
import * as path from 'path';   // Node.js built-in
```

**2. node_modules** (external packages)
```typescript
import express from 'express';              // ./node_modules/express
import { marked } from 'marked';            // ./node_modules/marked
```

**3. Relative paths** (your code)
```typescript
import { createApp } from './app';          // ./app.ts or ./app/index.ts
import { config } from '../utilities/env';  // ../utilities/env.ts
```

**4. Path aliases** (if configured)
```typescript
import { sendSuccess } from '@utilities/responseUtils';
// Resolved via tsconfig.json paths
```

### File Resolution Order

Node.js/TypeScript tries these extensions in order:

```
import { something } from './module'

Tries:
1. ./module.ts
2. ./module.tsx
3. ./module.d.ts
4. ./module/index.ts
5. ./module/index.tsx
6. ./module/index.d.ts
```

**Example:**
```typescript
// Both of these work:
import { routes } from './routes';        // Finds ./routes.ts
import { routes } from './routes/index';  // Finds ./routes/index.ts
```

### TypeScript Configuration

**Module Resolution Strategy:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "node",  // Use Node.js resolution
    "baseUrl": "./src",          // Base for path aliases
    "paths": {                   // Define aliases
      "@/*": ["*"]
    }
  }
}
```

**Common Issues & Solutions:**

**Issue:** "Cannot find module '@/types'"
```typescript
// Solution: Check tsconfig.json paths configuration
{
  "paths": {
    "@/types": ["types"],  // Ensure this matches your directory
    "@/*": ["*"]
  }
}
```

**Issue:** "Module not found" at runtime with ts-node
```bash
# Solution: Register path resolver
ts-node-dev -r tsconfig-paths/register src/index.ts
```

**Issue:** Circular dependency
```typescript
// userService.ts imports postService.ts
// postService.ts imports userService.ts
// Solution: Extract shared code to a third module
```

---

## Best Practices

### 1. Prefer Named Exports Over Default

**Why:**
- ✅ Better IDE autocompletion
- ✅ Easier to refactor (renames update everywhere)
- ✅ More explicit about what's being imported
- ✅ Supports tree shaking better

**Good:**
```typescript
// responseUtils.ts
export const sendSuccess = <T>(...) => { ... };
export const sendError = (...) => { ... };

// Usage (IDE autocompletes)
import { sendSuccess } from '@utilities/responseUtils';
```

**Less Ideal:**
```typescript
// responseUtils.ts
export default {
    sendSuccess: <T>(...) => { ... },
    sendError: (...) => { ... }
};

// Usage (can be renamed arbitrarily)
import utils from '@utilities/responseUtils';  // Could be any name
import whatever from '@utilities/responseUtils';  // Confusing!
```

### 2. Use Barrel Exports for Module APIs

**Good:**
```typescript
// core/models/index.ts - Public API
export { IAuthResponse, IRegisterRequest, IUser } from './user';
export { UserRole, AccountStatus } from './enums';

// Clean imports
import { IRegisterRequest, UserRole } from '@/types';
```

**Avoid:**
```typescript
// Importing from internal files directly
import { ApiResponse } from '@/types/apiTypes';
import { ErrorCodes } from '@/types/errorTypes';
```

### 3. Organize Imports Consistently

**Recommended Order:**
```typescript
// 1. External dependencies
import express from 'express';
import { Request, Response } from 'express';

// 2. Internal modules (path aliases)
import { ApiResponse } from '@/types';
import { sendSuccess } from '@utilities/responseUtils';
import { asyncHandler } from '@middleware/errorHandler';

// 3. Relative imports
import { helperFunction } from './helpers';
```

### 4. Avoid Circular Dependencies

**Problem:**
```typescript
// userService.ts
import { getPost } from './postService';
export const getUser = () => { getPost(); };

// postService.ts
import { getUser } from './userService';  // Circular!
export const getPost = () => { getUser(); };
```

**Solution:**
```typescript
// Extract shared code
// sharedTypes.ts
export interface User { id: string; }
export interface Post { id: string; userId: string; }

// userService.ts
import { User, Post } from './sharedTypes';
export const getUser = (): User => { ... };

// postService.ts
import { User, Post } from './sharedTypes';
export const getPost = (): Post => { ... };
```

### 5. Use Path Aliases for Cross-Cutting Concerns

**Good:**
```typescript
// Clear what this is
import { logger } from '@utilities/logger';
import { ErrorCodes } from '@/types';
```

**Avoid:**
```typescript
// Unclear where this is
import { logger } from '../../../utilities/logger';
```

### 6. Keep Barrel Exports Focused

**Good (focused barrel):**
```typescript
// types/index.ts - Only type definitions
export * from './apiTypes';
export * from './errorTypes';
```

**Avoid (mixed barrel):**
```typescript
// utils/index.ts - Mixing unrelated things
export * from './stringUtils';
export * from './dateUtils';
export * from './networkUtils';
export * from './fileUtils';
// Too broad - split into separate barrels
```

---

## Practical Examples from This Project

### Example 1: Controller with Multiple Imports

```typescript
// src/controllers/authController.ts
import { Request, Response } from 'express';                    // External dependency
import { sendSuccess } from '@utilities/responseUtils';         // Path alias
import { IRegisterRequest, IAuthResponse } from '@/types';      // Barrel export
import { getPool } from '@db';                                  // Path alias
import { ErrorCodes } from '@/types/errorTypes';                // Path alias
```

**What's happening:**
- `express` - External package (node_modules)
- `@utilities/*` - Path alias to `src/core/utilities/*`
- `@/types` - Path alias to `src/types/index.ts` (barrel)
- `@middleware/*` - Path alias to `src/core/middleware/*`

### Example 2: Types Barrel Export

```typescript
// src/types/index.ts
export * from './apiTypes';    // Re-export all named exports
export * from './errorTypes';  // Re-export all named exports
```

**Usage:**
```typescript
// Clean single import line
import { IRegisterRequest, IAuthResponse, UserRole } from '@/types';

// Instead of three separate imports
import { IRegisterRequest } from '@/types/user';
import { IAuthResponse } from '@/types/auth';
import { UserRole } from '@/types/enums';
```

### Example 3: Path Alias Resolution

```typescript
// In any file, you can use:
import { config } from '@utilities/envConfig';

// Which resolves to:
// @utilities → src/core/utilities (via tsconfig paths)
// Full path: src/core/utilities/envConfig.ts
```

**Configuration:**
```json
// tsconfig.json
{
  "baseUrl": "./src",
  "paths": {
    "@utilities/*": ["core/utilities/*"]
  }
}
```

### Example 4: Dotenv Side-Effect Import

```typescript
// src/index.ts (entry point)
import 'dotenv/config';  // Load .env file (side effect only)

import { createApp } from '@/app';
import { config } from '@utilities/envConfig';
```

**Order matters:** `dotenv/config` must be first so environment variables are loaded before other modules try to use them.

### Example 5: Mixed Export Pattern

```typescript
// src/core/utilities/responseUtils.ts
export const sendSuccess = <T>(...) => { ... };
export const sendError = (...) => { ... };
export const sendPaginated = <T>(...) => { ... };

// Also exports a helper object
export const ErrorResponses = {
    badRequest: (...) => { ... },
    unauthorized: (...) => { ... },
    // ...
};
```

**Usage:**
```typescript
import { sendSuccess, ErrorResponses } from '@utilities/responseUtils';

sendSuccess(response, data);
ErrorResponses.badRequest(response, 'Invalid input');
```

**📚 Validation Patterns:** For comprehensive validation implementation patterns, see [Validation Strategies](/docs/validation-strategies.md).

---

## Common Patterns in This Codebase

### Pattern 1: Controller Structure

Every controller follows this import pattern:

```typescript
import { Request, Response } from 'express';           // Express types
import { sendSuccess } from '@utilities/responseUtils'; // Response helper
import { YourResponseType } from '@/types';             // Type definition
import { asyncHandler } from '@middleware/errorHandler'; // Error wrapper
```

### Pattern 2: Route Files

Every route file imports its controller and creates routes:

```typescript
import { Router } from 'express';
import { register, login } from '@controllers/authController';

export const authRoutes = Router();

authRoutes.post('/register', register);
authRoutes.post('/login', login);
```

### Pattern 3: Middleware Files

Middleware exports functions that match Express middleware signature:

```typescript
import { Request, Response, NextFunction } from 'express';

export const myMiddleware = (
    request: Request,
    response: Response,
    next: NextFunction
): void => {
    // Middleware logic
    next();
};
```

### Pattern 4: Utility Modules

Utilities export pure functions without side effects:

```typescript
// validationUtils.ts
export const sanitizeString = (input: string | undefined): string => {
    if (!input) return '';
    return input.trim().replace(/[<>]/g, '');
};

export const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

---

## Troubleshooting

### "Cannot find module '@/types'"

**Cause:** TypeScript can't resolve path alias

**Solution:**
```json
// Check tsconfig.json
{
  "compilerOptions": {
    "baseUrl": "./src",
    "paths": {
      "@/types": ["types"],
      "@/*": ["*"]
    }
  }
}
```

### "Module not found" at runtime

**Cause:** ts-node-dev can't resolve path aliases

**Solution:**
```json
// package.json
{
  "scripts": {
    "start:dev": "ts-node-dev -r tsconfig-paths/register src/index.ts"
  }
}
```

### Circular dependency warning

**Cause:** Two modules import each other

**Solution:** Extract shared types/code to a third module:
```typescript
// shared.ts
export interface SharedType { ... }

// moduleA.ts
import { SharedType } from './shared';

// moduleB.ts
import { SharedType } from './shared';
```

### Import works in dev but fails in production

**Cause:** Path aliases not resolved in compiled JavaScript

**Solution:** Ensure `tsconfig-paths` is registered or use a bundler like webpack

---

## Summary

### Key Takeaways

1. **Use ES6 modules** in TypeScript source code
2. **Prefer named exports** for better tooling and refactoring
3. **Use barrel exports** to create clean public APIs
4. **Configure path aliases** to avoid `../../../` imports
5. **Organize imports** consistently (external, internal, relative)
6. **Avoid circular dependencies** by extracting shared code
7. **Use dynamic imports** sparingly for code splitting

### This Project's Module Strategy

- ✅ ES6 module syntax in source
- ✅ CommonJS output for Node.js compatibility
- ✅ Path aliases for clean imports
- ✅ Barrel exports for grouped functionality
- ✅ Named exports for explicit APIs
- ✅ TypeScript strict mode for type safety

### Further Reading

- **TypeScript Handbook:** [Modules](https://www.typescriptlang.org/docs/handbook/modules.html)
- **MDN:** [JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- **Node.js:** [ECMAScript Modules](https://nodejs.org/api/esm.html)

---

**Next Steps:**
- Practice creating your own modules with named exports
- Set up path aliases in a new project
- Create a barrel export for grouped functionality
- Experiment with dynamic imports for code splitting
