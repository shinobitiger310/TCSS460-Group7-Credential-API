# Node.js & Express Architecture

A comprehensive guide to building scalable web applications with Node.js and Express.js.

> **💡 Related Code**: See implementations in [`/src/app.ts`](../src/app.ts), [`/src/index.ts`](../src/index.ts), [`/src/controllers/`](../src/controllers/), and [`/src/routes/`](../src/routes/)

## Quick Navigation
- 🏗️ **Application Factory**: [`app.ts`](../src/app.ts) - Express app configuration and middleware setup
- 🚀 **Server Lifecycle**: [`index.ts`](../src/index.ts) - Application startup and graceful shutdown
- 🎯 **MVC Controllers**: [`controllers/`](../src/controllers/) - Business logic implementation
- 🛣️ **Routing System**: [`routes/`](../src/routes/) - URL patterns and route organization
- 🔧 **Middleware Examples**: [`authValidation.ts`](../src/core/middleware/authValidation.ts) - Custom validation middleware
- 🔄 **Async Patterns**: [Async JavaScript & Node.js](./async-javascript-nodejs.md) - Asynchronous programming and event loop
- 🗃️ **Database Integration**: [Database Fundamentals](./database-fundamentals.md#connection-pooling) - How data layer connects
- 🔒 **Security Practices**: [Web Security Guide](./web-security-guide.md#cors-configuration) - Express security patterns
- ⚙️ **Development Workflow**: [Development Workflow](./development-workflow.md) - TypeScript compilation and build process

## Table of Contents

- [MVC Architecture Pattern](#mvc-architecture-pattern)
- [Express.js Fundamentals](#expressjs-fundamentals)
- [Middleware System](#middleware-system)
- [Routing Patterns](#routing-patterns)
- [Application Lifecycle](#application-lifecycle)
- [Error Handling](#error-handling)

---

## MVC Architecture Pattern

### What is MVC?

MVC (Model-View-Controller) is an architectural pattern that separates application logic into three interconnected components, promoting organized code and separation of concerns.

### MVC Components in Web APIs

#### **MODEL (Data Layer)**
- Database operations (queries, transactions)
- Data validation and business rules
- Entity definitions and relationships

```typescript
// Example: Database models and operations
export interface UserRecord {
  user_id: number;
  username: string;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

// Database operations
export const getUsersFromDB = async (role?: string): Promise<UserRecord[]> => {
  const query = role
    ? 'SELECT * FROM users WHERE role = $1 ORDER BY created_at'
    : 'SELECT * FROM users ORDER BY created_at';
  const result = await pool.query(query, role ? [role] : []);
  return result.rows;
};
```

**📚 Database Integration:** See [Database Fundamentals](/docs/database-fundamentals.md) for transaction patterns, connection pooling, and query optimization strategies used in the Model layer.

#### **VIEW (Presentation Layer)**
- In web APIs, this is the JSON response format
- Response utilities handle the "view" formatting
- Frontend applications consume these JSON "views"

```typescript
// Response formatting (the "view" in API context)
export const formatUserResponse = (user: UserRecord): UserResponse => ({
  user_id: user.user_id,
  username: user.username,
  email: user.email,
  role: user.role,
  created_at: user.created_at
  // Note: password_hash is intentionally excluded for security
});
```

#### **CONTROLLER (Business Logic Layer)**
- Processes incoming requests
- Coordinates between models and views
- Handles business logic and workflows
- Returns formatted responses

```typescript
// Controller handles the business logic
export const registerUser = async (request: Request, response: Response): Promise<void> => {
  try {
    const { username, email, password }: RegisterRequest = request.body;

    // Business logic: Check for duplicates
    const existingUser = await checkUserExists(username, email);
    if (existingUser) {
      return sendError(response, 400, "User already exists", ErrorCodes.USER_EXISTS);
    }

    // Model interaction: Hash password and save to database
    const passwordHash = await bcrypt.hash(password, 10);
    const savedUser = await createUser(username, email, passwordHash);

    // View formatting: Format response (exclude password)
    const formattedResponse = formatUserResponse(savedUser);

    sendSuccess(response, formattedResponse, "User registered successfully", 201);
  } catch (error) {
    handleControllerError(error, response);
  }
};
```

### Separation of Concerns

#### **Good MVC Design:**
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│     ROUTES      │───▶│   CONTROLLERS    │───▶│     MODELS      │
│                 │    │                  │    │                 │
│ • URL patterns  │    │ • Business logic │    │ • Database ops  │
│ • HTTP methods  │    │ • Validation     │    │ • Data rules    │
│ • Middleware    │    │ • Coordination   │    │ • Entities      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       ▼                       │
         │              ┌──────────────────┐              │
         └─────────────▶│   UTILITIES      │◀─────────────┘
                        │                  │
                        │ • Response format│
                        │ • Error handling │
                        │ • Validation     │
                        └──────────────────┘
```

#### **Controller Responsibilities:**
✅ Extract and validate request data (body, params, query)
✅ Execute business logic (create, read, update, delete operations)
✅ Coordinate database operations
✅ Handle errors and edge cases
✅ Format and send responses using response utilities

#### **Controllers should NOT:**
❌ Contain database connection logic (use utilities)
❌ Handle HTTP parsing (Express middleware does this)
❌ Format responses manually (use response utilities)
❌ Contain validation logic (use middleware)

---

## Express.js Fundamentals

### What is Express.js?

Express.js is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications.

### Application vs Server Distinction

#### **APPLICATION (app.ts)**
Defines how to handle requests (routes, middleware, error handling)

```typescript
// app.ts - Application configuration
export const createApp = (): express.Application => {
  const app = express();

  // Middleware configuration
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Routes configuration
  app.use('/', routes);

  // Error handling
  app.use(globalErrorHandler);

  return app;
};
```

#### **SERVER (index.ts)**
Actually listens on a port and accepts incoming connections

```typescript
// index.ts - Server startup
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => gracefulShutdown(server));
```

### Benefits of Separation

✅ **Testability**: Applications can be unit tested without HTTP overhead
✅ **Reusability**: Same app configuration can be used with different servers
✅ **Maintainability**: Business logic is centralized and organized
✅ **Deployability**: Easy to deploy to different platforms that manage servers

---

## Middleware System

### What is Middleware?

Middleware functions are functions that have access to the request object, response object, and the next middleware function in the application's request-response cycle.

### Middleware Pattern

```typescript
// Middleware signature
type Middleware = (req: Request, res: Response, next: NextFunction) => void;

// Example middleware
const loggingMiddleware: Middleware = (req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next(); // Call next middleware in stack
};
```

### Middleware Stack (Order Matters!)

```typescript
const app = express();

// 1. CORS - Handle cross-origin requests (browser security)
app.use(cors());

// 2. JSON Parser - Convert JSON request bodies to JavaScript objects
app.use(express.json({ limit: '10mb' }));

// 3. URL Encoder - Handle form data from HTML forms
app.use(express.urlencoded({ extended: true }));

// 4. Logging - Log all requests
app.use(morgan('combined'));

// 5. Authentication - Verify user identity
app.use('/api/protected', authenticateToken);

// 6. Routes - Your business logic (auth and user operations)
app.use('/api', routes);

// 7. Error Handler - Catch and format errors (must be last!)
app.use(globalErrorHandler);
```

### Types of Middleware

#### **1. Application-Level Middleware**
```typescript
// Applies to all routes
app.use(cors());
app.use(express.json());

// Applies to specific paths
app.use('/api', rateLimiter);
app.use('/admin', authenticateAdmin);
```

#### **2. Router-Level Middleware**
```typescript
const router = express.Router();

// Applies to all routes in this router
router.use(logRequests);

// Applies to specific route
router.get('/users', validateQuery, getUsers);
```

#### **3. Error-Handling Middleware**
```typescript
// Error middleware has 4 parameters
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  if (err instanceof ValidationError) {
    return sendError(res, 400, err.message, 'VALIDATION_ERROR');
  }

  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
};

app.use(errorHandler); // Must be last middleware
```

#### **4. Built-in Middleware**
```typescript
// Body parsing
app.use(express.json());           // Parse JSON bodies
app.use(express.urlencoded());     // Parse URL-encoded bodies
app.use(express.static('public')); // Serve static files

// Third-party middleware
app.use(cors());                   // Enable CORS
app.use(helmet());                 // Security headers
app.use(morgan('combined'));       // Request logging
```

### Custom Middleware Examples

#### **Authentication Middleware**
```typescript
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return sendError(res, 401, 'Access token required', 'AUTH_TOKEN_REQUIRED');
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
    if (err) {
      return sendError(res, 403, 'Invalid token', 'AUTH_TOKEN_INVALID');
    }
    req.user = user;
    next();
  });
};
```

#### **Rate Limiting Middleware**
```typescript
const createRateLimit = (windowMs: number, max: number) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: "Too many requests, please try again later",
      errorCode: "RATE_LIMIT_EXCEEDED"
    }
  });
};

app.use('/api', createRateLimit(15 * 60 * 1000, 100)); // 100 requests per 15 minutes
```

#### **Request Validation Middleware**
```typescript
const validateRegisterUser = [
  body('username')
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters'),

  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Must be a valid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),

  // Validation error handler
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return sendValidationError(res, "Validation failed", errors.array());
    }
    next();
  }
];
```

**📚 Related Reading:**
- [Validation Strategies](/docs/validation-strategies.md) - Validation middleware patterns
- [Web Security Guide](/docs/web-security-guide.md) - Security middleware considerations

---

## Routing Patterns

### Express Router System

```typescript
// routes/index.ts - Main router
export const routes = Router();

// Mount sub-routers
routes.use('/open', openRoutes);     // Public routes (register, login)
routes.use('/closed', closedRoutes); // Protected routes (user management)

// API information
routes.get('/', (req, res) => {
  res.json({
    name: 'TCSS-460-auth-squared - IAM System',
    version: '2.0.0',
    documentation: '/api-docs'
  });
});
```

### Route Organization Strategies

#### **1. By Feature**
```
/routes
├── index.ts           # Main router
├── users.ts           # User operations
├── roles.ts           # Role management
└── auth.ts            # Authentication
```

#### **2. By Access Level** (Used in TCSS-460-auth-squared)

> **📖 Route Organization**: See the [API Route Organization Guide](./api-route-organization.md) for details on TCSS-460-auth-squared's three-tier route structure (open/closed/admin).

```
/routes
├── index.ts           # Main router
├── open/
│   └── index.ts       # Public routes (register, login)
└── closed/
    └── index.ts       # Protected routes (user mgmt, profile)
```

#### **3. By Version**
```
/routes
├── index.ts           # Route version selection
├── v1/
│   ├── auth.ts
│   └── users.ts
└── v2/
    ├── auth.ts
    └── users.ts
```

### Route Parameter Patterns

#### **Path Parameters**
```typescript
// /users/:userId
router.get('/users/:userId', validateUserIdParam, getUserById);

// Multiple parameters: /users/:userId/roles/:roleId
router.put('/users/:userId/roles/:roleId', assignRoleToUser);
```

#### **Query Parameters**
```typescript
// /users?role=admin&limit=10&sort=created_at
router.get('/users', (req, res) => {
  const { role, limit = 20, sort = 'created_at' } = req.query;
  // Handle filtering and pagination
});
```

#### **Route Middleware**
```typescript
// Middleware applied to specific routes
router.post('/register',
  validateRegisterUser,   // Validation middleware
  rateLimitRegister,      // Rate limiting
  registerUser           // Controller function
);

// Multiple middleware functions
router.get('/admin/users',
  authenticateToken,      // Must be logged in
  requireAdminRole,       // Must be admin
  auditLog,              // Log admin actions
  getAllUsers            // Controller
);
```

---

## Application Lifecycle

### Application Startup Sequence

```typescript
// From /src/index.ts
async function startServer() {
  try {
    // 1. Validate environment variables
    validateEnv();
    console.log('✅ Environment variables validated');

    // 2. Connect to external resources
    await connectToDatabase();
    console.log('✅ Database connection established');

    // 3. Create Express application
    const app = createApp();

    // 4. Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔍 Health check: http://localhost:${PORT}/health`);
    });

    // 5. Setup graceful shutdown
    setupGracefulShutdown(server);

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

### Graceful Shutdown

```typescript
const gracefulShutdown = async (server: Server, signal: string) => {
  console.log(`\\n${signal} received. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  server.close(async () => {
    console.log('HTTP server closed');

    try {
      // 2. Close database connections
      await disconnectFromDatabase();
      console.log('Database connection closed');

      // 3. Close other resources (Redis, etc.)
      await closeOtherConnections();

      console.log('Graceful shutdown complete');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after timeout
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Signal handlers
process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));
```

### Health Checks

```typescript
// Basic health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth(),
      external_api: await checkExternalAPIHealth()
    }
  };

  const hasFailures = Object.values(health.services).some(service => service.status !== 'OK');

  res.status(hasFailures ? 503 : 200).json(health);
});
```

---

## Error Handling

### Error Handling Strategy

#### **1. Synchronous Error Handling**
```typescript
app.get('/sync-route', (req, res, next) => {
  try {
    // Synchronous operation that might throw
    const result = riskyOperation();
    res.json({ result });
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

#### **2. Asynchronous Error Handling**
```typescript
// Using async/await with try/catch
app.get('/async-route', async (req, res, next) => {
  try {
    const result = await riskyAsyncOperation();
    res.json({ result });
  } catch (error) {
    next(error); // Pass to error handler
  }
});

// Using async error wrapper
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/wrapped-route', asyncHandler(async (req, res) => {
  const result = await riskyAsyncOperation(); // Errors automatically caught
  res.json({ result });
}));
```

#### **3. Global Error Handler**
```typescript
// Must be the last middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);

  // Handle specific error types
  if (err instanceof ValidationError) {
    return sendError(res, 400, err.message, 'VALIDATION_ERROR');
  }

  if (err instanceof DatabaseError) {
    return sendError(res, 500, 'Database operation failed', 'DATABASE_ERROR');
  }

  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 401, 'Invalid token', 'AUTH_TOKEN_INVALID');
  }

  // Default error response
  sendError(res, 500, 'Internal server error', 'INTERNAL_ERROR');
});
```

### Custom Error Classes

```typescript
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string | number) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Usage in controllers
if (!user) {
  throw new NotFoundError('User', userId);
}

if (existingUser) {
  throw new ConflictError('User with this email already exists');
}
```

---

## Performance Optimization

### Response Compression

```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Compression level (1-9)
}));
```

### Caching Strategies

```typescript
// Response caching middleware
const cache = (duration: number) => (req: Request, res: Response, next: NextFunction) => {
  const key = req.originalUrl;
  const cachedResponse = responseCache.get(key);

  if (cachedResponse) {
    return res.json(cachedResponse);
  }

  // Override res.json to cache response
  const originalJson = res.json;
  res.json = function(body) {
    responseCache.set(key, body, duration);
    return originalJson.call(this, body);
  };

  next();
};

// Use caching on expensive routes
app.get('/api/expensive-operation', cache(300), expensiveController); // 5 minute cache
```

### Request Optimization

```typescript
// Request size limiting
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request timeout
const timeout = require('connect-timeout');
app.use(timeout('30s'));

// Prevent parameter pollution
const hpp = require('hpp');
app.use(hpp());
```

---

## Further Reading

- [Express.js Official Documentation](https://expressjs.com/) - Comprehensive Express guide
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices) - Production-ready practices
- [Middleware Patterns](https://expressjs.com/en/guide/using-middleware.html) - Express middleware guide

---

*Understanding Node.js and Express architecture is fundamental for building scalable, maintainable web applications. These patterns form the backbone of modern web development.*