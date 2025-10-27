# HTTP Status Codes - Understanding Server Responses

Learn about HTTP status codes through practical examples and see how our TCSS-460-auth-squared uses these standardized response codes to communicate the results of client requests.

## 🎯 What You'll Learn

By studying this guide, you'll understand:

- **What HTTP status codes are** and why they're essential for web communication
- **Complete status code categories** and their meanings
- **Practical examples** from our TCSS-460-auth-squared implementation
- **Best practices** for API developers and client handling
- **Common troubleshooting scenarios** and their status codes

## 🧭 Learning Path

**📚 Study Path:**
1. [HTTP Fundamentals](/docs/http-fundamentals.md) - Foundation concepts
2. [HTTP Methods](/docs/http-methods.md) - Request types and semantics
3. **HTTP Status Codes** (this document) - Response meanings
4. [Request-Response Model](/docs/request-response-model.md) - Complete communication cycle
5. [Error Handling Patterns](/docs/error-handling-patterns.md) - Robust error management

**🔧 Practice:**
- Test status codes at [Swagger UI](http://localhost:8000/api-docs)
- Examine our error responses in different scenarios
- Try invalid requests to see error status codes

**✋ Hands-On:**
- Review `/src/core/middleware/errorHandler.ts` for status code implementation
- Test `/src/controllers/authController.ts` to see successful status codes
- Examine `/src/core/utilities/responseUtils.ts` for response patterns

---

## What Are HTTP Status Codes?

**HTTP Status Codes** are **three-digit numbers** that servers send to clients to indicate the **result of a request**. They provide a standardized way to communicate whether a request succeeded, failed, or requires additional action.

### Think of Status Codes Like Traffic Lights

```
🟢 Green Light (2xx) = "Success - proceed"
🟡 Yellow Light (3xx) = "Redirect - go elsewhere"
🔴 Red Light (4xx) = "Stop - client error"
🛑 Broken Light (5xx) = "Stop - server problem"
ℹ️ Info Sign (1xx) = "Processing - wait a moment"
```

### Why Status Codes Matter

**🎯 Learning Objective:** Understand how status codes enable reliable client-server communication

Status codes are crucial because they:

- **Standardize communication** - Universal meaning across all web services
- **Enable error handling** - Clients can respond appropriately to different conditions
- **Improve debugging** - Developers can quickly identify problem types
- **Support automation** - Programs can make decisions based on status codes

**Real Example:** When you visit a broken link (404), your browser knows to show an error page instead of trying to display invalid content.

---

## Status Code Categories

HTTP status codes are organized into **five categories** based on their first digit:

### 1xx - Informational Responses

**Purpose:** Server acknowledges the request and is continuing to process it.

**When to Use:** Rarely needed in typical REST APIs, mainly for HTTP/1.1 protocol features.

| Code | Name | Meaning | Example Use Case |
|------|------|---------|------------------|
| **100** | Continue | Server received headers, client should continue | Large file uploads |
| **101** | Switching Protocols | Server is switching to different protocol | WebSocket upgrade |
| **102** | Processing | Server received request and is processing | Long-running operations |

**🎯 Learning Note:** Our TCSS-460-auth-squared doesn't use 1xx codes as they're uncommon in REST APIs.

### 2xx - Success Responses

**Purpose:** Request was received, understood, and accepted successfully.

**When to Use:** Every successful API operation should return a 2xx status code.

| Code | Name | Meaning | Example Use Case |
|------|------|---------|------------------|
| **200** | OK | Standard successful response | `GET /health` returns data |
| **201** | Created | Resource successfully created | `POST /auth/register` creates user |
| **204** | No Content | Success but no content to return | `DELETE /admin/users/:id` removes resource |
| **206** | Partial Content | Returning partial data | Paginated results or range requests |

**🔧 Try Our Examples:**
- **200 OK**: `POST /auth/login` - Returns JWT token on successful login
- **201 Created**: `POST /auth/register` - Creates a new user account
- **200 OK**: `GET /health` - System status check

### 3xx - Redirection Responses

**Purpose:** Client must take additional action to complete the request.

**When to Use:** When resources have moved or client should access a different URL.

| Code | Name | Meaning | Example Use Case |
|------|------|---------|------------------|
| **301** | Moved Permanently | Resource has new permanent URL | Domain changes |
| **302** | Found | Resource temporarily at different URL | Maintenance redirects |
| **304** | Not Modified | Resource hasn't changed since last request | Caching optimization |
| **308** | Permanent Redirect | Like 301 but preserves request method | API versioning |

**Real Example:** When `/docs` redirects you to `/docs/` (with trailing slash), that's a 301 redirect.

### 4xx - Client Error Responses

**Purpose:** Request contains bad syntax or cannot be fulfilled due to client issues.

**When to Use:** Client sent invalid data, lacks permissions, or requested non-existent resources.

| Code | Name | Meaning | Example Use Case |
|------|------|---------|------------------|
| **400** | Bad Request | Invalid request syntax or parameters | Malformed JSON body |
| **401** | Unauthorized | Authentication required or invalid | Missing/invalid API key |
| **403** | Forbidden | Server understood but refuses to authorize | Insufficient permissions |
| **404** | Not Found | Requested resource doesn't exist | `/nonexistent-endpoint` |
| **405** | Method Not Allowed | HTTP method not supported for resource | `PUT /health` (only GET allowed) |
| **422** | Unprocessable Entity | Request well-formed but semantically incorrect | Valid JSON but business rule violation |
| **429** | Too Many Requests | Rate limiting in effect | Exceeded API call limits |

**🔧 Try Our Error Examples:**
- **404 Not Found**: `GET /nonexistent` - Tests our 404 handler
- **405 Method Not Allowed**: `PUT /health` - Health endpoint only supports GET
- **400 Bad Request**: `POST /auth/login` with invalid JSON

### 5xx - Server Error Responses

**Purpose:** Server failed to fulfill a valid request due to server-side issues.

**When to Use:** Server encounters unexpected errors, database issues, or service failures.

| Code | Name | Meaning | Example Use Case |
|------|------|---------|------------------|
| **500** | Internal Server Error | Generic server error | Unhandled exceptions |
| **502** | Bad Gateway | Invalid response from upstream server | Proxy/gateway issues |
| **503** | Service Unavailable | Server temporarily overloaded or down | Maintenance mode |
| **504** | Gateway Timeout | Upstream server didn't respond in time | Database connection timeout |

**🎯 Key Difference:** 4xx = Client's fault, 5xx = Server's fault

---

## Important Status Codes in Detail

### 200 OK - The Standard Success

**When to Use:** Most successful GET, PUT, PATCH operations.

**Our Implementation:**
```typescript
// From /src/controllers/authController.ts
export const login = asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const { email, password } = request.body;
    const user = await User.findOne({ where: { email } });

    // Validate credentials and generate JWT token
    const token = generateToken(user);
    sendSuccess(response, { token, user }, 'Login successful');
    // This sends a 200 OK by default
});
```

**🔧 Test It:** `POST /auth/login` - See our consistent 200 response format

### 201 Created - Resource Creation Success

**When to Use:** Successful POST operations that create new resources.

**Our Implementation:**
```typescript
// From /src/controllers/authController.ts
export const register = asyncHandler(async (request: Request, response: Response): Promise<void> => {
    const { email, password, name } = request.body;
    const newUser = await User.create({ email, password, name });
    sendSuccess(response, newUser, 'User registered successfully', 201);
    // Explicitly sets 201 status code
});
```

**🔧 Test It:** `POST /auth/register` - Notice the 201 status code for creation

### 400 Bad Request - Invalid Client Input

**When to Use:** Client sends malformed requests, invalid parameters, or bad JSON.

**Our Implementation:**
```typescript
// From /src/core/middleware/errorHandler.ts
else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    errorCode = ErrorCodes.INVALID_REQUEST_FORMAT;
    message = 'Invalid JSON in request body';
}
```

**🔧 Test It:** Send invalid JSON to `POST /auth/login` to trigger 400 response

**📚 Learn More:** [Validation Strategies](/docs/validation-strategies.md) - Comprehensive input validation guide

### 401 Unauthorized - Authentication Required

**When to Use:** Client must authenticate before accessing the resource.

**Our Implementation:**
```typescript
// From /src/core/middleware/errorHandler.ts
else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = ErrorCodes.UNAUTHORIZED;
    message = 'Invalid authentication token';
}
```

**Educational Note:** Our TCSS-460-auth-squared requires JWT authentication for protected routes and returns 401 for invalid or missing tokens.

### 404 Not Found - Resource Doesn't Exist

**When to Use:** Requested resource cannot be found.

**Our Implementation:**
```typescript
// From /src/core/middleware/errorHandler.ts
export const notFoundHandler = (request: Request, response: Response, next: NextFunction): void => {
    const error = new AppError(
        `Route ${request.method} ${request.url} not found`,
        404,
        ErrorCodes.NOT_FOUND
    );
    next(error);
};
```

**🔧 Test It:** `GET /nonexistent-endpoint` - See our standardized 404 response

### 500 Internal Server Error - Server Problems

**When to Use:** Unexpected server errors, unhandled exceptions.

**Our Implementation:**
```typescript
// From /src/core/middleware/errorHandler.ts
export const errorHandler = (error: Error | AppError, request: Request, response: Response, next: NextFunction): void => {
    let statusCode = 500; // Default to 500 for unexpected errors
    let errorCode = ErrorCodes.INTERNAL_ERROR;
    let message = 'Internal Server Error';

    // Handle specific error types or use defaults
    // ...
};
```

**Educational Note:** Our robust error handler ensures all unhandled errors become proper 500 responses.

**📚 Learn More:**
- [Web Security Guide](/docs/web-security-guide.md) - Security best practices
- [Database Fundamentals](/docs/database-fundamentals.md) - Database error handling

---

## Real Examples from Our TCSS-460-auth-squared

### Successful Operations

**POST Requests - 200 OK:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
# Response: 200 OK with JWT token

curl http://localhost:8000/health
# Response: 200 OK with health status
```

**POST Requests - 201 Created:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "new@example.com", "password": "secure123", "name": "John Doe"}'
# Response: 201 Created with new user account
```

### Client Errors (4xx)

**404 Not Found:**
```bash
curl http://localhost:8000/admin/users/99999
# Response: 404 Not Found - User with ID not found
```

**401 Unauthorized:**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "wrongpass"}'
# Response: 401 Unauthorized - Invalid credentials
```

**400 Bad Request:**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "password": "short"}'
# Response: 400 Bad Request - Invalid email format or password too short
```

### Our Consistent Error Response Format

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Human-readable error description",
  "errorCode": "MACHINE_READABLE_ERROR_CODE"
}
```

**🔧 Explore:** Test different endpoints at [Swagger UI](http://localhost:8000/api-docs) to see this consistent format.

---

## Educational Concepts

### Why Different Status Codes Exist

**🎯 Learning Objective:** Understand the reasoning behind HTTP status code design

1. **Precise Communication:** Each code conveys specific meaning
   - 200 = "I have your data"
   - 404 = "That doesn't exist"
   - 500 = "I have a problem"

2. **Client Decision Making:** Status codes enable smart client behavior
   - 404 → Show "Page Not Found" message
   - 503 → Retry request later
   - 401 → Redirect to login page

3. **Debugging Efficiency:** Developers can quickly identify issue types
   - 4xx → Check client code/input
   - 5xx → Check server logs/infrastructure

### How Clients Should Handle Different Codes

**Success Codes (2xx):**
```javascript
if (response.status >= 200 && response.status < 300) {
    // Process successful response
    displayData(response.data);
}
```

**Client Errors (4xx):**
```javascript
if (response.status >= 400 && response.status < 500) {
    // Handle client-side issues
    if (response.status === 401) {
        redirectToLogin();
    } else if (response.status === 404) {
        showNotFoundMessage();
    } else {
        showErrorMessage(response.data.message);
    }
}
```

**Server Errors (5xx):**
```javascript
if (response.status >= 500) {
    // Handle server-side issues
    showErrorMessage("Server error. Please try again later.");
    // Optionally implement retry logic
}
```

### Best Practices for API Developers

**🎯 Learning Objective:** Learn how to choose appropriate status codes

1. **Be Specific:** Use precise codes rather than generic ones
   - ✅ 422 for validation errors (not generic 400)
   - ✅ 409 for conflicts (not generic 400)

2. **Be Consistent:** Same operations should return same codes
   - All successful GET requests → 200
   - All successful POST requests → 201
   - All validation errors → 422

3. **Provide Context:** Include helpful error messages
   ```json
   {
     "success": false,
     "message": "Invalid email format",
     "errorCode": "VALIDATION_ERROR"
   }
   ```

---

## Common Scenarios and Troubleshooting

### Scenario 1: User Requests Non-Existent Data

**Request:** `GET /admin/users/99999`
**Appropriate Response:** `404 Not Found`
**Why:** The specific user ID doesn't exist

**Our Example:** `GET /admin/users/99999` → 404 Not Found

### Scenario 2: User Submits Invalid Data

**Request:** `POST /auth/register` with invalid email or short password
**Appropriate Response:** `400 Bad Request` or `422 Unprocessable Entity`
**Why:** Client sent structurally valid but semantically incorrect data

**Our Example:** Send invalid credentials to `POST /auth/register` → 400 Bad Request

### Scenario 3: Server Database Connection Fails

**Request:** Any request requiring database access
**Appropriate Response:** `503 Service Unavailable`
**Why:** Temporary server-side issue, might work if retried later

### Scenario 4: User Lacks Permission

**Request:** `POST /admin/users/create` by user with insufficient role level
**Appropriate Response:** `403 Forbidden`
**Why:** User is authenticated but lacks necessary permissions

### Scenario 5: API Rate Limit Exceeded

**Request:** 100th API call in a minute (with 99 call/minute limit)
**Appropriate Response:** `429 Too Many Requests`
**Why:** Client exceeded allowed request frequency

---

## Status Code Selection Guide

Use this flowchart approach when determining status codes:

```
1. Did the operation succeed?
   ├── Yes → Use 2xx codes
   │   ├── Data retrieved → 200 OK
   │   ├── Resource created → 201 Created
   │   └── Success, no content → 204 No Content
   │
   └── No → Continue to step 2

2. Is it a client problem?
   ├── Yes → Use 4xx codes
   │   ├── Bad input format → 400 Bad Request
   │   ├── Needs authentication → 401 Unauthorized
   │   ├── Insufficient permissions → 403 Forbidden
   │   ├── Resource not found → 404 Not Found
   │   ├── Wrong HTTP method → 405 Method Not Allowed
   │   ├── Valid format, invalid data → 422 Unprocessable Entity
   │   └── Too many requests → 429 Too Many Requests
   │
   └── No → Use 5xx codes

3. Server problem:
   ├── Generic error → 500 Internal Server Error
   ├── Service temporarily down → 503 Service Unavailable
   ├── Gateway/proxy issue → 502 Bad Gateway
   └── Timeout → 504 Gateway Timeout
```

---

## Implementation in Our Codebase

### Error Handler Middleware

Our global error handler (`/src/core/middleware/errorHandler.ts`) demonstrates proper status code usage:

```typescript
export const errorHandler = (error: Error | AppError, request: Request, response: Response, next: NextFunction): void => {
    let statusCode = 500; // Default to server error
    let errorCode = ErrorCodes.INTERNAL_ERROR;
    let message = 'Internal Server Error';

    // Handle custom AppError instances
    if (error instanceof AppError) {
        statusCode = error.statusCode; // Use specified status code
        errorCode = error.errorCode;
        message = error.message;
    }
    // Handle specific error types
    else if (error.name === 'ValidationError') {
        statusCode = 400; // Client error for validation
        errorCode = ErrorCodes.INVALID_REQUEST_FORMAT;
        message = 'Validation failed';
    }
    // ... more specific error handling

    // Create standardized error response
    const errorResponse: ErrorResponse = {
        success: false,
        message,
        errorCode
    };

    response.status(statusCode).json(errorResponse);
};
```

### Response Utilities

Our response utilities (`/src/core/utilities/responseUtils.ts`) provide helpers for common status codes:

```typescript
export const ErrorResponses = {
    badRequest: (response: Response, message: string = 'Bad Request'): void => {
        sendError(response, 400, message, ErrorCodes.BAD_REQUEST);
    },

    unauthorized: (response: Response, message: string = 'Unauthorized'): void => {
        sendError(response, 401, message, ErrorCodes.UNAUTHORIZED);
    },

    notFound: (response: Response, message: string = 'Resource not found'): void => {
        sendError(response, 404, message, ErrorCodes.NOT_FOUND);
    },

    internalError: (response: Response, message: string = 'Internal Server Error'): void => {
        sendError(response, 500, message, ErrorCodes.INTERNAL_ERROR);
    }
};
```

**🔧 Explore:** Review these files to see how status codes are implemented in practice.

---

## Testing Status Codes

### Using Swagger UI

1. **Open [Swagger UI](http://localhost:8000/api-docs)**
2. **Try different endpoints:**
   - `POST /auth/login` → Expect 200 OK (with valid credentials)
   - `POST /auth/register` → Expect 201 Created
   - `GET /admin/users/99999` → Expect 404 Not Found

3. **Check response codes** in the Swagger interface

### Using curl Commands

**Test successful requests:**
```bash
curl -i -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"password123"}'
# Look for "HTTP/1.1 200 OK" in response headers

curl -i -X POST http://localhost:8000/auth/register -H "Content-Type: application/json" -d '{"email":"new@example.com","password":"secure123","name":"John"}'
# Look for "HTTP/1.1 201 Created"
```

**Test error conditions:**
```bash
curl -i http://localhost:8000/admin/users/99999
# Look for "HTTP/1.1 404 Not Found"

curl -i -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" -d '{"email":"user@example.com","password":"wrongpass"}'
# Look for "HTTP/1.1 401 Unauthorized"
```

The `-i` flag includes response headers so you can see the status codes.

---

## Next Steps in Your Learning Journey

Now that you understand HTTP status codes, continue with:

1. **[Request-Response Model](/docs/request-response-model.md)** - Complete communication cycle
2. **[Error Handling Patterns](/docs/error-handling-patterns.md)** - Robust error management strategies
3. **[Node.js & Express Architecture](/docs/node-express-architecture.md)** - Server implementation patterns

**🔧 Immediate Practice:**
- Test all endpoints in [our API documentation](http://localhost:8000/api-docs)
- Pay attention to status codes returned by each endpoint
- Try invalid requests to see different error codes

**✋ Hands-On Exploration:**
- Study `/src/core/middleware/errorHandler.ts` for error status code mapping
- Review `/src/controllers/authController.ts` for success status codes
- Examine `/src/core/utilities/responseUtils.ts` for response patterns

---

## Summary

HTTP status codes are **essential for reliable web communication** because they:

- **Standardize responses** across all web services and APIs
- **Enable smart client behavior** through predictable response patterns
- **Improve debugging** by categorizing issues as client vs server problems
- **Support automation** by providing machine-readable response indicators

**🎯 Key Takeaways:**
- **2xx codes** = Success (200 OK, 201 Created)
- **4xx codes** = Client errors (400 Bad Request, 404 Not Found)
- **5xx codes** = Server errors (500 Internal Error, 503 Service Unavailable)
- **Consistency matters** - same operations should return same codes
- **Context helps** - meaningful error messages improve developer experience

Understanding and properly implementing status codes is crucial for building reliable APIs that clients can depend on and developers can easily debug.

---

*Continue your learning with [Request-Response Model](/docs/request-response-model.md) to understand the complete HTTP communication cycle.*