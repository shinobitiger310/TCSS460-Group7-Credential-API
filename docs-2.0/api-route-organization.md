# API Route Organization - Building Secure, Scalable Access Control

A comprehensive guide to organizing API routes by access level, implementing middleware-based security layers, and building maintainable authentication systems.

> **💡 Related Code**: See implementations in [`/src/routes/index.ts`](../src/routes/index.ts), [`/src/routes/open/index.ts`](../src/routes/open/index.ts), [`/src/routes/closed/index.ts`](../src/routes/closed/index.ts), and [`/src/routes/admin/index.ts`](../src/routes/admin/index.ts)

## Quick Navigation
- 🌐 **Main Router**: [`routes/index.ts`](../src/routes/index.ts) - Route composition and mounting
- 🔓 **Open Routes**: [`routes/open/index.ts`](../src/routes/open/index.ts) - Public authentication endpoints
- 🔒 **Closed Routes**: [`routes/closed/index.ts`](../src/routes/closed/index.ts) - JWT-protected user endpoints
- 👑 **Admin Routes**: [`routes/admin/index.ts`](../src/routes/admin/index.ts) - Role-based administrative operations
- 🛡️ **JWT Middleware**: [`middleware/jwt.ts`](../src/core/middleware/jwt.ts) - Token validation
- 🔐 **Admin Auth**: [`middleware/adminAuth.ts`](../src/core/middleware/adminAuth.ts) - Role hierarchy enforcement
- 🔗 **Related**: [Node.js & Express Architecture](./node-express-architecture.md) - Server patterns
- 🔗 **Related**: [HTTP Methods](./http-methods.md) - Request types and semantics

## Table of Contents

- [Why Organize Routes by Access Level?](#why-organize-routes-by-access-level)
- [Three-Tier Route Architecture](#three-tier-route-architecture)
- [Open Routes - Public Access](#open-routes---public-access)
- [Closed Routes - Authenticated Users](#closed-routes---authenticated-users)
- [Admin Routes - Role-Based Access](#admin-routes---role-based-access)
- [Main Router Composition](#main-router-composition)
- [Middleware Stacking Patterns](#middleware-stacking-patterns)
- [Security Boundaries](#security-boundaries)
- [Adding New Endpoints](#adding-new-endpoints)
- [Best Practices](#best-practices)
- [Common Mistakes](#common-mistakes)

---

## Why Organize Routes by Access Level?

### The Problem with Flat Route Organization

Many beginners organize routes by resource type:

```
❌ Poor Organization:
/routes
  ├── userRoutes.ts      (mix of public, authenticated, admin)
  ├── authRoutes.ts      (mix of open and authenticated)
  └── adminRoutes.ts     (inconsistent protection)
```

**Problems with this approach:**
- Security vulnerabilities (easy to forget middleware)
- Inconsistent authentication patterns
- Difficult to audit access controls
- Hard to understand security boundaries
- Mixing concerns across different protection levels

### The Solution: Access-Level Organization

Organize routes by **who can access them**, not just **what they do**:

```
✅ Clear Organization:
/routes
  ├── index.ts           (main router composition)
  ├── open/              (public - no authentication)
  ├── closed/            (authenticated - JWT required)
  └── admin/             (authorized - role required)
```

**Benefits of this approach:**
- **Clear security boundaries** - Easy to see what's protected
- **Consistent middleware** - Apply authentication at router level
- **Audit-friendly** - Security review is straightforward
- **Self-documenting** - Directory structure shows access levels
- **Separation of concerns** - Public vs authenticated vs admin logic

### Real-World Security Impact

**🎯 Learning Objective:** Understand how route organization prevents security vulnerabilities

```typescript
// ❌ DANGEROUS: Easy to forget middleware
router.post('/admin/users', validateUser, adminController.createUser);
// Oops! Forgot checkToken and requireAdmin - ANYONE can create users!

// ✅ SAFE: Middleware applied at router level
adminRoutes.use(checkToken);      // All admin routes require auth
adminRoutes.use(requireAdmin);    // All admin routes require role
adminRoutes.post('/users', validateUser, adminController.createUser);
// Now properly protected - can't forget!
```

---

## Three-Tier Route Architecture

Our TCSS-460-auth-squared implements a three-tier security model:

```
┌───────────────────────────────────────────────────────────────┐
│                        MAIN ROUTER                            │
│                    (/src/routes/index.ts)                     │
└────────────────────┬──────────────┬──────────────┬────────────┘
                     │              │              │
         ┌───────────▼────┐  ┌──────▼──────┐  ┌───▼──────────┐
         │  OPEN ROUTES   │  │   CLOSED    │  │    ADMIN     │
         │     (PUBLIC)   │  │   ROUTES    │  │   ROUTES     │
         │                │  │ (AUTH ONLY) │  │ (ROLE-BASED) │
         └────────────────┘  └─────────────┘  └──────────────┘
              No Auth           checkToken      checkToken +
                                                requireAdmin
```

### Access Level Flow

```
REQUEST → Main Router → Route Tier Selection → Middleware Stack → Controller
                              │
                              ├─ Open Routes → No middleware → Controller
                              │
                              ├─ Closed Routes → checkToken → Controller
                              │
                              └─ Admin Routes → checkToken → requireAdmin → Controller
```

### Security Layers

| Tier | Middleware | Who Can Access | Use Cases |
|------|-----------|----------------|-----------|
| **Open** | None | Anyone | Login, register, password reset |
| **Closed** | `checkToken` | Authenticated users | Change password, profile updates |
| **Admin** | `checkToken` + `requireAdmin` | Role ≥ 3 (Admin+) | User management, system operations |

---

## Open Routes - Public Access

### Overview

**Open routes** are publicly accessible endpoints that don't require authentication. These handle user onboarding, authentication, and public information.

**File:** `/src/routes/open/index.ts`

### What Belongs in Open Routes?

✅ **Authentication flows:**
- User registration
- Login/logout
- Password reset request
- Password reset completion

✅ **Public information:**
- API health checks
- Public documentation
- Email/phone verification confirmations
- Carrier information lists

✅ **Testing endpoints** (development only)

### Implementation Example

**Complete open routes file:**

```typescript
// src/routes/open/index.ts
import express, { Router } from 'express';
import { AuthController, VerificationController } from '@controllers';
import {
    validateLogin,
    validateRegister,
    validatePasswordReset,
    validatePasswordResetRequest
} from '@middleware';

const openRoutes: Router = express.Router();

// ===== AUTHENTICATION ROUTES =====

/**
 * Authenticate user and return JWT token
 * POST /auth/login
 */
openRoutes.post('/auth/login', validateLogin, AuthController.login);

/**
 * Register a new user (always creates basic user with role 1)
 * POST /auth/register
 */
openRoutes.post('/auth/register', validateRegister, AuthController.register);

// ===== PASSWORD RESET ROUTES =====

/**
 * Request password reset (requires verified email)
 * POST /auth/password/reset-request
 */
openRoutes.post(
    '/auth/password/reset-request',
    validatePasswordResetRequest,
    AuthController.requestPasswordReset
);

/**
 * Reset password with token
 * POST /auth/password/reset
 */
openRoutes.post(
    '/auth/password/reset',
    validatePasswordReset,
    AuthController.resetPassword
);

// ===== VERIFICATION ROUTES =====

/**
 * Get list of supported carriers
 * GET /auth/verify/carriers
 */
openRoutes.get('/auth/verify/carriers', VerificationController.getCarriers);

/**
 * Verify email token (can be accessed via link without authentication)
 * GET /auth/verify/email/confirm?token=xxx
 */
openRoutes.get(
    '/auth/verify/email/confirm',
    VerificationController.confirmEmailVerification
);

// ===== TESTING ROUTES =====

/**
 * Simple test endpoint (no authentication required)
 * GET /jwt_test
 */
openRoutes.get('/jwt_test', AuthController.testJWT);

export { openRoutes };
```

### Key Characteristics

**No middleware applied at router level:**
```typescript
// Notice: NO router.use(checkToken) here!
const openRoutes: Router = express.Router();

// Each route can have its own validation, but NO authentication
openRoutes.post('/auth/login', validateLogin, AuthController.login);
```

**Request Flow Diagram:**

```
Client Request
    │
    ▼
┌─────────────────────────┐
│   Open Routes Router    │
│   (No Auth Middleware)  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Validation Middleware  │  ← validateLogin, validateRegister
│   (Input validation)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      Controller         │  ← AuthController.login
│   (Business logic)      │
└───────────┬─────────────┘
            │
            ▼
        Response
```

### Security Considerations for Open Routes

**⚠️ Extra vigilance required:**

Since open routes are publicly accessible, they require special attention:

1. **Rate limiting** - Prevent brute force attacks on login
2. **Input validation** - Strict validation of all user input
3. **Email verification** - Prevent spam registrations
4. **Password policies** - Enforce strong passwords
5. **CAPTCHA** (production) - Prevent automated attacks

```typescript
// Example: Strict validation on open routes
openRoutes.post(
    '/auth/register',
    validateRegister,        // Validate format
    checkEmailAvailability,  // Check duplicates
    enforcePasswordPolicy,   // Password strength
    // rateLimit,            // Production: Limit attempts
    AuthController.register
);
```

---

## Closed Routes - Authenticated Users

### Overview

**Closed routes** require JWT authentication but don't require special roles. Any authenticated user can access these endpoints.

**File:** `/src/routes/closed/index.ts`

### What Belongs in Closed Routes?

✅ **User account management:**
- Change password (requires current password)
- Update profile information
- View own account details

✅ **Verification operations:**
- Send email verification
- Send SMS verification
- Verify SMS code

✅ **User-specific actions:**
- Access own resources
- Perform actions on behalf of self

### Implementation Example

**Complete closed routes file:**

```typescript
// src/routes/closed/index.ts
import express, { Router } from 'express';
import { AuthController, VerificationController } from '@controllers';
import {
    checkToken,
    validatePasswordChange,
    validatePhoneSend,
    validatePhoneVerify
} from '@middleware';

const closedRoutes: Router = express.Router();

// ========================================
// CRITICAL: All closed routes require authentication
// ========================================
closedRoutes.use(checkToken);

// ===== AUTHENTICATED AUTH ROUTES =====

/**
 * Change password (requires authentication and old password)
 * POST /auth/user/password/change
 */
closedRoutes.post(
    '/auth/user/password/change',
    validatePasswordChange,
    AuthController.changePassword
);

/**
 * Send SMS verification code
 * POST /auth/verify/phone/send
 */
closedRoutes.post(
    '/auth/verify/phone/send',
    validatePhoneSend,
    VerificationController.sendSMSVerification
);

/**
 * Verify SMS code
 * POST /auth/verify/phone/verify
 */
closedRoutes.post(
    '/auth/verify/phone/verify',
    validatePhoneVerify,
    VerificationController.verifySMSCode
);

/**
 * Send email verification
 * POST /auth/verify/email/send
 */
closedRoutes.post(
    '/auth/verify/email/send',
    VerificationController.sendEmailVerification
);

export { closedRoutes };
```

### Key Characteristics

**Authentication applied at router level:**
```typescript
// CRITICAL: This line protects ALL routes in this file
closedRoutes.use(checkToken);

// Now every route is automatically protected
closedRoutes.post('/auth/user/password/change', /* ... */);
```

**Request Flow Diagram:**

```
Client Request (with JWT token)
    │
    ▼
┌─────────────────────────┐
│  Closed Routes Router   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   checkToken Middleware │  ← Validates JWT token
│   (Authentication)      │  ← Extracts claims (user ID, role)
└───────────┬─────────────┘
            │
            ├──── Invalid Token ──→ 401 Unauthorized
            │
            ▼ Valid Token
┌─────────────────────────┐
│  Validation Middleware  │  ← validatePasswordChange, etc.
│   (Input validation)    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      Controller         │  ← Can access request.claims
│   (Business logic)      │  ← Has user ID and role
└───────────┬─────────────┘
            │
            ▼
        Response
```

### How checkToken Works

**JWT validation middleware** (`/src/core/middleware/jwt.ts`):

```typescript
// Lines 5-37 from jwt.ts
export const checkToken = (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    let token: string =
        (request.headers['x-access-token'] as string) ||
        (request.headers['authorization'] as string);

    if (token != undefined) {
        if (token.startsWith('Bearer ')) {
            // Remove Bearer from string
            token = token.slice(7, token.length);
        }

        jwt.verify(token, process.env.JWT_SECRET, (error, decoded: JwtPayload) => {
            if (error) {
                response.status(403).json({
                    success: false,
                    message: 'Token is not valid',
                });
            } else {
                // Store user information in request for controller use
                request.claims = decoded as IJwtClaims;
                next();
            }
        });
    } else {
        response.status(401).json({
            success: false,
            message: 'Auth token is not supplied',
        });
    }
};
```

**What checkToken provides to controllers:**

```typescript
// After checkToken runs, controllers have access to:
request.claims = {
    id: 123,              // User ID
    username: "alice",    // Username
    email: "alice@...",   // Email
    role: 1,              // Role level (1=User, 3=Admin, etc.)
    iat: 1234567890,      // Issued at timestamp
    exp: 1234571490       // Expiration timestamp
}
```

---

## Admin Routes - Role-Based Access

### Overview

**Admin routes** require both JWT authentication AND a minimum role level (Admin or higher). These handle system administration, user management, and sensitive operations.

**File:** `/src/routes/admin/index.ts`

### What Belongs in Admin Routes?

✅ **User management:**
- Create users with specific roles
- View all users (with pagination)
- Update user details
- Delete users
- Reset user passwords
- Change user roles

✅ **System operations:**
- Dashboard statistics
- System configuration
- Audit logs

✅ **Administrative actions:**
- Role hierarchy enforcement
- Bulk operations
- Reporting and analytics

### Implementation Example

**Complete admin routes file (abbreviated):**

```typescript
// src/routes/admin/index.ts
import { Router } from 'express';
import { AdminController } from '@controllers';
import {
    checkToken,
    requireAdmin,
    validateAdminCreateUser,
    validateRoleCreation,
    checkRoleHierarchy,
    checkRoleChangeHierarchy,
    validateUserSearch,
    validateAdminPasswordReset,
    validateAdminRoleChange,
    validateAdminUsersList
} from '@middleware';

const adminRoutes = Router();

// ========================================
// CRITICAL: All admin routes require authentication AND admin role
// ========================================
adminRoutes.use(checkToken);      // Step 1: Validate JWT
adminRoutes.use(requireAdmin);    // Step 2: Check role >= Admin (3)

// ===== USER MANAGEMENT ROUTES =====

/**
 * Create a new user with specified role (admin only)
 * POST /admin/users/create
 * Admins can create users with equal or lower roles
 */
adminRoutes.post(
    '/users/create',
    validateAdminCreateUser,
    validateRoleCreation,
    AdminController.createUser
);

/**
 * Get all users with pagination
 * GET /admin/users?page=1&limit=20&status=active&role=3
 */
adminRoutes.get('/users', validateAdminUsersList, AdminController.getAllUsers);

/**
 * Search users by name, email, or username
 * GET /admin/users/search?q=searchTerm&fields=email,username&page=1&limit=20
 */
adminRoutes.get('/users/search', validateUserSearch, AdminController.searchUsers);

/**
 * Get dashboard statistics
 * GET /admin/users/stats/dashboard
 * IMPORTANT: Must be defined BEFORE /users/:id to avoid route collision
 */
adminRoutes.get('/users/stats/dashboard', AdminController.getDashboardStats);

/**
 * Get specific user details
 * GET /admin/users/:id
 */
adminRoutes.get('/users/:id', AdminController.getUserById);

/**
 * Update user details
 * PUT /admin/users/:id
 * Middleware ensures you can only modify users with lower roles
 */
adminRoutes.put(
    '/users/:id',
    checkRoleHierarchy,
    AdminController.updateUser
);

/**
 * Soft delete user (set status to 'deleted')
 * DELETE /admin/users/:id
 * Middleware ensures you can only delete users with lower roles
 */
adminRoutes.delete(
    '/users/:id',
    checkRoleHierarchy,
    AdminController.deleteUser
);

/**
 * Reset user password (admin only)
 * PUT /admin/users/:id/password
 * Admin directly sets a new password for the user
 */
adminRoutes.put(
    '/users/:id/password',
    validateAdminPasswordReset,
    checkRoleHierarchy,
    AdminController.resetUserPassword
);

/**
 * Change user role (admin only)
 * PUT /admin/users/:id/role
 * Admin and higher can change lower roles with specific hierarchy rules
 */
adminRoutes.put(
    '/users/:id/role',
    validateAdminRoleChange,
    checkRoleChangeHierarchy,
    AdminController.changeUserRole
);

export { adminRoutes };
```

### Key Characteristics

**Two-layer protection:**
```typescript
// LAYER 1: Authentication (same as closed routes)
adminRoutes.use(checkToken);

// LAYER 2: Authorization (role check)
adminRoutes.use(requireAdmin);

// Now all routes require BOTH valid token AND admin role
adminRoutes.post('/users/create', /* ... */);
```

**Request Flow Diagram:**

```
Client Request (with JWT token)
    │
    ▼
┌─────────────────────────┐
│   Admin Routes Router   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│   checkToken Middleware │  ← Step 1: Validate JWT
│   (Authentication)      │  ← Extract user info
└───────────┬─────────────┘
            │
            ├──── Invalid Token ──→ 401 Unauthorized
            │
            ▼ Valid Token
┌─────────────────────────┐
│  requireAdmin Middleware│  ← Step 2: Check role >= 3
│   (Authorization)       │
└───────────┬─────────────┘
            │
            ├──── Role < 3 ──→ 403 Forbidden
            │
            ▼ Role >= 3 (Admin)
┌─────────────────────────┐
│  Hierarchy Middleware   │  ← Step 3: Check specific permissions
│  (checkRoleHierarchy)   │  ← Prevent modifying equal/higher roles
└───────────┬─────────────┘
            │
            ├──── Insufficient Hierarchy ──→ 403 Forbidden
            │
            ▼ Hierarchy OK
┌─────────────────────────┐
│  Validation Middleware  │  ← Step 4: Validate input
│                         │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      Controller         │  ← Business logic
│   (Admin operations)    │
└───────────┬─────────────┘
            │
            ▼
        Response
```

### Role Hierarchy Enforcement

**The role system:**

```typescript
// Role definitions (in @models)
export enum UserRole {
    USER = 1,          // Basic user
    MEMBER = 2,        // Verified member
    ADMIN = 3,         // Administrator
    SUPER_ADMIN = 4,   // Super administrator
    OWNER = 5          // System owner
}
```

**requireAdmin middleware** (`/src/core/middleware/adminAuth.ts`, lines 11-40):

```typescript
export const requireAdmin = (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    // Ensure JWT middleware has run first
    if (!request.claims) {
        sendError(
            response,
            401,
            'Authentication required',
            ErrorCodes.AUTH_UNAUTHORIZED
        );
        return;
    }

    // Check if user has admin role or higher (Admin, SuperAdmin, Owner)
    const userRole = request.claims.role;
    if (userRole < UserRole.ADMIN) {
        sendError(
            response,
            403,
            'Admin access required',
            ErrorCodes.AUTH_UNAUTHORIZED
        );
        return;
    }

    next();
};
```

**checkRoleHierarchy middleware** (lines 113-167):

Prevents admins from modifying users with equal or higher roles:

```typescript
export const checkRoleHierarchy = async (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    const targetUserId = parseInt(request.params.id);
    const adminRole = request.claims.role;
    const adminId = request.claims.id;

    if (isNaN(targetUserId)) {
        sendError(response, 400, 'Invalid user ID', ErrorCodes.VALD_MISSING_FIELDS);
        return;
    }

    // Prevent self-modification for delete operations
    if (request.method === 'DELETE' && targetUserId === adminId) {
        sendError(response, 400, 'Cannot delete your own account', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    try {
        // Get target user's role
        const targetUserQuery = await getPool().query(
            'SELECT Account_Role FROM Account WHERE Account_ID = $1',
            [targetUserId]
        );

        if (targetUserQuery.rowCount === 0) {
            sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        const targetRole = targetUserQuery.rows[0].account_role;

        // Check role hierarchy - admin must have higher role than target
        if (adminRole <= targetRole) {
            const action = request.method === 'DELETE' ? 'delete' : 'modify';
            sendError(
                response,
                403,
                `Cannot ${action} user with equal or higher role`,
                ErrorCodes.AUTH_UNAUTHORIZED
            );
            return;
        }

        // Store target role in request for potential use in route handler
        request.targetUserRole = targetRole;
        next();
    } catch (error) {
        console.error('Error checking role hierarchy:', error);
        sendError(response, 500, 'Server error', ErrorCodes.SRVR_DATABASE_ERROR);
    }
};
```

**Role hierarchy rules:**

```
OWNER (5)
    ↓ can manage
SUPER_ADMIN (4)
    ↓ can manage
ADMIN (3)
    ↓ can manage
MEMBER (2)
    ↓ can manage
USER (1)

Rules:
✅ Admin (3) can modify Users (1) and Members (2)
✅ Super Admin (4) can modify Admins (3) and below
✅ Owner (5) can modify everyone
❌ Admin (3) CANNOT modify other Admins (3)
❌ Admin (3) CANNOT modify Super Admins (4) or Owner (5)
❌ No one can modify themselves for critical operations (delete, role change)
```

---

## Main Router Composition

### Overview

The main router (`/src/routes/index.ts`) composes all route tiers and mounts them to the Express application.

### Implementation

**Complete main router file:**

```typescript
// src/routes/index.ts
import { Router } from 'express';
import { openRoutes } from './open';
import { closedRoutes } from './closed';
import { adminRoutes } from '@routes/admin';

const routes = Router();

// Mount all route groups
routes.use('', openRoutes);

routes.use('', closedRoutes);

routes.use('/admin', adminRoutes);

export { routes };
```

### Mounting Strategy

**Diagram of route mounting:**

```
Express App
    │
    ▼
Main Router (/)
    │
    ├─── openRoutes ('')           → /auth/login, /auth/register
    │                                 (No prefix, mounted at root)
    │
    ├─── closedRoutes ('')         → /auth/user/password/change
    │                                 (No prefix, mounted at root)
    │
    └─── adminRoutes ('/admin')    → /admin/users, /admin/users/:id
                                      (Prefixed with /admin)
```

**Why this structure?**

1. **Open and closed routes share `/auth/*` prefix** - Logical grouping
2. **Admin routes get `/admin/*` prefix** - Clear namespace separation
3. **Barrel exports** - Clean imports from subdirectories
4. **Separation of concerns** - Each tier in its own file

### Barrel Exports

**Directory structure:**

```
/src/routes/
    ├── index.ts           (main router - composes all tiers)
    ├── open/
    │   └── index.ts       (exports openRoutes)
    ├── closed/
    │   └── index.ts       (exports closedRoutes)
    └── admin/
        └── index.ts       (exports adminRoutes)
```

**Export pattern:**

```typescript
// In /src/routes/open/index.ts
const openRoutes: Router = express.Router();
// ... route definitions ...
export { openRoutes };

// In /src/routes/index.ts
import { openRoutes } from './open';
import { closedRoutes } from './closed';
import { adminRoutes } from '@routes/admin';
```

**Benefits:**
- Clean imports (no `./open/index.ts` needed)
- Easy to add more route files in subdirectories
- Follows Node.js conventions
- Scalable for large applications

### URL Path Resolution

**How Express resolves paths:**

```typescript
// Main app.ts
app.use('/', routes);

// routes/index.ts
routes.use('', openRoutes);           // Mounted at /
routes.use('', closedRoutes);         // Mounted at /
routes.use('/admin', adminRoutes);    // Mounted at /admin

// routes/open/index.ts
openRoutes.post('/auth/login', ...);  // Final path: /auth/login

// routes/admin/index.ts
adminRoutes.get('/users', ...);       // Final path: /admin/users
adminRoutes.get('/users/:id', ...);   // Final path: /admin/users/:id
```

**Path composition:**

```
App Mount + Router Mount + Route Path = Final URL
    /     +     ''       + /auth/login = /auth/login
    /     +   /admin     +    /users   = /admin/users
    /     +   /admin     + /users/:id  = /admin/users/:id
```

---

## Middleware Stacking Patterns

### Understanding Middleware Flow

**🎯 Learning Objective:** Master how middleware chains execute in sequence

Middleware in Express executes in the order it's defined. Think of it as a pipeline:

```
Request → Middleware 1 → Middleware 2 → Middleware 3 → Controller → Response
              ↓              ↓              ↓
          next()        next()         next()
```

### Router-Level vs Route-Level Middleware

#### **Router-Level Middleware** (applies to ALL routes)

```typescript
const closedRoutes = Router();

// Applied to EVERY route in this router
closedRoutes.use(checkToken);

closedRoutes.post('/auth/user/password/change', ...);  // Has checkToken
closedRoutes.post('/auth/verify/phone/send', ...);     // Has checkToken
closedRoutes.post('/auth/verify/email/send', ...);     // Has checkToken
```

#### **Route-Level Middleware** (applies to specific route)

```typescript
// Applied ONLY to this specific route
openRoutes.post(
    '/auth/login',
    validateLogin,          // Only this route
    AuthController.login
);

openRoutes.post(
    '/auth/register',
    validateRegister,       // Only this route (different validator)
    AuthController.register
);
```

### Validation → Authentication → Authorization Flow

**The standard middleware chain:**

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  VALIDATION  │───▶│     AUTH     │───▶│  AUTHZ       │───▶│  CONTROLLER  │
│              │    │              │    │              │    │              │
│ • Format     │    │ • checkToken │    │ • requireRole│    │ • Business   │
│ • Required   │    │ • Decode JWT │    │ • Hierarchy  │    │   logic      │
│ • Sanitize   │    │ • Extract ID │    │ • Permissions│    │              │
└──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
```

**Why this order matters:**

1. **Validation first** - Reject bad input before expensive operations
2. **Authentication second** - Verify identity before checking permissions
3. **Authorization third** - Check permissions before executing logic
4. **Controller last** - Only run business logic if all checks pass

### Real Examples from Our API

#### **Example 1: Open route (validation only)**

```typescript
openRoutes.post('/auth/login', validateLogin, AuthController.login);
```

```
Request
   ↓
validateLogin → Check email & password format
   ↓ (if valid)
AuthController.login → Verify credentials, generate JWT
   ↓
Response with token
```

#### **Example 2: Closed route (validation + auth)**

```typescript
// Router-level
closedRoutes.use(checkToken);

// Route-level
closedRoutes.post('/auth/user/password/change', validatePasswordChange, AuthController.changePassword);
```

```
Request (with JWT in headers)
   ↓
checkToken → Validate JWT, extract user info
   ↓ (if valid)
validatePasswordChange → Check old password, new password format
   ↓ (if valid)
AuthController.changePassword → Update password in database
   ↓
Response
```

#### **Example 3: Admin route (validation + auth + authz + hierarchy)**

```typescript
// Router-level
adminRoutes.use(checkToken);
adminRoutes.use(requireAdmin);

// Route-level
adminRoutes.delete('/users/:id', checkRoleHierarchy, AdminController.deleteUser);
```

```
Request (with JWT in headers, targeting user ID)
   ↓
checkToken → Validate JWT, extract admin info
   ↓ (if valid token)
requireAdmin → Check if role >= 3 (Admin)
   ↓ (if admin)
checkRoleHierarchy → Query target user's role, verify admin role > target role
   ↓ (if hierarchy OK)
AdminController.deleteUser → Delete user from database
   ↓
Response
```

### Early Return Pattern

**Important:** Middleware can stop the chain by NOT calling `next()`:

```typescript
export const checkToken = (request, response, next) => {
    if (!token) {
        // Early return - chain stops here
        response.status(401).json({ message: 'No token' });
        return;  // Don't call next()!
    }

    jwt.verify(token, secret, (error, decoded) => {
        if (error) {
            // Early return - chain stops here
            response.status(403).json({ message: 'Invalid token' });
            return;  // Don't call next()!
        }

        // Success - continue to next middleware
        request.claims = decoded;
        next();  // Continue the chain
    });
};
```

### Middleware Execution Order Summary

```typescript
// This is the ACTUAL execution order

// 1. App-level middleware (in app.ts)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Route mounting (in app.ts)
app.use('/', routes);

// 3. Router-level middleware (in route file)
adminRoutes.use(checkToken);
adminRoutes.use(requireAdmin);

// 4. Route-specific middleware (in route definition)
adminRoutes.delete('/users/:id', checkRoleHierarchy, AdminController.deleteUser);

// Final order for DELETE /admin/users/123:
// cors → json → urlencoded → checkToken → requireAdmin → checkRoleHierarchy → deleteUser
```

---

## Security Boundaries

### What is a Security Boundary?

A **security boundary** is a point in your application where authentication or authorization checks occur, separating different trust levels.

### Three Security Boundaries in Our API

```
┌─────────────────────────────────────────────────────────────┐
│                    INTERNET (Untrusted)                     │
│                                                             │
│  Anyone can access: /auth/login, /auth/register            │
└────────────────────┬────────────────────────────────────────┘
                     │ Security Boundary 1: checkToken
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              AUTHENTICATED USERS (Trusted Identity)         │
│                                                             │
│  Logged-in users: /auth/user/*, /auth/verify/*             │
└────────────────────┬────────────────────────────────────────┘
                     │ Security Boundary 2: requireAdmin
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           ADMINISTRATORS (Trusted + Authorized)             │
│                                                             │
│  Admins only: /admin/users/*, system operations            │
└────────────────────┬────────────────────────────────────────┘
                     │ Security Boundary 3: checkRoleHierarchy
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            HIERARCHY-CONTROLLED OPERATIONS                  │
│                                                             │
│  Admin operations respecting role hierarchy                 │
└─────────────────────────────────────────────────────────────┘
```

### Boundary Enforcement

Each boundary is enforced by middleware:

| Boundary | Middleware | What It Checks | Status Code on Failure |
|----------|-----------|----------------|------------------------|
| **Boundary 1** | `checkToken` | Valid JWT token | 401 Unauthorized |
| **Boundary 2** | `requireAdmin` | Role >= Admin (3) | 403 Forbidden |
| **Boundary 3** | `checkRoleHierarchy` | Admin role > target role | 403 Forbidden |

### Why Boundaries Matter

**Security boundaries prevent:**

1. **Unauthorized access** - Users can't access admin endpoints
2. **Privilege escalation** - Admins can't promote themselves
3. **Lateral movement** - Admins can't modify equal-rank admins
4. **Data exposure** - Public routes don't leak sensitive info

**Example attacks prevented:**

```typescript
// ❌ ATTACK: User tries to access admin endpoint
GET /admin/users
// Blocked by Boundary 2: requireAdmin → 403 Forbidden

// ❌ ATTACK: Admin tries to delete another admin
DELETE /admin/users/456  (admin ID: 456, role: 3)
// Blocked by Boundary 3: checkRoleHierarchy → 403 Forbidden

// ❌ ATTACK: Admin tries to promote themselves to owner
PUT /admin/users/123/role  (admin ID: 123, role: 3 → 5)
// Blocked by Boundary 3: checkRoleChangeHierarchy → 403 Forbidden
```

### Cross-Boundary Communication

Sometimes you need to access resources across boundaries:

**✅ Allowed patterns:**

```typescript
// User accessing their own profile (closed routes)
GET /auth/user/profile  // User ID from JWT claims

// Admin viewing user details (admin routes)
GET /admin/users/123    // Admin can view lower-role users

// Admin resetting user password (admin routes)
PUT /admin/users/123/password  // Admin can reset lower-role passwords
```

**❌ Forbidden patterns:**

```typescript
// User trying to access other user's data
GET /auth/user/profile?user_id=456  // ❌ Should only access own data

// Admin trying to modify higher-role user
PUT /admin/users/999  // ❌ If user 999 is Super Admin
```

---

## Adding New Endpoints

### Step-by-Step Guide

**🎯 Learning Objective:** Learn to add endpoints with appropriate security

### Adding an Open Route

**When to use:** Public endpoints that don't require authentication

**Example: Add a "forgot username" endpoint**

**Step 1: Add route to `/src/routes/open/index.ts`**

```typescript
/**
 * Request username reminder via email
 * POST /auth/username/remind
 */
openRoutes.post(
    '/auth/username/remind',
    validateEmailReminder,        // Validate email format
    AuthController.sendUsernameReminder
);
```

**Step 2: Create validator in `/src/core/middleware/validation.ts`**

```typescript
export const validateEmailReminder = [
    body('email')
        .isEmail()
        .withMessage('Valid email is required')
        .normalizeEmail(),
    handleValidationErrors
];
```

**Step 3: Create controller method in `/src/controllers/authController.ts`**

```typescript
export const sendUsernameReminder = asyncHandler(
    async (request: IJwtRequest, response: Response): Promise<void> => {
        const { email } = request.body;

        // Look up username by email
        const result = await getPool().query(
            'SELECT username FROM Account WHERE email = $1',
            [email]
        );

        if (result.rowCount === 0) {
            sendError(response, 404, 'Email not found', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        // Send email with username
        await sendUsernameEmail(email, result.rows[0].username);

        sendSuccess(response, null, 'Username sent to email');
    }
);
```

**That's it!** No authentication middleware needed - it's an open route.

### Adding a Closed Route

**When to use:** Authenticated user operations on their own resources

**Example: Add a "view my verification status" endpoint**

**Step 1: Add route to `/src/routes/closed/index.ts`**

```typescript
/**
 * Get current user's verification status
 * GET /auth/user/verification/status
 */
closedRoutes.get(
    '/auth/user/verification/status',
    VerificationController.getVerificationStatus
);
```

**Step 2: Create controller method**

```typescript
export const getVerificationStatus = asyncHandler(
    async (request: IJwtRequest, response: Response): Promise<void> => {
        // User ID comes from JWT claims (added by checkToken middleware)
        const userId = request.claims.id;

        const result = await getPool().query(
            'SELECT email_verified, phone_verified FROM Account WHERE Account_ID = $1',
            [userId]
        );

        if (result.rowCount === 0) {
            sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        sendSuccess(response, result.rows[0], 'Verification status retrieved');
    }
);
```

**Key points:**
- No need to add `checkToken` - it's already applied at router level!
- Access user ID via `request.claims.id` (populated by checkToken)
- User can only see their own status (security by design)

### Adding an Admin Route

**When to use:** Administrative operations requiring special permissions

**Example: Add a "bulk user export" endpoint**

**Step 1: Add route to `/src/routes/admin/index.ts`**

```typescript
/**
 * Export all users to CSV
 * GET /admin/users/export?format=csv&role=3
 */
adminRoutes.get(
    '/users/export',
    validateExportRequest,
    AdminController.exportUsers
);
```

**Step 2: Create validator**

```typescript
export const validateExportRequest = [
    query('format')
        .optional()
        .isIn(['csv', 'json'])
        .withMessage('Format must be csv or json'),
    query('role')
        .optional()
        .isInt({ min: 1, max: 5 })
        .withMessage('Role must be between 1 and 5'),
    handleValidationErrors
];
```

**Step 3: Create controller method**

```typescript
export const exportUsers = asyncHandler(
    async (request: IJwtRequest, response: Response): Promise<void> => {
        const format = request.query.format || 'csv';
        const role = request.query.role ? parseInt(request.query.role as string) : null;

        // Admin info from JWT claims (added by checkToken)
        const adminRole = request.claims.role;

        // Build query based on role filter
        let query = 'SELECT Account_ID, username, email, Account_Role, status FROM Account';
        const params: any[] = [];

        if (role) {
            // Admins can only export users with lower roles
            if (role >= adminRole) {
                sendError(
                    response,
                    403,
                    'Cannot export users with equal or higher role',
                    ErrorCodes.AUTH_UNAUTHORIZED
                );
                return;
            }
            query += ' WHERE Account_Role = $1';
            params.push(role);
        }

        const result = await getPool().query(query, params);

        // Format export based on requested format
        if (format === 'csv') {
            const csv = convertToCSV(result.rows);
            response.setHeader('Content-Type', 'text/csv');
            response.setHeader('Content-Disposition', 'attachment; filename=users.csv');
            response.send(csv);
        } else {
            sendSuccess(response, result.rows, 'Users exported');
        }
    }
);
```

**Key points:**
- Both `checkToken` and `requireAdmin` are already applied at router level!
- Access admin role via `request.claims.role`
- Respect role hierarchy even in exports
- Set appropriate response headers for downloads

### Adding an Admin Route with Hierarchy Checks

**When to use:** Operations that modify other users

**Example: Add a "suspend user" endpoint**

**Step 1: Add route to `/src/routes/admin/index.ts`**

```typescript
/**
 * Suspend user account (set status to 'suspended')
 * PATCH /admin/users/:id/suspend
 * Middleware ensures you can only suspend users with lower roles
 */
adminRoutes.patch(
    '/users/:id/suspend',
    checkRoleHierarchy,                    // Verify admin can modify target
    AdminController.suspendUser
);
```

**Step 2: Create controller method**

```typescript
export const suspendUser = asyncHandler(
    async (request: IJwtRequest, response: Response): Promise<void> => {
        const userId = parseInt(request.params.id);

        // checkRoleHierarchy middleware has already verified:
        // 1. Target user exists
        // 2. Admin role > target role
        // 3. Not trying to modify self

        const result = await getPool().query(
            'UPDATE Account SET status = $1 WHERE Account_ID = $2 RETURNING Account_ID, username, status',
            ['suspended', userId]
        );

        sendSuccess(response, result.rows[0], 'User suspended successfully');
    }
);
```

**Key points:**
- Use `checkRoleHierarchy` for operations that modify users
- Middleware handles all hierarchy checks - controller can focus on business logic
- Path parameter `:id` is validated by middleware

### Decision Tree: Which Route Tier?

```
Does it require authentication?
    ├─ NO → Open Routes (/routes/open/index.ts)
    │       Examples: login, register, password reset request
    │
    └─ YES → Does it require special role?
            ├─ NO → Closed Routes (/routes/closed/index.ts)
            │       Examples: change own password, verify email
            │
            └─ YES → Does it modify other users?
                    ├─ NO → Admin Routes (basic)
                    │       Examples: view dashboard stats, export logs
                    │
                    └─ YES → Admin Routes (with hierarchy)
                            Examples: delete user, change role, reset password
```

---

## Best Practices

### 1. Apply Authentication at Router Level

**✅ Do:**
```typescript
// Apply once to entire router
closedRoutes.use(checkToken);

closedRoutes.post('/auth/user/password/change', ...);
closedRoutes.post('/auth/verify/phone/send', ...);
```

**❌ Don't:**
```typescript
// Manually adding to each route (easy to forget!)
closedRoutes.post('/auth/user/password/change', checkToken, ...);
closedRoutes.post('/auth/verify/phone/send', checkToken, ...);
closedRoutes.post('/auth/verify/email/send', ...); // Oops, forgot checkToken!
```

### 2. Order Routes from Specific to General

**✅ Do:**
```typescript
// Specific route first (exact match)
adminRoutes.get('/users/stats/dashboard', getDashboardStats);

// General route second (parameter match)
adminRoutes.get('/users/:id', getUserById);
```

**❌ Don't:**
```typescript
// General route first - WILL MATCH /users/stats too!
adminRoutes.get('/users/:id', getUserById);  // :id = "stats"

// Specific route never reached
adminRoutes.get('/users/stats/dashboard', getDashboardStats);  // Dead code!
```

**Why?** Express matches routes in definition order. `/users/:id` will match `/users/stats` with `id = "stats"`.

### 3. Use Descriptive Route Comments

**✅ Do:**
```typescript
/**
 * Reset user password (admin only)
 * PUT /admin/users/:id/password
 * Admin directly sets a new password for the user
 */
adminRoutes.put(
    '/users/:id/password',
    validateAdminPasswordReset,
    checkRoleHierarchy,
    AdminController.resetUserPassword
);
```

**❌ Don't:**
```typescript
// Reset password
adminRoutes.put('/users/:id/password', validateAdminPasswordReset, checkRoleHierarchy, AdminController.resetUserPassword);
```

### 4. Validate at Route Level, Not in Controllers

**✅ Do:**
```typescript
// Validation middleware at route level
openRoutes.post(
    '/auth/register',
    validateRegister,              // Handles all validation
    AuthController.register        // Only business logic
);
```

**❌ Don't:**
```typescript
// Controller doing validation
export const register = async (request, response) => {
    // ❌ Validation mixed with business logic
    if (!request.body.email) {
        return response.status(400).json({ error: 'Email required' });
    }
    if (!/\S+@\S+\.\S+/.test(request.body.email)) {
        return response.status(400).json({ error: 'Invalid email' });
    }
    // ... more validation ...
    // ... finally business logic ...
};
```

### 5. Respect Role Hierarchy in All Operations

**✅ Do:**
```typescript
// Check hierarchy before modifications
adminRoutes.put('/users/:id', checkRoleHierarchy, updateUser);
adminRoutes.delete('/users/:id', checkRoleHierarchy, deleteUser);
adminRoutes.put('/users/:id/role', checkRoleChangeHierarchy, changeRole);
```

**❌ Don't:**
```typescript
// No hierarchy check - admin could delete their boss!
adminRoutes.delete('/users/:id', deleteUser);
```

### 6. Use Barrel Exports for Clean Imports

**✅ Do:**
```typescript
// In /routes/open/index.ts
export { openRoutes };

// In /routes/index.ts
import { openRoutes } from './open';
```

**❌ Don't:**
```typescript
// Verbose imports
import { openRoutes } from './open/index.ts';
import { closedRoutes } from './closed/index.ts';
```

### 7. Document Middleware Order in Comments

**✅ Do:**
```typescript
const adminRoutes = Router();

// Step 1: Authentication (validate JWT)
adminRoutes.use(checkToken);

// Step 2: Authorization (check admin role)
adminRoutes.use(requireAdmin);

// Step 3: Route-specific (hierarchy, validation)
adminRoutes.delete('/users/:id', checkRoleHierarchy, deleteUser);
```

### 8. Return Appropriate Status Codes

**✅ Do:**
```typescript
// 401 Unauthorized - No token or invalid token
if (!token) {
    return response.status(401).json({ message: 'Authentication required' });
}

// 403 Forbidden - Valid token but insufficient permissions
if (userRole < UserRole.ADMIN) {
    return response.status(403).json({ message: 'Admin access required' });
}
```

**❌ Don't:**
```typescript
// Using 401 for everything
if (userRole < UserRole.ADMIN) {
    return response.status(401).json({ message: 'Unauthorized' });  // Wrong code!
}
```

---

## Common Mistakes

### 1. Forgetting Authentication Middleware

**❌ Problem:**
```typescript
// Added new admin route, forgot it already has checkToken + requireAdmin
adminRoutes.get('/users/reports', AdminController.getReports);
// This IS protected (router-level middleware), but might be unclear
```

**✅ Solution:**
```typescript
// Comment clarifies that router-level middleware applies
/**
 * Get user reports (admin only)
 * GET /admin/users/reports
 * Note: checkToken and requireAdmin applied at router level
 */
adminRoutes.get('/users/reports', AdminController.getReports);
```

### 2. Mixing Access Levels in Same File

**❌ Problem:**
```typescript
// In /routes/closed/index.ts
closedRoutes.use(checkToken);

closedRoutes.post('/auth/user/password/change', ...);  // ✅ Needs auth
closedRoutes.post('/auth/login', ...);                 // ❌ Should be open!
```

**✅ Solution:**
```typescript
// Login belongs in /routes/open/index.ts
openRoutes.post('/auth/login', validateLogin, AuthController.login);

// Change password stays in /routes/closed/index.ts
closedRoutes.post('/auth/user/password/change', ...);
```

### 3. Route Order Causing Collisions

**❌ Problem:**
```typescript
// General route first - matches everything!
adminRoutes.get('/users/:id', getUserById);
adminRoutes.get('/users/search', searchUsers);     // Never reached!
adminRoutes.get('/users/stats', getStats);         // Never reached!
```

**✅ Solution:**
```typescript
// Specific routes first
adminRoutes.get('/users/search', searchUsers);
adminRoutes.get('/users/stats', getStats);
// General route last
adminRoutes.get('/users/:id', getUserById);
```

### 4. Inconsistent URL Patterns

**❌ Problem:**
```typescript
// Inconsistent patterns
adminRoutes.get('/users', getAllUsers);
adminRoutes.get('/user/:id', getUserById);         // Missing 's'
adminRoutes.post('/createUser', createUser);       // Wrong style
adminRoutes.delete('/users/delete/:id', deleteUser); // Redundant
```

**✅ Solution:**
```typescript
// Consistent RESTful patterns
adminRoutes.get('/users', getAllUsers);            // Collection
adminRoutes.get('/users/:id', getUserById);        // Single resource
adminRoutes.post('/users', createUser);            // Create
adminRoutes.delete('/users/:id', deleteUser);      // Delete
```

### 5. Not Using TypeScript Interfaces

**❌ Problem:**
```typescript
// Controller doesn't know about request.claims
export const getProfile = async (request: Request, response: Response) => {
    const userId = request.claims.id;  // TypeScript error!
};
```

**✅ Solution:**
```typescript
// Use IJwtRequest interface
export const getProfile = async (request: IJwtRequest, response: Response) => {
    const userId = request.claims.id;  // ✅ TypeScript knows about claims
};
```

### 6. Validating in Controller Instead of Middleware

**❌ Problem:**
```typescript
// Mixing validation with business logic
export const createUser = async (request, response) => {
    if (!request.body.email) {
        return response.status(400).json({ error: 'Email required' });
    }
    // ... more validation ...
    // ... business logic ...
};
```

**✅ Solution:**
```typescript
// Validation middleware
export const validateUserCreation = [
    body('email').isEmail().withMessage('Valid email required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username too short'),
    handleValidationErrors
];

// Clean controller
adminRoutes.post('/users', validateUserCreation, createUser);

export const createUser = async (request, response) => {
    // Validation already done - just business logic
    const { email, username } = request.body;
    // ... business logic ...
};
```

### 7. Ignoring Role Hierarchy

**❌ Problem:**
```typescript
// Admin can modify any user - even their boss!
export const deleteUser = async (request: IJwtRequest, response: Response) => {
    const userId = request.params.id;
    await pool.query('DELETE FROM Account WHERE Account_ID = $1', [userId]);
    sendSuccess(response, null, 'User deleted');
};
```

**✅ Solution:**
```typescript
// Use checkRoleHierarchy middleware
adminRoutes.delete('/users/:id', checkRoleHierarchy, deleteUser);

// Controller can trust hierarchy is already checked
export const deleteUser = async (request: IJwtRequest, response: Response) => {
    const userId = request.params.id;
    // checkRoleHierarchy already verified this is allowed
    await pool.query('DELETE FROM Account WHERE Account_ID = $1', [userId]);
    sendSuccess(response, null, 'User deleted');
};
```

---

## Summary

### Key Takeaways

**🎯 Route Organization:**
- Organize by **access level** (open, closed, admin) not resource type
- Apply authentication/authorization at **router level**
- Use **barrel exports** for clean imports
- Document **middleware order** clearly

**🎯 Security Boundaries:**
- **Open routes** - No authentication (public endpoints)
- **Closed routes** - JWT required (authenticated users)
- **Admin routes** - JWT + role required (administrators)
- **Hierarchy checks** - Prevent privilege escalation

**🎯 Middleware Stacking:**
- **Validation → Authentication → Authorization** flow
- Router-level for common checks
- Route-level for specific validation
- Early returns prevent unnecessary processing

**🎯 Best Practices:**
- Specific routes before general routes
- Descriptive comments on all endpoints
- Validate in middleware, not controllers
- Respect role hierarchy in all operations
- Use TypeScript interfaces for type safety

### Visual Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    ROUTE ORGANIZATION                       │
└─────────────────────────────────────────────────────────────┘

Open Routes (/routes/open/index.ts)
├── No authentication middleware
├── Public endpoints: /auth/login, /auth/register
└── Security: Input validation, rate limiting

Closed Routes (/routes/closed/index.ts)
├── checkToken middleware applied to all routes
├── Authenticated endpoints: /auth/user/*
└── Security: JWT validation, user identity

Admin Routes (/routes/admin/index.ts)
├── checkToken + requireAdmin middleware
├── Administrative endpoints: /admin/users/*
├── Additional: checkRoleHierarchy for modifications
└── Security: Role verification, hierarchy enforcement

Main Router (/routes/index.ts)
├── Composes all route tiers
├── Mounts to Express app
└── Creates clean URL namespace
```

### Next Steps

**📚 Continue Learning:**
1. [HTTP Methods](./http-methods.md) - Understanding REST semantics
2. [Node.js & Express Architecture](./node-express-architecture.md) - Server patterns
3. [Web Security Guide](./web-security-guide.md) - Security best practices
4. [Validation Strategies](./validation-strategies.md) - Input validation patterns

**🔧 Practice:**
- Add new endpoints to each route tier
- Implement custom middleware
- Test security boundaries with curl or Postman
- Review existing routes for security issues

**✋ Explore the Code:**
- Read `/src/routes/index.ts` - Main router composition
- Study `/src/routes/open/index.ts` - Public endpoints
- Examine `/src/routes/closed/index.ts` - Authenticated endpoints
- Analyze `/src/routes/admin/index.ts` - Administrative endpoints
- Review `/src/core/middleware/jwt.ts` - JWT validation
- Understand `/src/core/middleware/adminAuth.ts` - Role hierarchy

---

## Related Guides

- **[JWT Implementation Guide](./jwt-implementation-guide.md)** - JWT middleware for protected routes
- **[RBAC Guide](./rbac-guide.md)** - Role-based route protection
- **[Node.js & Express Architecture](./node-express-architecture.md)** - MVC patterns and middleware

---

*Master route organization to build secure, maintainable, and scalable authentication systems. Clear security boundaries prevent vulnerabilities and make your API easier to audit and extend.*
