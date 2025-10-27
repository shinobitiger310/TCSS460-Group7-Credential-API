# Error Handling Patterns

Comprehensive guide to robust error handling in Express.js applications using TypeScript for reliable, maintainable error management.

> **💡 Related Code**: See implementations in [`/src/core/middleware/errorHandler.ts`](../src/core/middleware/errorHandler.ts), [`/src/types/errorTypes.ts`](../src/types/errorTypes.ts), and [`/src/core/utilities/responseUtils.ts`](../src/core/utilities/responseUtils.ts)

## Quick Navigation
- 🚨 **Error Middleware**: [`errorHandler.ts`](../src/core/middleware/errorHandler.ts) - Global error handling
- 📋 **Error Types**: [`errorTypes.ts`](../src/types/errorTypes.ts) - Error interfaces and enums
- 📡 **Response Utilities**: [`responseUtils.ts`](../src/core/utilities/responseUtils.ts) - Error response helpers
- ✅ **Validation**: [`validation.ts`](../src/core/middleware/validation.ts) - Input validation errors
- 🔄 **Async Patterns**: [Async JavaScript & Node.js](./async-javascript-nodejs.md) - Async error handling with promises
- 🏗️ **Architecture**: [Node.js & Express Architecture](./node-express-architecture.md) - Server architecture patterns

## Table of Contents

- [Error Classification](#error-classification)
- [Custom Error Classes](#custom-error-classes)
- [Global Error Handling](#global-error-handling)
- [Validation Error Patterns](#validation-error-patterns)
- [Async Error Handling](#async-error-handling)
- [Error Response Formatting](#error-response-formatting)

---

## Error Classification

### Error Types in Web APIs

#### **1. Operational Errors (Expected)**
These are errors that occur during normal application operation:

```typescript
// Client errors (4xx)
- Invalid input data
- Missing required fields
- Authentication failures
- Resource not found
- Permission denied

// Server errors (5xx)
- Database connection failures
- External service timeouts
- File system errors
- Memory allocation failures
```

#### **2. Programming Errors (Unexpected)**
These indicate bugs in the application code:

```typescript
// Code errors
- Type errors
- Null pointer exceptions
- Logic errors
- Syntax errors
- Memory leaks
```

### Error Code Strategy

```typescript
export enum ErrorCodes {
  // General HTTP errors (4xx)
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',

  // Validation errors
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FIELD_VALUE = 'INVALID_FIELD_VALUE',
  INVALID_REQUEST_FORMAT = 'INVALID_REQUEST_FORMAT',

  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  PAYLOAD_TOO_LARGE = 'PAYLOAD_TOO_LARGE',

  // Business logic errors
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  RESOURCE_EXISTS = 'RESOURCE_EXISTS',
  INVALID_STATE = 'INVALID_STATE'
}
```

---

## Custom Error Classes

### Base Application Error

```typescript
export class AppError extends Error {
  public statusCode: number;
  public errorCode: ErrorCodes;
  public isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    errorCode: ErrorCodes = ErrorCodes.INTERNAL_ERROR,
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = isOperational;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
```

### Specific Error Classes

```typescript
// Validation error for bad request data
export class ValidationError extends AppError {
  public validationErrors: ValidationError[];

  constructor(message: string, validationErrors: ValidationError[]) {
    super(message, 400, ErrorCodes.INVALID_FIELD_VALUE);
    this.validationErrors = validationErrors;
  }
}

// Not found error for missing resources
export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;

    super(message, 404, ErrorCodes.NOT_FOUND);
  }
}

// Unauthorized error for authentication failures
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, ErrorCodes.UNAUTHORIZED);
  }
}

// Forbidden error for authorization failures
export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, ErrorCodes.FORBIDDEN);
  }
}
```

### Error Factory Functions

```typescript
export const createError = {
  badRequest: (message: string, details?: any): AppError =>
    new AppError(message, 400, ErrorCodes.BAD_REQUEST),

  unauthorized: (message?: string): AppError =>
    new UnauthorizedError(message),

  forbidden: (message?: string): AppError =>
    new ForbiddenError(message),

  notFound: (resource: string, identifier?: string): AppError =>
    new NotFoundError(resource, identifier),

  validation: (message: string, errors: ValidationError[]): ValidationError =>
    new ValidationError(message, errors),

  internal: (message: string = 'Internal server error'): AppError =>
    new AppError(message, 500, ErrorCodes.INTERNAL_ERROR, false)
};
```

---

## Global Error Handling

### Error Handler Middleware

```typescript
export const errorHandler = (
  error: Error | AppError,
  request: Request,
  response: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let errorCode = ErrorCodes.INTERNAL_ERROR;
  let message = 'Internal Server Error';
  let details: any = undefined;

  // Handle custom AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    errorCode = error.errorCode;
    message = error.message;

    // Include validation errors if present
    if (error instanceof ValidationError) {
      details = { validationErrors: error.validationErrors };
    }
  }
  // Handle specific Node.js errors
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    errorCode = ErrorCodes.INVALID_REQUEST_FORMAT;
    message = 'Validation failed';
    details = error.message;
  }
  else if (error.name === 'CastError') {
    statusCode = 400;
    errorCode = ErrorCodes.BAD_REQUEST;
    message = 'Invalid data format';
  }
  else if (error.message.includes('CORS')) {
    statusCode = 403;
    errorCode = ErrorCodes.FORBIDDEN;
    message = 'Cross-origin request blocked';
  }
  // Handle JSON syntax errors
  else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    errorCode = ErrorCodes.INVALID_REQUEST_FORMAT;
    message = 'Invalid JSON in request body';
  }

  // Log error for debugging
  logError(error, request, statusCode);

  // Create standardized error response
  const errorResponse: ErrorResponse = {
    success: false,
    message,
    code: errorCode,
    timestamp: new Date().toISOString(),
    details: config.NODE_ENV === 'development' ? details : undefined
  };

  response.status(statusCode).json(errorResponse);
};
```

### Error Logging Function

```typescript
const logError = (error: Error, request: Request, statusCode: number): void => {
  const timestamp = new Date().toISOString();
  const { method, url, ip } = request;
  const userAgent = request.get('User-Agent') || 'Unknown';

  console.error(`💥 [${timestamp}] Error in ${method} ${url}:`);
  console.error(`   Status: ${statusCode}`);
  console.error(`   Message: ${error.message}`);
  console.error(`   IP: ${ip}`);
  console.error(`   User-Agent: ${userAgent}`);

  // Additional details in development
  if (config.NODE_ENV === 'development') {
    console.error(`   Stack: ${error.stack}`);

    if (request.body && Object.keys(request.body).length > 0) {
      console.error(`   Request Body: ${JSON.stringify(request.body, null, 2)}`);
    }
  }

  // Categorize error type
  if (error instanceof AppError && error.isOperational) {
    console.error(`   Type: Operational Error (expected)`);
  } else {
    console.error(`   Type: Programming Error (unexpected)`);

    // Send alerts for programming errors in production
    if (config.NODE_ENV === 'production') {
      // TODO: Send to error monitoring service (Sentry, DataDog, etc.)
    }
  }
};
```

---

## Validation Error Patterns

### Express-Validator Integration

```typescript
export const handleValidationErrors = (
  request: Request,
  response: Response,
  next: NextFunction
): void => {
  const errors = validationResult(request);

  if (!errors.isEmpty()) {
    // Convert express-validator errors to our format
    const validationErrors: ValidationError[] = errors.array().map(error => ({
      field: error.type === 'field' ? (error as any).path : 'unknown',
      message: error.msg,
      value: error.type === 'field' ? (error as any).value : undefined
    }));

    const errorResponse: ErrorResponse = {
      success: false,
      message: 'Validation failed',
      code: ErrorCodes.INVALID_FIELD_VALUE,
      timestamp: new Date().toISOString(),
      validationErrors
    };

    response.status(400).json(errorResponse);
    return;
  }

  next();
};
```

**📚 Comprehensive Validation Guide:** See [Validation Strategies](/docs/validation-strategies.md) for detailed validation patterns and implementation strategies.

### Custom Validation Functions

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateFields = (
  data: Record<string, any>,
  rules: Record<string, ((value: any) => ValidationError | null)[]>
): ValidationResult => {
  const errors: ValidationError[] = [];

  Object.entries(rules).forEach(([field, validators]) => {
    const value = data[field];

    validators.forEach(validator => {
      const error = validator(value);
      if (error) {
        errors.push(error);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Usage example
const validateUserData = (userData: any): ValidationResult => {
  return validateFields(userData, {
    name: [
      ValidationRules.required('name'),
      ValidationRules.length('name', 1, 100)
    ],
    email: [
      ValidationRules.required('email'),
      ValidationRules.email('email')
    ]
  });
};
```

---

## Async Error Handling

### Async Handler Wrapper

```typescript
export const asyncHandler = (
  handler: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (request: Request, response: Response, next: NextFunction): void => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
};
```

### Usage in Controllers

```typescript
// Without async handler (manual error handling)
export const getHealthBad = async (request: Request, response: Response, next: NextFunction) => {
  try {
    const healthData = await performHealthCheck();
    sendSuccess(response, healthData);
  } catch (error) {
    next(error); // Must manually forward errors
  }
};

// With async handler (automatic error handling)
export const getHealth = asyncHandler(async (request: Request, response: Response) => {
  const healthData = await performHealthCheck();
  sendSuccess(response, healthData);
  // Any thrown error automatically caught and forwarded
});
```

### Promise Error Handling

```typescript
// Handle promise rejections globally
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);

  // Graceful shutdown
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);

  // Graceful shutdown
  process.exit(1);
});
```

---

## Error Response Formatting

### Standardized Error Response

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  code: string;
  timestamp: string;
  details?: any;
  validationErrors?: ValidationError[];
}
```

### Error Response Helpers

```typescript
export const ErrorResponses = {
  badRequest: (response: Response, message: string = 'Bad Request', details?: any): void => {
    sendError(response, 400, message, ErrorCodes.BAD_REQUEST, details);
  },

  unauthorized: (response: Response, message: string = 'Unauthorized'): void => {
    sendError(response, 401, message, ErrorCodes.UNAUTHORIZED);
  },

  forbidden: (response: Response, message: string = 'Forbidden'): void => {
    sendError(response, 403, message, ErrorCodes.FORBIDDEN);
  },

  notFound: (response: Response, message: string = 'Resource not found'): void => {
    sendError(response, 404, message, ErrorCodes.NOT_FOUND);
  },

  validation: (response: Response, errors: ValidationError[]): void => {
    const errorResponse: ErrorResponse = {
      success: false,
      message: 'Validation failed',
      code: ErrorCodes.INVALID_FIELD_VALUE,
      timestamp: new Date().toISOString(),
      validationErrors: errors
    };

    response.status(400).json(errorResponse);
  },

  internalError: (response: Response, message: string = 'Internal Server Error'): void => {
    sendError(response, 500, message, ErrorCodes.INTERNAL_ERROR);
  }
};
```

### Usage Examples

```typescript
// In controllers
export const getUser = asyncHandler(async (request: Request, response: Response) => {
  const { id } = request.params;

  if (!id) {
    return ErrorResponses.badRequest(response, 'User ID is required');
  }

  const user = await findUserById(id);

  if (!user) {
    return ErrorResponses.notFound(response, `User with ID ${id} not found`);
  }

  sendSuccess(response, user);
});
```

---

## Error Monitoring and Alerting

### Error Tracking Integration

```typescript
// Example integration with error monitoring service
const sendErrorToMonitoring = (error: Error, context: any): void => {
  if (config.NODE_ENV === 'production') {
    // Send to Sentry, DataDog, or other monitoring service
    console.log('Sending error to monitoring service:', {
      message: error.message,
      stack: error.stack,
      context
    });
  }
};

// Enhanced error logging with monitoring
const logErrorWithMonitoring = (error: Error, request: Request): void => {
  logError(error, request, 500);

  // Send programming errors to monitoring
  if (!(error instanceof AppError) || !error.isOperational) {
    sendErrorToMonitoring(error, {
      url: request.url,
      method: request.method,
      headers: request.headers,
      body: request.body,
      ip: request.ip
    });
  }
};
```

### Health Check Error Handling

```typescript
export const getDetailedHealth = asyncHandler(async (request: Request, response: Response) => {
  try {
    const healthData = await performDetailedHealthCheck();
    sendSuccess(response, healthData, 'Detailed health information');
  } catch (error) {
    // Health check failures should return degraded status, not errors
    const healthData: HealthResponse = {
      status: 'DEGRADED',
      timestamp: new Date().toISOString(),
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };

    sendSuccess(response, healthData, 'Health check completed with issues');
  }
});
```

---

## Best Practices Summary

### Error Classification
- ✅ Distinguish between operational and programming errors
- ✅ Use appropriate HTTP status codes for different error types
- ✅ Implement consistent error codes for programmatic handling
- ✅ Categorize errors by severity and type

### Error Handling
- ✅ Use custom error classes with proper inheritance
- ✅ Implement global error handler middleware
- ✅ Use async error wrappers for promise-based handlers
- ✅ Handle unhandled promise rejections and exceptions

### Response Formatting
- ✅ Provide consistent error response structure
- ✅ Include timestamps and error codes for debugging
- ✅ Structure validation errors for client processing
- ✅ Avoid exposing sensitive information in error messages

### Monitoring and Debugging
- ✅ Log errors with appropriate detail level
- ✅ Integrate with error monitoring services in production
- ✅ Include request context in error logs
- ✅ Implement health check error handling

### Security
- ✅ Sanitize error messages to prevent information leakage
- ✅ Use different error detail levels for different environments
- ✅ Log security-related errors for audit purposes
- ✅ Implement rate limiting for error-prone endpoints

**📚 Security Best Practices:** See [Web Security Guide](/docs/web-security-guide.md) for comprehensive security guidance including XSS prevention, SQL injection protection, and secure error handling.