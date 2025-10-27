# Request-Response Model - The Heart of HTTP Communication

Master the fundamental communication pattern that powers every web interaction, from simple page loads to complex API operations.

## 🎯 What You'll Learn

- **Request structure** - URL, method, headers, and body components
- **Response structure** - Status codes, headers, and content
- **Communication flow** - How requests and responses work together
- **Practical examples** from our TCSS-460-auth-squared API

## 🧭 Learning Path Navigation

**📚 Previous:** [Client-Server Architecture](/docs/client-server-architecture.md) - Architectural foundation
**📚 Next:** [HTTP Methods](/docs/http-methods.md) - Request types in detail

**🔧 Practice:** Test request-response cycles at [Swagger UI](http://localhost:8000/api-docs)
**✋ Hands-On:** See implementations in `/src/routes/` directories

---

## What is the Request-Response Model?

The **Request-Response Model** is HTTP's fundamental communication pattern:

1. **Client sends a request** - "I want something"
2. **Server processes the request** - "Let me handle that"
3. **Server sends a response** - "Here's what you asked for" or "Here's what went wrong"
4. **Client processes the response** - "Now I'll do something with this"

### The Conversation Analogy

```
Customer: "Can I have a menu?" (REQUEST)
Waiter: "Here's the menu" (RESPONSE)

Customer: "I'll have the pasta" (REQUEST)
Waiter: "One pasta coming up" (RESPONSE)

Customer: "Can I have ice cream?" (REQUEST)
Waiter: "Sorry, we're out" (ERROR RESPONSE)
```

**🎯 Learning Objective:** Understand that every HTTP interaction follows this pattern

---

## HTTP Request Structure

### Complete Request Anatomy

```http
POST /auth/register HTTP/1.1
Host: localhost:8000
Content-Type: application/json
Accept: application/json
User-Agent: Mozilla/5.0 (Chrome)
Content-Length: 89

{"username": "newuser", "email": "user@example.com", "password": "SecurePass123!"}
```

Let's break this down:

### 1. Request Line

```http
POST /auth/register HTTP/1.1
```

**Components:**
- **Method:** `POST` - What operation to perform
- **Path:** `/auth/register` - What resource to target
- **Protocol Version:** `HTTP/1.1` - Which HTTP version to use

### 2. Request Headers

```http
Host: localhost:8000
Content-Type: application/json
Accept: application/json
User-Agent: Mozilla/5.0 (Chrome)
Content-Length: 89
```

**Purpose:** Provide metadata about the request

**Common Headers:**
- **Host:** Server address (required in HTTP/1.1)
- **Content-Type:** Format of request body data
- **Accept:** What response formats client can handle
- **User-Agent:** Information about the client software
- **Authorization:** Authentication credentials

### 3. Request Body (Optional)

```json
{"username": "newuser", "email": "user@example.com", "password": "SecurePass123!"}
```

**When used:** POST, PUT, PATCH requests that send data
**Formats:** JSON, form data, XML, binary, etc.

**🔧 Try It:** Send this exact request using the `POST /auth/register` endpoint in [Swagger UI](http://localhost:8000/api-docs)

---

## HTTP Response Structure

### Complete Response Anatomy

```http
HTTP/1.1 201 Created
Content-Type: application/json
Content-Length: 235
Date: Mon, 15 Jan 2024 10:30:00 GMT
Server: Express

{
  "success": true,
  "data": {
    "user": {
      "userid": 1,
      "username": "newuser",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### 1. Status Line

```http
HTTP/1.1 201 Created
```

**Components:**
- **Protocol Version:** `HTTP/1.1`
- **Status Code:** `201` - Numeric result indicator
- **Reason Phrase:** `Created` - Human-readable description

### 2. Response Headers

```http
Content-Type: application/json
Content-Length: 142
Date: Mon, 15 Jan 2024 10:30:00 GMT
Server: Express
```

**Common Headers:**
- **Content-Type:** Format of response body
- **Content-Length:** Size of response body in bytes
- **Date:** When the response was generated
- **Server:** Information about server software

### 3. Response Body

```json
{
  "success": true,
  "data": {
    "user": {
      "userid": 1,
      "username": "newuser",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Our API's Consistent Format:**
- **success:** Boolean indicating operation result
- **data:** The actual response content
- **message:** Optional human-readable description
- **timestamp:** When the response was generated

---

## Request-Response Flow in Detail

### Step-by-Step Process

**1. Client Prepares Request**
```javascript
// Browser JavaScript preparing a request
const requestData = {
    username: "newuser",
    email: "user@example.com",
    password: "SecurePass123!"
};

const request = {
    method: 'POST',
    url: '/auth/register',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify(requestData)
};
```

**2. Network Transmission**
```
[Client] ──── HTTP Request ────→ [Network] ──── HTTP Request ────→ [Server]
```

**3. Server Receives and Routes**
```typescript
// Our Express server routing
app.use('/', routes);
// routes.use('/auth', authRoutes);
// router.post('/register', register);
```

**4. Server Processes Request**
```typescript
// src/controllers/authController.ts
export const register = asyncHandler(async (
    request: Request,
    response: Response
): Promise<void> => {
    // Extract and validate data
    const { username, email, password } = request.body;

    // Process the request (hash password, create user, generate token)
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await createUser(username, email, hashedPassword);
    const token = generateAccessToken(newUser);

    // Send standardized response
    sendSuccess(response, { user: newUser, token }, 'User registered successfully', 201);
});
```

**5. Server Sends Response**
```typescript
// Response helper from our utilities
export const sendSuccess = <T>(
    response: Response,
    data: T,
    message?: string,
    statusCode: number = 200
): void => {
    const apiResponse: ApiResponse<T> = {
        success: true,
        data,
        message,
        timestamp: new Date().toISOString()
    };

    response.status(statusCode).json(apiResponse);
};
```

**6. Client Receives and Processes**
```javascript
// Client handling the response
fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        username: "newuser",
        email: "user@example.com",
        password: "SecurePass123!"
    })
})
.then(response => {
    if (response.ok) {
        return response.json();
    }
    throw new Error(`HTTP ${response.status}`);
})
.then(data => {
    if (data.success) {
        console.log('Success:', data.data);
        // Store the token for authenticated requests
        localStorage.setItem('token', data.data.token);
    } else {
        console.error('API Error:', data.message);
    }
})
.catch(error => {
    console.error('Network Error:', error);
});
```

**🔧 Try It:** Test this complete flow using `POST /auth/register` in [Swagger UI](http://localhost:8000/api-docs)

---

## Different Types of Requests and Responses

### Simple POST Request (Login)

**Request:**
```http
POST /auth/login HTTP/1.1
Host: localhost:8000
Content-Type: application/json
Accept: application/json

{"email": "user@example.com", "password": "SecurePass123!"}
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "user": {
      "userid": 1,
      "username": "newuser",
      "email": "user@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "Login successful",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Authenticated Request with Headers

**Request:**
```http
GET /users/me HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "userid": 1,
    "username": "newuser",
    "email": "user@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Path Parameters Request

**Request:**
```http
GET /users/123 HTTP/1.1
Host: localhost:8000
Accept: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response:**
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "data": {
    "userid": 123,
    "username": "someuser",
    "email": "someuser@example.com",
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response

**Request:**
```http
POST /auth/register HTTP/1.1
Host: localhost:8000
Content-Type: application/json

{"username": "ab", "email": "invalid-email", "password": "123"}
```

**Response:**
```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "success": false,
  "message": "Validation failed",
  "code": "INVALID_FIELD_VALUE",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "validationErrors": [
    {
      "field": "username",
      "message": "Username must be at least 3 characters long",
      "value": "ab"
    },
    {
      "field": "email",
      "message": "Must be a valid email address",
      "value": "invalid-email"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters long",
      "value": "123"
    }
  ]
}
```

**🔧 Practice:** Try sending invalid data to test our error responses

---

## Headers Deep Dive

### Request Headers Explained

**Content-Type:**
```http
Content-Type: application/json
```
- Tells server what format the request body uses
- Common values: `application/json`, `application/x-www-form-urlencoded`, `multipart/form-data`

**Accept:**
```http
Accept: application/json
```
- Tells server what response formats client can handle
- Server should respond with compatible format

**Authorization:**
```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- Provides authentication credentials
- Our TCSS-460-auth-squared uses JWT tokens for protected routes

**User-Agent:**
```http
User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)
```
- Identifies the client software
- Helps servers optimize responses for different clients

### Response Headers Explained

**Content-Type:**
```http
Content-Type: application/json; charset=utf-8
```
- Tells client how to interpret response body
- Our API always responds with JSON

**Content-Length:**
```http
Content-Length: 156
```
- Size of response body in bytes
- Helps client know when full response is received

**Cache-Control:**
```http
Cache-Control: no-cache
```
- Instructions for caching behavior
- Our API uses `no-cache` for dynamic content

**🎯 Learning Objective:** Headers provide metadata that enables proper communication

---

## Status Codes in Context

### Success Responses (2xx)

**200 OK - Standard Success**
```typescript
// Our successful responses
sendSuccess(response, data, 'Operation completed successfully');
```

**201 Created - Resource Created**
```typescript
// When we create something new
sendSuccess(response, newResource, 'Resource created', 201);
```

### Client Error Responses (4xx)

**400 Bad Request - Invalid Input**
```typescript
// Our validation error responses
const errorResponse: ErrorResponse = {
    success: false,
    message: 'Validation failed',
    code: ErrorCodes.INVALID_FIELD_VALUE,
    timestamp: new Date().toISOString(),
    validationErrors
};
response.status(400).json(errorResponse);
```

**404 Not Found - Resource Doesn't Exist**
```typescript
// Our 404 handler
export const notFoundHandler = (request: Request, response: Response): void => {
    const errorResponse: ErrorResponse = {
        success: false,
        message: `Endpoint '${request.method} ${request.originalUrl}' not found`,
        code: ErrorCodes.NOT_FOUND,
        timestamp: new Date().toISOString()
    };
    response.status(404).json(errorResponse);
};
```

### Server Error Responses (5xx)

**500 Internal Server Error - Server Problem**
```typescript
// Our error handling middleware
export const errorHandler = (
    error: Error,
    request: Request,
    response: Response,
    next: NextFunction
): void => {
    console.error('💥 Unhandled error:', error);

    const errorResponse: ErrorResponse = {
        success: false,
        message: 'Internal server error',
        code: ErrorCodes.INTERNAL_ERROR,
        timestamp: new Date().toISOString()
    };

    response.status(500).json(errorResponse);
};
```

**🔧 Try It:** Test different scenarios in [Swagger UI](http://localhost:8000/api-docs) to see various status codes

---

## Practical Examples from Our API

### Health Check Flow

**Simple Health Check:**
```
Client Request: GET /health
↓
Server Processing: Check system status
↓
Server Response: 200 OK with health data
```

**Implementation:**
```typescript
export const getHealth = asyncHandler(async (
    request: Request,
    response: Response
): Promise<void> => {
    const healthData: HealthResponse = {
        status: 'OK',
        timestamp: new Date().toISOString()
    };

    sendSuccess(response, healthData, 'API is healthy');
});
```

### Parameter Validation Flow

**Request with Validation:**
```
Client Request: POST /auth/register with invalid data
↓
Server Processing: Validate request body
↓
Validation Fails: Missing required fields or invalid format
↓
Server Response: 400 Bad Request with validation errors
```

**Implementation:**
```typescript
// Validation middleware runs first
router.post('/register',
    [
        body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('email').isEmail().withMessage('Must be a valid email address'),
        body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    ],
    handleValidationErrors,  // This catches validation failures
    register                 // This only runs if validation passes
);
```

### Documentation Serving Flow

**Static Content Serving:**
```
Client Request: GET /docs/http-fundamentals.md
↓
Server Processing: Read markdown file, convert to HTML
↓
Server Response: 200 OK with styled HTML content
```

**Implementation:**
```typescript
router.get('/:filename', (req: Request, res: Response) => {
    const filename = req.params.filename;
    const docsPath = path.join(__dirname, '../../../docs');
    const filePath = path.join(docsPath, filename);

    const htmlContent = readMarkdownFile(filePath);

    if (!htmlContent) {
        return res.status(404).json({
            success: false,
            message: `Documentation file '${filename}' not found`
        });
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(htmlContent);
});
```

---

## Error Handling in Request-Response

### Common Error Scenarios

**1. Network Errors**
```javascript
// Client can't reach server
fetch('/auth/login')
.catch(error => {
    // Network error, server unreachable
    console.error('Connection failed:', error);
});
```

**2. HTTP Errors**
```javascript
// Server responds with error status
fetch('/invalid-endpoint')
.then(response => {
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
})
.catch(error => {
    console.error('HTTP error:', error);
});
```

**3. Parse Errors**
```javascript
// Response isn't valid JSON
fetch('/auth/login')
.then(response => response.json()) // This might fail
.catch(error => {
    console.error('Invalid JSON response:', error);
});
```

### Our API's Error Handling

**Consistent Error Format:**
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

**Error Response Examples:**
```json
// Validation error
{
  "success": false,
  "message": "Validation failed",
  "code": "INVALID_FIELD_VALUE",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "validationErrors": [
    {"field": "email", "message": "Valid email required"}
  ]
}

// Not found error
{
  "success": false,
  "message": "Endpoint 'GET /invalid' not found",
  "code": "NOT_FOUND",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**🎯 Learning Objective:** Consistent error handling improves client experience and debugging

---

## Best Practices for Request-Response

### Client-Side Best Practices

**1. Always Check Response Status**
```javascript
const response = await fetch('/auth/login');
if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Request failed');
}
```

**2. Set Appropriate Headers**
```javascript
fetch('/auth/login', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    },
    body: JSON.stringify(data)
});
```

**3. Handle All Error Cases**
```javascript
try {
    const response = await fetch('/auth/login');
    if (!response.ok) {
        const errorData = await response.json();
        handleApiError(errorData);
        return;
    }
    const data = await response.json();
    handleSuccess(data);
} catch (networkError) {
    handleNetworkError(networkError);
}
```

### Server-Side Best Practices

**1. Validate All Input**
```typescript
// Always validate request data
router.post('/endpoint',
    [
        body('field').notEmpty().withMessage('Field is required')
    ],
    handleValidationErrors,
    handler
);
```

**2. Use Consistent Response Format**
```typescript
// Standard success response
sendSuccess(response, data, message, statusCode);

// Standard error response
sendError(response, statusCode, message, errorCode, details);
```

**3. Set Appropriate Status Codes**
```typescript
// Use semantic status codes
response.status(200); // Success
response.status(201); // Created
response.status(400); // Client error
response.status(404); // Not found
response.status(500); // Server error
```

---

## Next Steps in Your Learning Journey

Now that you understand the request-response model, continue with:

1. **[HTTP Methods](/docs/http-methods.md)** - GET, POST, PUT, DELETE in detail
2. **[HTTP Status Codes](/docs/http-status-codes.md)** - Complete status code reference

**🔧 Immediate Practice:**
- Monitor Network tab in browser DevTools while using [our API](http://localhost:8000/api-docs)
- Try different request types and observe the request-response patterns

**✋ Hands-On Exploration:**
- Examine `/src/core/utilities/responseUtils.ts` for response patterns
- Look at `/src/core/middleware/validation.ts` for request processing
- Check `/src/routes/` for various request-response implementations

---

## Summary

The Request-Response Model is HTTP's fundamental communication pattern:

**Requests contain:**
- Method (what to do)
- URL (what resource)
- Headers (metadata)
- Body (optional data)

**Responses contain:**
- Status code (what happened)
- Headers (metadata)
- Body (the content)

**Key principles:**
- Each request is independent (stateless)
- Responses should be meaningful and consistent
- Error handling is as important as success handling
- Headers provide essential metadata for proper communication

Understanding this model is crucial because every web interaction—from loading a simple web page to complex API operations—follows this exact pattern.

**🎯 Key Takeaway:** Master the request-response model, and you understand the foundation of all web communication.

---

*Continue your learning with [HTTP Methods](/docs/http-methods.md) to explore the different types of requests you can make.*