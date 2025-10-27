# Role-Based Access Control (RBAC) Guide

A comprehensive educational guide to understanding and implementing Role-Based Access Control for TCSS-460 senior CS students.

> **Related Code**: See implementations in [`/src/core/middleware/adminAuth.ts`](../src/core/middleware/adminAuth.ts), [`/src/controllers/adminController.ts`](../src/controllers/adminController.ts), and [`/src/routes/admin/index.ts`](../src/routes/admin/)

## Quick Navigation
- 🔐 **Authentication vs Authorization**: [Core Concepts](#authentication-vs-authorization-the-foundation)
- 🎭 **5-Tier Role Hierarchy**: [Role System](#the-5-tier-role-hierarchy)
- 🛡️ **Middleware Protection**: [requireRole & checkRoleHierarchy](#middleware-implementation)
- 👥 **Admin Operations**: [User Management](#admin-user-management-operations)
- 🗄️ **Database Schema**: [Account_Role Column](#database-schema-and-role-storage)
- 🔒 **Security**: [Best Practices](#security-considerations-and-best-practices)
- 📚 **Related**: [Authentication Guide](../../TCSS-460-auth-squared/docs-2.0/authentication-guide.md) - JWT authentication concepts

## Table of Contents

- [Authentication vs Authorization: The Foundation](#authentication-vs-authorization-the-foundation)
- [What is RBAC?](#what-is-role-based-access-control-rbac)
- [The 5-Tier Role Hierarchy](#the-5-tier-role-hierarchy)
- [Role Assignment on Registration](#role-assignment-on-registration)
- [Role Hierarchy Enforcement](#role-hierarchy-enforcement)
- [Middleware Implementation](#middleware-implementation)
- [Admin Route Protection Patterns](#admin-route-protection-patterns)
- [Admin User Management Operations](#admin-user-management-operations)
- [Database Schema and Role Storage](#database-schema-and-role-storage)
- [Security Considerations and Best Practices](#security-considerations-and-best-practices)
- [Common Patterns and Anti-Patterns](#common-patterns-and-anti-patterns)
- [Real-World Code Examples](#real-world-code-examples)

---

## Authentication vs Authorization: The Foundation

Before diving into RBAC, it's critical to understand the distinction between **authentication** (AuthN) and **authorization** (AuthZ):

### Authentication (AuthN): "Who are you?"

**Authentication** is the process of verifying a user's identity.

```
User Login Flow:
┌─────────────────────────────────────────────────────┐
│ 1. User submits email + password                    │
│ 2. Server verifies credentials against database     │
│ 3. Server generates JWT token with user identity    │
│ 4. User includes JWT in future requests             │
└─────────────────────────────────────────────────────┘
```

**Example**: When you log in with `email@example.com` and `password123`, the system authenticates you by:
1. Looking up your account in the database
2. Verifying your password hash matches
3. Issuing you a JWT token that proves "you are user #42"

```typescript
// Authentication happens in authController.ts
const token = jwt.sign(
    {
        id: account.account_id,      // WHO you are
        email: account.email,
        role: account.account_role    // WHAT you can do (used for authorization)
    },
    jwtSecret,
    { expiresIn: '14d' }
);
```

### Authorization (AuthZ): "What can you do?"

**Authorization** is the process of determining what actions an authenticated user is allowed to perform.

```
Authorization Check Flow:
┌─────────────────────────────────────────────────────┐
│ 1. User sends authenticated request (with JWT)      │
│ 2. Server validates JWT (authentication)            │
│ 3. Server checks user's role from JWT               │
│ 4. Server verifies role has permission for action   │
│ 5. Grants or denies access                          │
└─────────────────────────────────────────────────────┘
```

**Example**: After authenticating, you try to delete a user account. The system authorizes you by:
1. Extracting your role from the JWT (e.g., Admin = role 3)
2. Checking if Admins can delete users (yes)
3. Checking if you can delete *this specific* user (hierarchy rules)
4. Allowing or denying the action

```typescript
// Authorization happens in adminAuth.ts middleware
export const requireAdmin = (request: IJwtRequest, response: Response, next: NextFunction) => {
    const userRole = request.claims.role;  // Extract role from JWT

    if (userRole < UserRole.ADMIN) {      // Check if role is sufficient
        sendError(response, 403, 'Admin access required', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    next();  // User is authorized, proceed to route handler
};
```

### Real-World Analogy

Think of an office building:

**Authentication (Who are you?)**
- 🏢 Badge scan at entrance: "This is John Doe, Employee #1234"
- The system verifies your identity
- You get inside the building

**Authorization (What can you do?)**
- 🚪 Access to specific floors: "John can access floors 1-3, but not floor 4 (executive level)"
- 🖥️ Access to specific systems: "John can view documents but cannot approve budgets"
- The system checks your permissions for each action

### Why Both Matter

You CANNOT have authorization without authentication:
- ❌ "Can user X delete this account?" → First, prove you ARE user X (authentication)
- ✅ Once authenticated, check if user X has delete permissions (authorization)

**TCSS-460-auth-squared implements both:**
1. **Authentication**: JWT tokens (`checkToken` middleware in `/src/core/middleware/jwt.ts`)
2. **Authorization**: RBAC with role hierarchy (`requireAdmin`, `checkRoleHierarchy` middleware)

---

## What is Role-Based Access Control (RBAC)?

### Definition

**Role-Based Access Control (RBAC)** is an authorization mechanism that restricts system access based on a user's **role** within an organization.

**Key Concepts:**
- **Role**: A named job function (e.g., User, Admin, SuperAdmin)
- **Permission**: An action the system can perform (e.g., create user, delete account)
- **Role Assignment**: Each user is assigned one or more roles
- **Permission Assignment**: Each role is granted specific permissions

### How RBAC Works

```
User → Role → Permissions → Access Decision

Example:
┌──────────────────────────────────────────────────────────────┐
│ User: alice@example.com                                      │
│   ↓                                                           │
│ Role: Admin (level 3)                                        │
│   ↓                                                           │
│ Permissions:                                                 │
│   ✓ View all users                                           │
│   ✓ Create users (role ≤ 3)                                  │
│   ✓ Delete users (role < 3)                                  │
│   ✗ Create SuperAdmin (role 4) - denied                      │
│   ↓                                                           │
│ Access Decision: Can delete User (role 1) ✓                  │
│ Access Decision: Cannot delete SuperAdmin (role 4) ✗         │
└──────────────────────────────────────────────────────────────┘
```

### Why RBAC?

**Without RBAC (Permission-based only):**
```sql
-- Every user needs individual permissions assigned
INSERT INTO User_Permissions (User_ID, Permission) VALUES (1, 'view_users');
INSERT INTO User_Permissions (User_ID, Permission) VALUES (1, 'create_user');
INSERT INTO User_Permissions (User_ID, Permission) VALUES (1, 'delete_user');
-- Repeat for every user... 😱
```

**With RBAC:**
```sql
-- Just assign a role
UPDATE Account SET Account_Role = 3 WHERE Account_ID = 1;
-- All Admin permissions automatically apply ✓
```

**Benefits:**
1. **Simplified Management**: Assign roles instead of individual permissions
2. **Consistency**: All users with the same role have identical permissions
3. **Scalability**: Add new roles without touching existing users
4. **Auditability**: Easy to see who has what access ("show me all Admins")
5. **Least Privilege**: Users get only the permissions their role requires

---

## The 5-Tier Role Hierarchy

TCSS-460-auth-squared implements a **hierarchical RBAC** system with 5 distinct roles:

### Role Enumeration

```typescript
// src/core/models/index.ts
export enum UserRole {
    USER = 1,
    MODERATOR = 2,
    ADMIN = 3,
    SUPER_ADMIN = 4,
    OWNER = 5
}

export const RoleName = {
    [UserRole.USER]: 'User',
    [UserRole.MODERATOR]: 'Moderator',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.SUPER_ADMIN]: 'SuperAdmin',
    [UserRole.OWNER]: 'Owner'
} as const;
```

### Role Hierarchy Visualization

```
     ┌─────────────────────────────────────────────────┐
     │              Role Hierarchy                     │
     │         (Higher level = more power)             │
     └─────────────────────────────────────────────────┘

                         OWNER (5)
                           │
                    ┌──────┴──────┐
                    │  SuperAdmin (4)  │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │   Admin (3) │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Moderator (2)│
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │   User (1)  │
                    └─────────────┘
```

### Role Descriptions

#### 1. User (Role 1) - The Default Role

**Permission Level**: Basic account access
**Created By**: System (on registration)
**Use Case**: Regular end-users of the application

**Permissions:**
- ✓ View own profile
- ✓ Update own profile
- ✓ Change own password
- ✗ View other users
- ✗ Modify any user
- ✗ Access admin routes

**Real-World Analogy**: Regular employee with access to their own workspace

```typescript
// New registrations always start as User (role 1)
// src/controllers/authController.ts
const insertAccountResult = await client.query(
    `INSERT INTO Account
     (FirstName, LastName, Username, Email, Phone, Account_Role, ...)
     VALUES ($1, $2, $3, $4, $5, 1, ...)`,  // Account_Role = 1 (User)
    [firstname, lastname, username, email, phone]
);
```

#### 2. Moderator (Role 2) - Content Management

**Permission Level**: Basic moderation capabilities
**Created By**: Admin or higher
**Use Case**: Community moderators, content reviewers

**Permissions:**
- ✓ All User permissions
- ✓ View limited user information
- ✓ Flag content for review
- ✓ Moderate user-generated content
- ✗ Create/delete users
- ✗ Change user roles

**Real-World Analogy**: Team lead with oversight but not full admin control

#### 3. Admin (Role 3) - Standard Administration

**Permission Level**: Full user management (with hierarchy limits)
**Created By**: SuperAdmin or Owner
**Use Case**: System administrators, customer support managers

**Permissions:**
- ✓ All Moderator permissions
- ✓ View all users (`GET /admin/users`)
- ✓ Create users with role ≤ 3 (User, Moderator, Admin)
- ✓ Update users with role < 3 (User, Moderator only)
- ✓ Delete users with role < 3
- ✓ Reset passwords for users with role < 3
- ✓ Change roles up to Admin (cannot create/promote to SuperAdmin or Owner)
- ✗ Modify SuperAdmins or Owners
- ✗ Promote users to SuperAdmin (role 4) or Owner (role 5)

**Real-World Analogy**: Department manager who can manage their team but not executives

**Hierarchy Rule**: Admins can only affect users with roles **strictly lower** than their own:
- Can create: Users, Moderators, Admins (roles 1, 2, 3)
- Can modify: Users, Moderators (roles 1, 2)
- Cannot touch: SuperAdmins, Owners (roles 4, 5)

#### 4. SuperAdmin (Role 4) - Elevated Administration

**Permission Level**: Cross-organization administration
**Created By**: Owner only
**Use Case**: Senior system administrators, security team

**Permissions:**
- ✓ All Admin permissions
- ✓ Create/modify Admins (role 3)
- ✓ Create users up to SuperAdmin (role 4)
- ✓ Modify users up to Admin (role 3)
- ✓ Access sensitive system configurations
- ✗ Modify other SuperAdmins (same level)
- ✗ Modify Owners (role 5)

**Real-World Analogy**: VP-level executive with broad authority but not ownership

#### 5. Owner (Role 5) - Unrestricted Access

**Permission Level**: Complete system control
**Created By**: Database seeding or other Owners
**Use Case**: System owner, founder, root account

**Permissions:**
- ✓ All SuperAdmin permissions
- ✓ Create/modify SuperAdmins (role 4)
- ✓ Create/modify other Owners (role 5)
- ✓ Access all system features without restriction
- ✓ Override any permission check

**Real-World Analogy**: CEO/Founder with ultimate authority

**Special Note**: Typically only 1-2 Owner accounts exist in production systems

---

## Role Assignment on Registration

### Default Role: User (1)

**All new user registrations automatically receive role 1 (User)**. This implements the security principle of **least privilege** - start with minimal permissions and grant more as needed.

```typescript
// src/controllers/authController.ts - register()
static async register(request: IJwtRequest, response: Response): Promise<void> {
    const { firstname, lastname, email, password, username, phone } = request.body;

    await executeTransactionWithResponse(
        async (client) => {
            // Create account with role 1 (User) - hardcoded
            const insertAccountResult = await client.query(
                `INSERT INTO Account
                 (FirstName, LastName, Username, Email, Phone, Account_Role, Email_Verified, Phone_Verified, Account_Status)
                 VALUES ($1, $2, $3, $4, $5, 1, FALSE, FALSE, 'pending')`,
                 //                            ↑ Always 1 (User)
                [firstname, lastname, username, email, phone]
            );

            const accountId = insertAccountResult.rows[0].account_id;

            // Generate JWT with role 1
            const token = generateAccessToken({
                id: accountId,
                email,
                role: 1  // User role
            });

            return {
                accessToken: token,
                user: {
                    id: accountId,
                    email,
                    role: 'User',  // Role name
                    // ...
                }
            };
        },
        response,
        'User registration successful',
        'Registration failed'
    );
}
```

### Why Always Start at Role 1?

**Security Principle: Least Privilege**
- Users should start with minimum necessary permissions
- Prevents accidental or malicious privilege escalation during registration
- Requires explicit promotion by authorized admins

**Attack Prevention:**
```typescript
// ❌ BAD: User-controlled role during registration
POST /auth/register
{
    "email": "hacker@evil.com",
    "password": "password123",
    "role": 5  // ← Attacker tries to register as Owner!
}

// ✓ GOOD: Role is hardcoded, user input ignored
const insertAccountResult = await client.query(
    `INSERT INTO Account (..., Account_Role) VALUES (..., 1)`,
    //                                                    ↑ Always 1
    [firstname, lastname, username, email, phone]
);
```

### Admin-Created Users (Custom Roles)

**Only admins can create users with roles > 1** through the admin endpoint:

```typescript
// src/controllers/adminController.ts - createUser()
static async createUser(request: IJwtRequest, response: Response): Promise<void> {
    const { firstname, lastname, email, password, username, role, phone } = request.body;
    const userRole = parseInt(role);  // Admin specifies the role

    // Middleware checks:
    // 1. Request is from an Admin or higher
    // 2. Admin cannot create roles higher than their own

    await executeTransactionWithResponse(
        async (client) => {
            const insertAccountResult = await client.query(
                `INSERT INTO Account
                 (..., Account_Role, ...)
                 VALUES ($1, $2, $3, $4, $5, $6, ...)`,
                 //                        ↑ Admin-specified role
                [firstname, lastname, username, email, phone, userRole]
            );
            // ...
        },
        response,
        'User created successfully by admin',
        'Failed to create user'
    );
}
```

**Protected by Middleware:**
```typescript
// src/routes/admin/index.ts
adminRoutes.post(
    '/users/create',
    validateAdminCreateUser,      // Validates request body
    validateRoleCreation,          // Ensures role ≤ admin's role
    AdminController.createUser
);
```

### Role Assignment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ PUBLIC REGISTRATION (Anyone can register)                   │
├─────────────────────────────────────────────────────────────┤
│ POST /auth/register                                         │
│   ↓                                                          │
│ System assigns role = 1 (User) automatically                │
│   ↓                                                          │
│ User can request promotion from Admin later                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ADMIN CREATION (Requires Admin+ authentication)            │
├─────────────────────────────────────────────────────────────┤
│ POST /admin/users/create                                    │
│   ↓                                                          │
│ Middleware: requireAdmin (role ≥ 3)                         │
│   ↓                                                          │
│ Middleware: validateRoleCreation (newRole ≤ adminRole)      │
│   ↓                                                          │
│ Admin specifies role in request body                        │
│   ↓                                                          │
│ System creates user with specified role                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Role Hierarchy Enforcement

The most critical aspect of RBAC security is **hierarchy enforcement** - preventing admins from modifying users with equal or higher roles.

### Core Principle: Can Only Affect Lower Roles

**Rule**: A user can only create, modify, or delete users with **strictly lower** roles than their own.

```
Admin (role 3) can affect:
  ✓ User (role 1)      - 1 < 3 ✓
  ✓ Moderator (role 2) - 2 < 3 ✓
  ✗ Admin (role 3)     - 3 = 3 ✗ (equal)
  ✗ SuperAdmin (role 4)- 4 > 3 ✗ (higher)
  ✗ Owner (role 5)     - 5 > 3 ✗ (higher)
```

### Why Hierarchy Enforcement Matters

**Without hierarchy enforcement:**
```typescript
// ❌ SECURITY VULNERABILITY
// Admin (role 3) could modify Owner (role 5)!
PUT /admin/users/1/role
Authorization: Bearer <admin-jwt>
{
    "role": 1  // ← Admin demotes Owner to User!
}
```

**With hierarchy enforcement:**
```typescript
// ✓ SECURE - Middleware blocks the request
PUT /admin/users/1/role
Authorization: Bearer <admin-jwt>
{
    "role": 1
}
// Response: 403 Forbidden
// "Cannot change role of user with equal or higher role"
```

### checkRoleHierarchy Middleware

This middleware enforces hierarchy rules for update/delete operations:

```typescript
// src/core/middleware/adminAuth.ts
export const checkRoleHierarchy = async (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    const targetUserId = parseInt(request.params.id);
    const adminRole = request.claims.role;  // From JWT
    const adminId = request.claims.id;

    // Prevent self-deletion
    if (request.method === 'DELETE' && targetUserId === adminId) {
        sendError(response, 400, 'Cannot delete your own account', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    try {
        // Get target user's role from database
        const targetUserQuery = await getPool().query(
            'SELECT Account_Role FROM Account WHERE Account_ID = $1',
            [targetUserId]
        );

        if (targetUserQuery.rowCount === 0) {
            sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        const targetRole = targetUserQuery.rows[0].account_role;

        // Check hierarchy - admin must have HIGHER role than target
        if (adminRole <= targetRole) {
            //         ↑ <= means "not higher"
            const action = request.method === 'DELETE' ? 'delete' : 'modify';
            sendError(
                response,
                403,
                `Cannot ${action} user with equal or higher role`,
                ErrorCodes.AUTH_UNAUTHORIZED
            );
            return;
        }

        // Store target role for route handler
        request.targetUserRole = targetRole;
        next();  // Authorized - proceed
    } catch (error) {
        console.error('Error checking role hierarchy:', error);
        sendError(response, 500, 'Server error', ErrorCodes.SRVR_DATABASE_ERROR);
    }
};
```

### validateRoleCreation Middleware

This middleware enforces hierarchy rules for user creation:

```typescript
// src/core/middleware/adminAuth.ts
export const validateRoleCreation = (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    const adminRole = request.claims.role;      // Admin's role
    const newUserRole = parseInt(request.body.role);  // Requested role

    // Validate role is in valid range (1-5)
    if (isNaN(newUserRole) || newUserRole < 1 || newUserRole > 5) {
        sendError(response, 400, 'Invalid role. Must be between 1-5', ErrorCodes.VALD_INVALID_ROLE);
        return;
    }

    // Admins can create users with EQUAL OR LOWER roles
    // (More permissive than modification - allows creating another admin)
    if (newUserRole > adminRole) {
        //            ↑ Strictly greater than
        sendError(
            response,
            403,
            'Cannot create user with higher role than your own',
            ErrorCodes.AUTH_UNAUTHORIZED
        );
        return;
    }

    next();  // Authorized
};
```

### checkRoleChangeHierarchy Middleware

This middleware has stricter rules specifically for role changes:

```typescript
// src/core/middleware/adminAuth.ts
export const checkRoleChangeHierarchy = async (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    const targetUserId = parseInt(request.params.id);
    const adminRole = request.claims.role;
    const adminId = request.claims.id;
    const newRole = parseInt(request.body.role);

    // Rule 1: Cannot change your own role
    if (targetUserId === adminId) {
        sendError(response, 400, 'Cannot change your own role', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    // Rule 2: Cannot promote to higher than your own role
    if (newRole > adminRole) {
        sendError(
            response,
            403,
            'Cannot promote user to higher role than your own',
            ErrorCodes.AUTH_UNAUTHORIZED
        );
        return;
    }

    try {
        // Get target user's CURRENT role
        const targetUserQuery = await getPool().query(
            'SELECT Account_Role FROM Account WHERE Account_ID = $1',
            [targetUserId]
        );

        if (targetUserQuery.rowCount === 0) {
            sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        const currentTargetRole = targetUserQuery.rows[0].account_role;

        // Rule 3: Cannot change role of user with equal or higher role
        if (currentTargetRole >= adminRole) {
            sendError(
                response,
                403,
                'Cannot change role of user with equal or higher role',
                ErrorCodes.AUTH_UNAUTHORIZED
            );
            return;
        }

        // Rule 4: Admins (role 3) can only assign roles up to Admin (3)
        if (adminRole === 3 && newRole > 3) {
            sendError(
                response,
                403,
                'Admins can only assign roles up to admin level',
                ErrorCodes.AUTH_UNAUTHORIZED
            );
            return;
        }

        next();  // All hierarchy checks passed
    } catch (error) {
        console.error('Role change hierarchy check error:', error);
        sendError(response, 500, 'Server error during authorization check', ErrorCodes.SRVR_DATABASE_ERROR);
    }
};
```

### Hierarchy Rules Summary Table

| Admin Role | Can Create | Can Modify | Can Delete | Can Promote To |
|------------|------------|------------|------------|----------------|
| User (1) | ❌ None | ❌ None | ❌ None | ❌ None |
| Moderator (2) | ❌ None | ❌ None | ❌ None | ❌ None |
| Admin (3) | User, Moderator, Admin (1-3) | User, Moderator (1-2) | User, Moderator (1-2) | User, Moderator, Admin (1-3) |
| SuperAdmin (4) | User, Moderator, Admin, SuperAdmin (1-4) | User, Moderator, Admin (1-3) | User, Moderator, Admin (1-3) | User, Moderator, Admin, SuperAdmin (1-4) |
| Owner (5) | All (1-5) | All (1-5)* | All (1-5)* | All (1-5) |

*Except self-deletion and self-role-change

### Real-World Attack Scenarios Prevented

**Scenario 1: Privilege Escalation**
```typescript
// Attacker with Admin (role 3) tries to promote themselves
PUT /admin/users/42/role
Authorization: Bearer <admin-jwt-for-user-42>
{
    "role": 5  // Try to become Owner
}

// ✓ Blocked by checkRoleChangeHierarchy:
// "Cannot change your own role"
```

**Scenario 2: Lateral Privilege Escalation**
```typescript
// Attacker with Admin (role 3) tries to demote another Admin
PUT /admin/users/99/role
Authorization: Bearer <admin-jwt>
{
    "role": 1  // Demote rival admin to User
}

// ✓ Blocked by checkRoleChangeHierarchy:
// "Cannot change role of user with equal or higher role"
```

**Scenario 3: Role Creation Bypass**
```typescript
// Attacker with Admin (role 3) tries to create SuperAdmin
POST /admin/users/create
Authorization: Bearer <admin-jwt>
{
    "email": "backdoor@evil.com",
    "password": "password123",
    "role": 4  // Try to create SuperAdmin
}

// ✓ Blocked by validateRoleCreation:
// "Cannot create user with higher role than your own"
```

---

## Middleware Implementation

RBAC middleware acts as **gatekeepers** for protected routes. They run **after authentication** (`checkToken`) but **before** the route handler.

### Middleware Execution Order

```
Request Flow:
┌──────────────────────────────────────────────────────────────┐
│ 1. Client Request                                            │
│    ↓                                                          │
│ 2. checkToken (JWT authentication)                           │
│    - Validates JWT signature                                 │
│    - Extracts claims (id, role, email)                       │
│    - Attaches request.claims                                 │
│    ↓                                                          │
│ 3. requireAdmin (RBAC authorization)                         │
│    - Checks request.claims.role ≥ 3                          │
│    - Grants or denies access                                 │
│    ↓                                                          │
│ 4. checkRoleHierarchy (Fine-grained authorization)           │
│    - Queries target user's role                              │
│    - Compares with admin's role                              │
│    - Enforces hierarchy rules                                │
│    ↓                                                          │
│ 5. Route Handler (Business logic)                            │
│    - Executes the actual operation                           │
│    - Returns response                                        │
└──────────────────────────────────────────────────────────────┘
```

### requireAdmin Middleware

The basic role check - ensures user has Admin role or higher:

```typescript
// src/core/middleware/adminAuth.ts
export const requireAdmin = (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    // 1. Ensure JWT middleware has run first
    if (!request.claims) {
        sendError(
            response,
            401,
            'Authentication required',
            ErrorCodes.AUTH_UNAUTHORIZED
        );
        return;
    }

    // 2. Check if user has admin role or higher (Admin, SuperAdmin, Owner)
    const userRole = request.claims.role;
    if (userRole < UserRole.ADMIN) {  // UserRole.ADMIN = 3
        //          ↑ Less than 3 means User (1) or Moderator (2)
        sendError(
            response,
            403,
            'Admin access required',
            ErrorCodes.AUTH_UNAUTHORIZED
        );
        return;
    }

    // 3. User is authorized - proceed to next middleware or route handler
    next();
};
```

**Usage Example:**
```typescript
// All routes under /admin require Admin role (3+)
adminRoutes.use(checkToken);    // Authentication
adminRoutes.use(requireAdmin);  // Authorization
```

### requireSuperAdmin Middleware

For extra-sensitive operations:

```typescript
// src/core/middleware/adminAuth.ts
export const requireSuperAdmin = (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    if (!request.claims) {
        sendError(response, 401, 'Authentication required', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    const userRole = request.claims.role;
    if (userRole < UserRole.SUPER_ADMIN) {  // UserRole.SUPER_ADMIN = 4
        sendError(response, 403, 'Super Admin access required', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    next();
};
```

### requireOwner Middleware

For the most sensitive operations (rarely used):

```typescript
// src/core/middleware/adminAuth.ts
export const requireOwner = (
    request: IJwtRequest,
    response: Response,
    next: NextFunction
) => {
    if (!request.claims) {
        sendError(response, 401, 'Authentication required', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    const userRole = request.claims.role;
    if (userRole !== UserRole.OWNER) {  // Must be exactly 5
        //       ↑ !== means "not exactly equal"
        sendError(response, 403, 'Owner access required', ErrorCodes.AUTH_UNAUTHORIZED);
        return;
    }

    next();
};
```

### Middleware Composition Pattern

Combine multiple middleware for layered security:

```typescript
// src/routes/admin/index.ts
adminRoutes.put(
    '/users/:id/role',
    validateAdminRoleChange,      // 1. Validate request body
    checkRoleChangeHierarchy,     // 2. Check role hierarchy rules
    AdminController.changeUserRole // 3. Execute if authorized
);

adminRoutes.delete(
    '/users/:id',
    checkRoleHierarchy,           // 1. Check can delete target
    AdminController.deleteUser    // 2. Execute deletion
);
```

### Middleware Best Practices

**1. Order Matters**
```typescript
// ✓ GOOD: Authentication before authorization
adminRoutes.use(checkToken);        // Step 1: Who are you?
adminRoutes.use(requireAdmin);      // Step 2: What can you do?

// ❌ BAD: Authorization before authentication
adminRoutes.use(requireAdmin);      // request.claims is undefined!
adminRoutes.use(checkToken);
```

**2. Fail Securely (Deny by Default)**
```typescript
// ✓ GOOD: Explicit check, deny if missing
if (!request.claims) {
    sendError(response, 401, 'Authentication required');
    return;  // Stop execution
}

// ❌ BAD: Continue on error
if (request.claims) {
    // Check role...
}
// Continues even if claims are missing!
```

**3. Validate All Inputs**
```typescript
// ✓ GOOD: Validate parameters
const targetUserId = parseInt(request.params.id);
if (isNaN(targetUserId)) {
    sendError(response, 400, 'Invalid user ID');
    return;
}

// ❌ BAD: Trust user input
const targetUserId = request.params.id;
// SQL injection risk if not validated!
```

**4. Log Authorization Failures**
```typescript
// ✓ GOOD: Log failed attempts for security monitoring
if (adminRole <= targetRole) {
    console.warn(`Authorization failed: User ${adminId} (role ${adminRole}) attempted to modify user ${targetUserId} (role ${targetRole})`);
    sendError(response, 403, 'Cannot modify user with equal or higher role');
    return;
}
```

---

## Admin Route Protection Patterns

All admin routes follow consistent protection patterns for security and maintainability.

### Basic Route Structure

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
    // ... other middleware
} from '@middleware';

const adminRoutes = Router();

// ===== GLOBAL MIDDLEWARE (applies to ALL /admin routes) =====
adminRoutes.use(checkToken);    // 1. Authentication required
adminRoutes.use(requireAdmin);  // 2. Admin role required (≥3)

// ===== INDIVIDUAL ROUTES =====
// ...
```

### Route Protection Levels

#### Level 1: Basic Admin Access (Global Middleware)

Routes that only need Admin role verification:

```typescript
// GET /admin/users/stats/dashboard
// Requires: Admin+ role (from global middleware)
adminRoutes.get('/users/stats/dashboard', AdminController.getDashboardStats);

// GET /admin/users/:id
// Requires: Admin+ role
adminRoutes.get('/users/:id', AdminController.getUserById);
```

**Protection:**
- `checkToken`: Validates JWT
- `requireAdmin`: Ensures role ≥ 3

#### Level 2: Input Validation

Routes that need request body/query validation:

```typescript
// GET /admin/users?page=1&limit=20&status=active&role=3
// Requires: Admin+ role + valid query params
adminRoutes.get('/users', validateAdminUsersList, AdminController.getAllUsers);

// GET /admin/users/search?q=term&fields=email,username
// Requires: Admin+ role + valid search params
adminRoutes.get('/users/search', validateUserSearch, AdminController.searchUsers);
```

**Protection:**
- `checkToken`: Validates JWT
- `requireAdmin`: Ensures role ≥ 3
- `validateAdminUsersList` / `validateUserSearch`: Validates query parameters

#### Level 3: Hierarchy Enforcement

Routes that modify users (update/delete):

```typescript
// PUT /admin/users/:id
// Requires: Admin+ role + hierarchy check (can only modify lower roles)
adminRoutes.put(
    '/users/:id',
    checkRoleHierarchy,           // Ensures target role < admin role
    AdminController.updateUser
);

// DELETE /admin/users/:id
// Requires: Admin+ role + hierarchy check + not self
adminRoutes.delete(
    '/users/:id',
    checkRoleHierarchy,           // Prevents deleting equal/higher roles
    AdminController.deleteUser
);

// PUT /admin/users/:id/password
// Requires: Admin+ role + hierarchy check + valid password
adminRoutes.put(
    '/users/:id/password',
    validateAdminPasswordReset,   // Validates password format
    checkRoleHierarchy,           // Hierarchy enforcement
    AdminController.resetUserPassword
);
```

**Protection:**
- `checkToken`: Validates JWT
- `requireAdmin`: Ensures role ≥ 3
- `checkRoleHierarchy`: Queries target user's role and enforces hierarchy
- (Optional) Input validation middleware

#### Level 4: Creation/Role Assignment

Routes that create users or change roles:

```typescript
// POST /admin/users/create
// Requires: Admin+ role + role creation validation
adminRoutes.post(
    '/users/create',
    validateAdminCreateUser,      // Validates all required fields
    validateRoleCreation,         // Ensures newRole ≤ adminRole
    AdminController.createUser
);

// PUT /admin/users/:id/role
// Requires: Admin+ role + strict role change hierarchy rules
adminRoutes.put(
    '/users/:id/role',
    validateAdminRoleChange,      // Validates role field
    checkRoleChangeHierarchy,     // Strictest hierarchy checks
    AdminController.changeUserRole
);
```

**Protection:**
- `checkToken`: Validates JWT
- `requireAdmin`: Ensures role ≥ 3
- `validateRoleCreation` / `checkRoleChangeHierarchy`: Enforces complex role assignment rules
- Input validation middleware

### Complete Route File

```typescript
// src/routes/admin/index.ts
const adminRoutes = Router();

// ===== GLOBAL PROTECTION =====
adminRoutes.use(checkToken);
adminRoutes.use(requireAdmin);

// ===== USER MANAGEMENT ROUTES =====

// Create user (Level 4: Creation)
adminRoutes.post(
    '/users/create',
    validateAdminCreateUser,
    validateRoleCreation,
    AdminController.createUser
);

// Get all users (Level 2: Input validation)
adminRoutes.get('/users', validateAdminUsersList, AdminController.getAllUsers);

// Search users (Level 2: Input validation)
adminRoutes.get('/users/search', validateUserSearch, AdminController.searchUsers);

// Dashboard stats (Level 1: Basic admin access)
adminRoutes.get('/users/stats/dashboard', AdminController.getDashboardStats);

// Get user by ID (Level 1: Basic admin access)
adminRoutes.get('/users/:id', AdminController.getUserById);

// Update user (Level 3: Hierarchy enforcement)
adminRoutes.put(
    '/users/:id',
    checkRoleHierarchy,
    AdminController.updateUser
);

// Delete user (Level 3: Hierarchy enforcement)
adminRoutes.delete(
    '/users/:id',
    checkRoleHierarchy,
    AdminController.deleteUser
);

// Reset password (Level 3: Hierarchy enforcement + validation)
adminRoutes.put(
    '/users/:id/password',
    validateAdminPasswordReset,
    checkRoleHierarchy,
    AdminController.resetUserPassword
);

// Change role (Level 4: Role assignment)
adminRoutes.put(
    '/users/:id/role',
    validateAdminRoleChange,
    checkRoleChangeHierarchy,
    AdminController.changeUserRole
);

export { adminRoutes };
```

### Protection Pattern Summary

```
┌──────────────────────────────────────────────────────────────┐
│ Route Protection Layers (Bottom to Top)                      │
├──────────────────────────────────────────────────────────────┤
│ Layer 4: Role Assignment Logic (checkRoleChangeHierarchy)   │
│ Layer 3: Hierarchy Enforcement (checkRoleHierarchy)         │
│ Layer 2: Input Validation (validate* middleware)            │
│ Layer 1: Admin Access (requireAdmin)                        │
│ Layer 0: Authentication (checkToken)                        │
└──────────────────────────────────────────────────────────────┘

Each layer adds additional security constraints.
Routes use only the layers they need.
```

---

## Admin User Management Operations

Let's examine real admin operations from `adminController.ts`:

### 1. Create User (Admin-Specified Role)

**Endpoint**: `POST /admin/users/create`

```typescript
// src/controllers/adminController.ts
static async createUser(request: IJwtRequest, response: Response): Promise<void> {
    const { firstname, lastname, email, password, username, role, phone } = request.body;
    const userRole = parseInt(role);  // Admin specifies role

    // Check if user already exists
    const userExists = await validateUserUniqueness(
        { email, username, phone },
        response
    );
    if (userExists) return;

    // Execute user creation transaction
    await executeTransactionWithResponse(
        async (client) => {
            // Create account with ADMIN-SPECIFIED role (not always 1)
            const insertAccountResult = await client.query(
                `INSERT INTO Account
                 (FirstName, LastName, Username, Email, Phone, Account_Role, Email_Verified, Phone_Verified, Account_Status)
                 VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, 'active')`,
                 //                        ↑ Admin-specified role (validated by middleware)
                [firstname, lastname, username, email, phone, userRole]
            );

            const accountId = insertAccountResult.rows[0].account_id;

            // Generate credentials
            const salt = generateSalt();
            const saltedHash = generateHash(password, salt);

            await client.query(
                'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
                [accountId, saltedHash, salt]
            );

            return {
                user: {
                    id: accountId,
                    email,
                    name: firstname,
                    lastname,
                    username,
                    role: RoleName[userRole],  // "User", "Moderator", "Admin", etc.
                    roleLevel: userRole,
                    emailVerified: false,
                    phoneVerified: false,
                    accountStatus: 'active',
                },
            };
        },
        response,
        'User created successfully by admin',
        'Failed to create user'
    );
}
```

**Key Points:**
- Admin can specify role in request body
- `validateRoleCreation` middleware ensures `role ≤ admin's role`
- New user starts as `'active'` (not `'pending'` like public registrations)
- Transaction ensures atomic operation (account + credentials created together)

### 2. Get All Users (Pagination & Filtering)

**Endpoint**: `GET /admin/users?page=1&limit=20&status=active&role=3`

```typescript
static async getAllUsers(request: IJwtRequest, response: Response): Promise<void> {
    const page = parseInt(request.query.page as string) || 1;
    const limit = Math.min(parseInt(request.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;
    const status = request.query.status as string;
    const role = request.query.role as string;

    try {
        // Build dynamic query with optional filters
        let countQuery = 'SELECT COUNT(*) FROM Account';
        let usersQuery = `
            SELECT
                a.Account_ID, a.FirstName, a.LastName, a.Username,
                a.Email, a.Phone, a.Account_Role, a.Email_Verified,
                a.Phone_Verified, a.Account_Status, a.Created_At, a.Updated_At
            FROM Account a
        `;

        const queryParams: (string | number)[] = [];
        const whereConditions: string[] = [];

        // Add status filter if provided
        if (status) {
            whereConditions.push(`Account_Status = $${queryParams.length + 1}`);
            queryParams.push(status);
        }

        // Add role filter if provided
        if (role) {
            const roleNumber = parseInt(role);
            if (!isNaN(roleNumber) && roleNumber >= 1 && roleNumber <= 5) {
                whereConditions.push(`Account_Role = $${queryParams.length + 1}`);
                queryParams.push(roleNumber);
            }
        }

        // Apply WHERE conditions
        if (whereConditions.length > 0) {
            const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
            countQuery += whereClause;
            usersQuery += whereClause.replace(/Account_/g, 'a.Account_');
        }

        // Get total count
        const countResult = await pool.query(countQuery, queryParams);
        const totalUsers = parseInt(countResult.rows[0].count);

        // Get paginated users
        usersQuery += ` ORDER BY a.Created_At DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
        queryParams.push(limit, offset);

        const usersResult = await pool.query(usersQuery, queryParams);

        // Format users data
        const users = usersResult.rows.map(user => ({
            id: user.account_id,
            firstName: user.firstname,
            lastName: user.lastname,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: RoleName[user.account_role as UserRole],  // Convert 1-5 to name
            roleLevel: user.account_role,
            emailVerified: user.email_verified,
            phoneVerified: user.phone_verified,
            accountStatus: user.account_status,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        }));

        // Build response with pagination metadata
        sendSuccess(response, {
            users,
            pagination: {
                page,
                limit,
                totalUsers,
                totalPages: Math.ceil(totalUsers / limit)
            },
            filters: { status, role }
        }, `Retrieved ${totalUsers} users`);

    } catch (error) {
        console.error('Error fetching users:', error);
        sendError(response, 500, 'Failed to fetch users', ErrorCodes.SRVR_DATABASE_ERROR);
    }
}
```

**Key Points:**
- Dynamic query building based on filters
- Pagination to prevent loading thousands of users at once
- Converts `Account_Role` (1-5) to human-readable names
- Returns metadata for UI pagination controls

### 3. Update User (With Hierarchy Check)

**Endpoint**: `PUT /admin/users/:id`

```typescript
static async updateUser(request: IJwtRequest, response: Response): Promise<void> {
    const userId = parseInt(request.params.id);
    const { accountStatus, emailVerified, phoneVerified } = request.body;

    // Note: checkRoleHierarchy middleware has already verified:
    // - Target user exists
    // - Admin has higher role than target

    // Build update query dynamically (only update provided fields)
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (accountStatus !== undefined) {
        updates.push(`Account_Status = $${paramCount++}`);
        values.push(accountStatus);
    }

    if (emailVerified !== undefined) {
        updates.push(`Email_Verified = $${paramCount++}`);
        values.push(emailVerified);
    }

    if (phoneVerified !== undefined) {
        updates.push(`Phone_Verified = $${paramCount++}`);
        values.push(phoneVerified);
    }

    if (updates.length === 0) {
        sendError(response, 400, 'No valid updates provided', ErrorCodes.VALD_MISSING_FIELDS);
        return;
    }

    // Always update timestamp
    updates.push(`Updated_At = NOW()`);
    values.push(userId);

    const updateQuery = `
        UPDATE Account
        SET ${updates.join(', ')}
        WHERE Account_ID = $${paramCount}
        RETURNING *
    `;

    try {
        const result = await pool.query(updateQuery, values);

        sendSuccess(response, {
            user: {
                id: result.rows[0].account_id,
                accountStatus: result.rows[0].account_status,
                emailVerified: result.rows[0].email_verified,
                phoneVerified: result.rows[0].phone_verified,
                updatedAt: result.rows[0].updated_at
            }
        }, 'User updated successfully');

    } catch (error) {
        console.error('Error updating user:', error);
        sendError(response, 500, 'Failed to update user', ErrorCodes.SRVR_DATABASE_ERROR);
    }
}
```

**Key Points:**
- Middleware (`checkRoleHierarchy`) runs first to validate hierarchy
- Dynamic query only updates provided fields (partial updates)
- Returns updated data for UI sync

### 4. Delete User (Soft Delete)

**Endpoint**: `DELETE /admin/users/:id`

```typescript
static async deleteUser(request: IJwtRequest, response: Response): Promise<void> {
    const userId = parseInt(request.params.id);

    // Note: checkRoleHierarchy middleware has verified:
    // - Target user exists
    // - Admin has higher role than target
    // - Admin is not deleting themselves

    try {
        // Soft delete by setting status to 'deleted'
        const result = await pool.query(
            `UPDATE Account
             SET Account_Status = 'deleted', Updated_At = NOW()
             WHERE Account_ID = $1 AND Account_Status != 'deleted'
             RETURNING Account_ID`,
            [userId]
        );

        if (result.rowCount === 0) {
            sendError(response, 404, 'User not found or already deleted', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        sendSuccess(response, null, 'User deleted successfully');

    } catch (error) {
        console.error('Error deleting user:', error);
        sendError(response, 500, 'Failed to delete user', ErrorCodes.SRVR_DATABASE_ERROR);
    }
}
```

**Key Points:**
- **Soft delete** (sets status to 'deleted') instead of hard delete (DELETE FROM)
- Preserves data for auditing and potential recovery
- Prevents deletion if already deleted (idempotent)

### 5. Change User Role (Strictest Hierarchy)

**Endpoint**: `PUT /admin/users/:id/role`

```typescript
static async changeUserRole(request: IJwtRequest, response: Response): Promise<void> {
    const userId = parseInt(request.params.id);
    const { role } = request.body;
    const newRole = parseInt(role);

    // Note: checkRoleChangeHierarchy middleware has verified:
    // - Admin is not changing their own role
    // - Target user has lower role than admin
    // - New role is not higher than admin's role
    // - Admin (role 3) cannot assign SuperAdmin (role 4) or Owner (role 5)

    try {
        // Get current user details for response
        const currentUserQuery = await pool.query(
            'SELECT * FROM Account WHERE Account_ID = $1',
            [userId]
        );

        if (currentUserQuery.rowCount === 0) {
            sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        const currentUser = currentUserQuery.rows[0];

        // Update user role
        const updateResult = await pool.query(
            'UPDATE Account SET Account_Role = $1, Updated_At = NOW() WHERE Account_ID = $2 RETURNING *',
            [newRole, userId]
        );

        if (updateResult.rowCount === 0) {
            sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
            return;
        }

        const updatedUser = updateResult.rows[0];

        // Return detailed response showing role change
        sendSuccess(response, {
            user: {
                id: updatedUser.account_id,
                firstName: updatedUser.firstname,
                lastName: updatedUser.lastname,
                username: updatedUser.username,
                email: updatedUser.email,
                role: RoleName[newRole],
                roleLevel: newRole,
                updatedAt: updatedUser.updated_at
            },
            previousRole: {
                role: RoleName[currentUser.account_role],
                roleLevel: currentUser.account_role
            }
        }, `User role changed from ${RoleName[currentUser.account_role]} to ${RoleName[newRole]}`);

    } catch (error) {
        console.error('Admin role change error:', error);
        sendError(response, 500, 'Failed to change user role', ErrorCodes.SRVR_DATABASE_ERROR);
    }
}
```

**Key Points:**
- Most protected operation (strictest middleware)
- Returns both previous and new role for audit trail
- Clear success message showing the role change

---

## Database Schema and Role Storage

### Account Table Structure

```sql
-- data/init.sql
CREATE TABLE Account (
    Account_ID SERIAL PRIMARY KEY,
    FirstName VARCHAR(255) NOT NULL,
    LastName VARCHAR(255) NOT NULL,
    Username VARCHAR(255) NOT NULL UNIQUE,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Email_Verified BOOLEAN DEFAULT FALSE,
    Phone VARCHAR(15) NOT NULL UNIQUE,
    Phone_Verified BOOLEAN DEFAULT FALSE,
    Account_Role INT NOT NULL,  -- ← Role stored as integer (1-5)
    Account_Status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'active', 'suspended', 'locked'
    Created_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Updated_At TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_account_email ON Account(Email);
CREATE INDEX idx_account_phone ON Account(Phone);
CREATE INDEX idx_account_username ON Account(Username);
CREATE INDEX idx_account_status ON Account(Account_Status);
```

### Role Storage Design

**Why Store Roles as Integers (1-5)?**

1. **Efficiency**: 4 bytes (INT) vs 20+ bytes (VARCHAR)
2. **Comparison**: Hierarchy checks use `<`, `>`, `<=` operators
3. **Consistency**: Prevents typos ("Adin" vs "Admin")
4. **Indexing**: Integer indexes are faster than string indexes

```typescript
// ✓ GOOD: Integer comparison (fast)
if (adminRole > targetRole) {
    // Admin can modify target
}

// ❌ BAD: String comparison (slow, error-prone)
if (adminRole === 'Admin' && targetRole === 'User') {
    // Brittle, doesn't scale
}
```

### Account_Credential Table (Separate)

```sql
CREATE TABLE Account_Credential (
    Credential_ID SERIAL PRIMARY KEY,
    Account_ID INT NOT NULL,
    Salted_Hash VARCHAR(255) NOT NULL,
    Salt VARCHAR(255),
    FOREIGN KEY(Account_ID) REFERENCES Account(Account_ID) ON DELETE CASCADE
);
```

**Why Separate Table?**
- Security: Credentials in separate table with stricter access controls
- Performance: Account queries don't load password hashes
- Flexibility: Support multiple credential types (password, OAuth, etc.)

### Role Queries

**Check User's Role:**
```sql
SELECT Account_Role FROM Account WHERE Account_ID = $1;
```

**Find All Admins:**
```sql
SELECT * FROM Account WHERE Account_Role >= 3;
```

**Find Users Modifiable by Admin (role 3):**
```sql
SELECT * FROM Account WHERE Account_Role < 3;  -- Users and Moderators
```

**Count Users by Role:**
```sql
SELECT Account_Role, COUNT(*) as count
FROM Account
GROUP BY Account_Role
ORDER BY Account_Role;

-- Result:
-- account_role | count
-- -------------+-------
--      1       |  150   (Users)
--      2       |   10   (Moderators)
--      3       |    5   (Admins)
--      4       |    2   (SuperAdmins)
--      5       |    1   (Owner)
```

### Role Mapping in Code

```typescript
// src/core/models/index.ts
export enum UserRole {
    USER = 1,
    MODERATOR = 2,
    ADMIN = 3,
    SUPER_ADMIN = 4,
    OWNER = 5
}

export const RoleName = {
    [UserRole.USER]: 'User',
    [UserRole.MODERATOR]: 'Moderator',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.SUPER_ADMIN]: 'SuperAdmin',
    [UserRole.OWNER]: 'Owner'
} as const;

// Usage:
const roleName = RoleName[account.account_role];  // RoleName[3] = 'Admin'
```

---

## Security Considerations and Best Practices

### 1. Always Validate Hierarchy

**Never trust client input for role operations:**

```typescript
// ❌ INSECURE: No hierarchy check
app.delete('/admin/users/:id', requireAdmin, async (req, res) => {
    await pool.query('DELETE FROM Account WHERE Account_ID = $1', [req.params.id]);
    // Admin can delete anyone, including Owners!
});

// ✓ SECURE: Hierarchy middleware
app.delete('/admin/users/:id', requireAdmin, checkRoleHierarchy, async (req, res) => {
    // Middleware ensures admin can only delete lower roles
    await pool.query('UPDATE Account SET Account_Status = \'deleted\' WHERE Account_ID = $1', [req.params.id]);
});
```

### 2. Prevent Self-Modification for Critical Operations

```typescript
// ✓ GOOD: Prevent self-deletion
if (request.method === 'DELETE' && targetUserId === adminId) {
    sendError(response, 400, 'Cannot delete your own account');
    return;
}

// ✓ GOOD: Prevent self-role-change
if (targetUserId === adminId) {
    sendError(response, 400, 'Cannot change your own role');
    return;
}
```

**Why?** Prevents accidental lockout scenarios:
- Admin accidentally demotes themselves to User
- Admin deletes their own account
- Last Owner removes their Owner role

### 3. Soft Delete Over Hard Delete

```typescript
// ✓ GOOD: Soft delete (reversible)
UPDATE Account SET Account_Status = 'deleted', Updated_At = NOW() WHERE Account_ID = $1;

// ❌ BAD: Hard delete (irreversible)
DELETE FROM Account WHERE Account_ID = $1;
```

**Benefits:**
- Audit trail preserved
- Data recovery possible
- Foreign key relationships maintained
- Compliance requirements (GDPR right to erasure can be implemented separately)

### 4. Use Transactions for Multi-Step Operations

```typescript
// ✓ GOOD: Transaction ensures atomicity
await executeTransactionWithResponse(
    async (client) => {
        await client.query('INSERT INTO Account (...) VALUES (...)', [...]);
        await client.query('INSERT INTO Account_Credential (...) VALUES (...)', [...]);
        return userData;
    },
    response,
    'User created successfully',
    'Failed to create user'
);

// ❌ BAD: No transaction (account created but credentials fail)
await pool.query('INSERT INTO Account (...) VALUES (...)', [...]);
await pool.query('INSERT INTO Account_Credential (...) VALUES (...)', [...]);
// If second query fails, user exists with no credentials!
```

### 5. Log Authorization Decisions

```typescript
// ✓ GOOD: Log failed authorization attempts
if (adminRole <= targetRole) {
    console.warn(`[AUTHORIZATION FAILED] User ${adminId} (role ${adminRole}) attempted to modify user ${targetUserId} (role ${targetRole})`);
    sendError(response, 403, 'Cannot modify user with equal or higher role');
    return;
}
```

**Benefits:**
- Security monitoring
- Detect malicious activity
- Audit compliance

### 6. Principle of Least Privilege

**Start with minimal permissions, grant more as needed:**

```typescript
// ✓ GOOD: New users start as role 1 (User)
const insertAccountResult = await client.query(
    `INSERT INTO Account (..., Account_Role, ...) VALUES (..., 1, ...)`,
    [...]
);

// ❌ BAD: New users start as Admin
const insertAccountResult = await client.query(
    `INSERT INTO Account (..., Account_Role, ...) VALUES (..., 3, ...)`,
    [...]
);
```

### 7. Validate Role Ranges

```typescript
// ✓ GOOD: Validate role is in valid range
if (isNaN(newUserRole) || newUserRole < 1 || newUserRole > 5) {
    sendError(response, 400, 'Invalid role. Must be between 1-5');
    return;
}

// ❌ BAD: No validation
const newUserRole = parseInt(request.body.role);
await pool.query('UPDATE Account SET Account_Role = $1 WHERE Account_ID = $2', [newUserRole, userId]);
// User could set role to 999!
```

### 8. Secure JWT Claims

```typescript
// ✓ GOOD: JWT contains role for authorization
const token = jwt.sign(
    {
        id: account.account_id,
        email: account.email,
        role: account.account_role  // Include role for RBAC
    },
    jwtSecret,
    { expiresIn: '14d' }
);

// ❌ BAD: JWT without role (requires DB query for every auth check)
const token = jwt.sign(
    {
        id: account.account_id,
        email: account.email
    },
    jwtSecret,
    { expiresIn: '14d' }
);
// Must query database on every request to check role
```

**Important**: If user's role changes, they must re-login to get new JWT with updated role.

### 9. HTTPS Only for Production

```typescript
// ✓ GOOD: Enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.secure) {
            next();
        } else {
            res.redirect('https://' + req.headers.host + req.url);
        }
    });
}
```

**Why?** JWTs contain sensitive role information and should never be transmitted over plain HTTP.

### 10. Rate Limiting for Admin Endpoints

```typescript
// ✓ GOOD: Rate limit admin operations
import rateLimit from 'express-rate-limit';

const adminRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many admin requests from this IP, please try again later.'
});

adminRoutes.use(adminRateLimiter);
```

**Prevents:**
- Brute force role elevation attempts
- Admin credential stuffing
- Denial of service attacks

---

## Common Patterns and Anti-Patterns

### Pattern 1: Middleware Composition

**✓ GOOD: Layer middleware for granular control**
```typescript
adminRoutes.post(
    '/users/create',
    validateAdminCreateUser,  // Layer 1: Input validation
    validateRoleCreation,     // Layer 2: Role hierarchy
    AdminController.createUser // Layer 3: Business logic
);
```

**❌ BAD: Single monolithic controller**
```typescript
adminRoutes.post('/users/create', async (req, res) => {
    // Validation, authorization, business logic all mixed
    if (!req.body.email) { return res.status(400).json({...}); }
    if (req.claims.role < req.body.role) { return res.status(403).json({...}); }
    // ... 100 lines of mixed concerns
});
```

### Pattern 2: Fail-Fast Authorization

**✓ GOOD: Check cheapest conditions first**
```typescript
export const checkRoleHierarchy = async (req, res, next) => {
    // 1. Cheap check: Validate input
    if (isNaN(targetUserId)) {
        sendError(response, 400, 'Invalid user ID');
        return;
    }

    // 2. Cheap check: Self-modification
    if (targetUserId === adminId) {
        sendError(response, 400, 'Cannot modify yourself');
        return;
    }

    // 3. Expensive check: Database query
    const targetUserQuery = await getPool().query(...);
    // ...
};
```

**❌ BAD: Database query first**
```typescript
export const checkRoleHierarchy = async (req, res, next) => {
    // Query database even for invalid input
    const targetUserQuery = await getPool().query(...);

    if (isNaN(targetUserId)) {
        sendError(response, 400, 'Invalid user ID');
        return;
    }
    // Wasted database query!
};
```

### Pattern 3: Explicit Role Checks

**✓ GOOD: Explicit comparison operators**
```typescript
// Clear: admin must have strictly higher role
if (adminRole <= targetRole) {
    sendError(response, 403, 'Cannot modify user with equal or higher role');
    return;
}
```

**❌ BAD: Implicit or confusing logic**
```typescript
// Confusing: what does this actually allow?
if (!(adminRole > targetRole)) {
    sendError(response, 403, 'Cannot modify user');
    return;
}
```

### Pattern 4: Separate Validation from Business Logic

**✓ GOOD: Validation in middleware, logic in controller**
```typescript
// Middleware: Validate inputs
export const validateRoleCreation = (req, res, next) => {
    const newUserRole = parseInt(req.body.role);
    if (isNaN(newUserRole) || newUserRole < 1 || newUserRole > 5) {
        sendError(response, 400, 'Invalid role');
        return;
    }
    next();
};

// Controller: Business logic
static async createUser(request, response) {
    // Assume inputs are valid
    const userRole = parseInt(request.body.role);
    await pool.query('INSERT INTO Account (...) VALUES (...)', [...]);
}
```

**❌ BAD: Mixed concerns**
```typescript
static async createUser(request, response) {
    // Validation mixed with business logic
    const userRole = parseInt(request.body.role);
    if (isNaN(userRole) || userRole < 1 || userRole > 5) {
        return sendError(response, 400, 'Invalid role');
    }
    if (userRole > request.claims.role) {
        return sendError(response, 403, 'Cannot create higher role');
    }
    await pool.query('INSERT INTO Account (...) VALUES (...)', [...]);
}
```

### Pattern 5: Use Enums for Roles

**✓ GOOD: Type-safe enum**
```typescript
export enum UserRole {
    USER = 1,
    MODERATOR = 2,
    ADMIN = 3,
    SUPER_ADMIN = 4,
    OWNER = 5
}

if (userRole < UserRole.ADMIN) {
    // Type-safe, clear intent
}
```

**❌ BAD: Magic numbers**
```typescript
if (userRole < 3) {
    // What is 3? Why 3? Hard to maintain
}
```

### Anti-Pattern 1: Ignoring Hierarchy for "Trusted" Admins

**❌ DANGEROUS:**
```typescript
// Never do this!
if (request.claims.role === UserRole.ADMIN) {
    // "Admins are trusted, skip hierarchy check"
    await pool.query('DELETE FROM Account WHERE Account_ID = $1', [targetUserId]);
}
```

**Why dangerous:**
- Compromised admin account = complete system takeover
- No protection against malicious insiders
- Violates defense-in-depth principle

### Anti-Pattern 2: Client-Side Role Checks

**❌ INSECURE:**
```typescript
// Frontend (React/Angular/Vue)
if (user.role >= 3) {
    // Show admin button
    <button onClick={() => deleteUser(userId)}>Delete User</button>
}
```

**Why insecure:**
- Client code is easily bypassed (browser dev tools)
- User can manipulate JWT in localStorage
- **Always enforce authorization on the server**

**✓ CORRECT:**
```typescript
// Frontend: Show UI based on role (UX only)
if (user.role >= 3) {
    <button onClick={() => deleteUser(userId)}>Delete User</button>
}

// Backend: ALWAYS enforce authorization
app.delete('/admin/users/:id', checkToken, requireAdmin, checkRoleHierarchy, deleteUserController);
```

### Anti-Pattern 3: Storing Roles as Strings

**❌ PROBLEMATIC:**
```sql
CREATE TABLE Account (
    ...
    Account_Role VARCHAR(20) NOT NULL  -- "User", "Admin", etc.
);
```

**Why problematic:**
- Typos: "Adin" vs "Admin"
- Case sensitivity: "admin" vs "Admin"
- No natural hierarchy: Can't use `<` or `>` operators
- Slower comparisons and indexing

### Anti-Pattern 4: Role Proliferation

**❌ BAD: Too many granular roles**
```typescript
enum UserRole {
    USER = 1,
    USER_PREMIUM = 2,
    MODERATOR = 3,
    MODERATOR_SENIOR = 4,
    ADMIN = 5,
    ADMIN_FINANCE = 6,
    ADMIN_HR = 7,
    ADMIN_IT = 8,
    SUPER_ADMIN = 9,
    OWNER = 10
    // ... 20 more roles
}
```

**Why bad:**
- Unmaintainable middleware logic
- Confusion about hierarchy
- Consider permission-based RBAC or ABAC (Attribute-Based Access Control) instead

**✓ BETTER: Keep hierarchy simple, use permissions for granularity**
```typescript
enum UserRole {
    USER = 1,
    MODERATOR = 2,
    ADMIN = 3,
    SUPER_ADMIN = 4,
    OWNER = 5
}

// Add permissions table for fine-grained control
CREATE TABLE Role_Permissions (
    Role_ID INT,
    Permission VARCHAR(50)  -- 'finance.view', 'hr.modify', etc.
);
```

---

## Real-World Code Examples

### Example 1: Complete Admin Route Flow

Let's trace a complete request to delete a user:

```typescript
// Client request
DELETE /admin/users/42
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInJvbGUiOjN9...
//                         ↓ JWT contains: { id: 10, role: 3 } (Admin)

// src/routes/admin/index.ts
adminRoutes.delete(
    '/users/:id',
    checkRoleHierarchy,      // Middleware 1
    AdminController.deleteUser // Controller
);

// ===== MIDDLEWARE 1: checkRoleHierarchy =====
export const checkRoleHierarchy = async (req, res, next) => {
    const targetUserId = 42;       // From request.params.id
    const adminRole = 3;           // From request.claims.role (JWT)
    const adminId = 10;            // From request.claims.id (JWT)

    // Check 1: Prevent self-deletion
    if (req.method === 'DELETE' && targetUserId === adminId) {
        // 42 !== 10, pass
    }

    // Check 2: Query target user's role
    const result = await pool.query(
        'SELECT Account_Role FROM Account WHERE Account_ID = $1',
        [42]
    );
    // Returns: { account_role: 1 } (User)

    const targetRole = 1;

    // Check 3: Hierarchy validation
    if (adminRole <= targetRole) {
        // 3 <= 1 is false, pass
    }

    // All checks passed, continue
    req.targetUserRole = 1;
    next();
};

// ===== CONTROLLER: AdminController.deleteUser =====
static async deleteUser(req, res) {
    const userId = 42;

    // Soft delete
    const result = await pool.query(
        `UPDATE Account
         SET Account_Status = 'deleted', Updated_At = NOW()
         WHERE Account_ID = $1 AND Account_Status != 'deleted'
         RETURNING Account_ID`,
        [42]
    );

    // Success
    sendSuccess(response, null, 'User deleted successfully');
}

// Client response
// 200 OK
// {
//   "success": true,
//   "message": "User deleted successfully",
//   "data": null,
//   "timestamp": "2024-01-15T10:30:00.000Z"
// }
```

### Example 2: Failed Hierarchy Check

```typescript
// Client request (Admin tries to delete SuperAdmin)
DELETE /admin/users/99
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTAsInJvbGUiOjN9...
//                         ↓ JWT contains: { id: 10, role: 3 } (Admin)

// ===== MIDDLEWARE: checkRoleHierarchy =====
const adminRole = 3;           // Admin
const targetUserId = 99;

// Query target user's role
const result = await pool.query(
    'SELECT Account_Role FROM Account WHERE Account_ID = $1',
    [99]
);
// Returns: { account_role: 4 } (SuperAdmin)

const targetRole = 4;

// Hierarchy check FAILS
if (adminRole <= targetRole) {
    // 3 <= 4 is TRUE
    sendError(
        response,
        403,
        'Cannot delete user with equal or higher role',
        ErrorCodes.AUTH_UNAUTHORIZED
    );
    return;  // Stop execution, controller never runs
}

// Client response
// 403 Forbidden
// {
//   "success": false,
//   "message": "Cannot delete user with equal or higher role",
//   "error": {
//     "code": "AUTH_UNAUTHORIZED"
//   },
//   "timestamp": "2024-01-15T10:30:00.000Z"
// }
```

### Example 3: Role Change with Detailed Checks

```typescript
// Client request (Admin promotes User to Moderator)
PUT /admin/users/42/role
Authorization: Bearer <admin-jwt>
{
    "role": 2  // Moderator
}

// ===== MIDDLEWARE: checkRoleChangeHierarchy =====
const targetUserId = 42;
const adminRole = 3;           // Admin
const adminId = 10;
const newRole = 2;             // Moderator

// Check 1: Not self-modification
if (targetUserId === adminId) {
    // 42 !== 10, pass
}

// Check 2: Cannot promote higher than own role
if (newRole > adminRole) {
    // 2 > 3 is false, pass
}

// Check 3: Query target's CURRENT role
const result = await pool.query(
    'SELECT Account_Role FROM Account WHERE Account_ID = $1',
    [42]
);
// Returns: { account_role: 1 } (User)

const currentTargetRole = 1;

// Check 4: Target must have lower role
if (currentTargetRole >= adminRole) {
    // 1 >= 3 is false, pass
}

// Check 5: Admin (role 3) can only assign up to Admin (role 3)
if (adminRole === 3 && newRole > 3) {
    // 3 === 3 is true, but newRole is 2
    // 2 > 3 is false, pass
}

// All checks passed
next();

// ===== CONTROLLER: changeUserRole =====
// Get current role for response
const currentUser = await pool.query(
    'SELECT * FROM Account WHERE Account_ID = $1',
    [42]
);
// { account_role: 1, firstname: 'John', ... }

// Update role
await pool.query(
    'UPDATE Account SET Account_Role = $1, Updated_At = NOW() WHERE Account_ID = $2',
    [2, 42]  // Set role to 2 (Moderator)
);

// Return detailed response
sendSuccess(response, {
    user: {
        id: 42,
        firstName: 'John',
        role: 'Moderator',
        roleLevel: 2,
        updatedAt: '2024-01-15T10:30:00.000Z'
    },
    previousRole: {
        role: 'User',
        roleLevel: 1
    }
}, 'User role changed from User to Moderator');

// Client response
// 200 OK
// {
//   "success": true,
//   "message": "User role changed from User to Moderator",
//   "data": {
//     "user": {
//       "id": 42,
//       "firstName": "John",
//       "role": "Moderator",
//       "roleLevel": 2,
//       "updatedAt": "2024-01-15T10:30:00.000Z"
//     },
//     "previousRole": {
//       "role": "User",
//       "roleLevel": 1
//     }
//   },
//   "timestamp": "2024-01-15T10:30:00.000Z"
// }
```

---

## Summary

### Key Takeaways

1. **Authentication vs Authorization**:
   - Authentication (AuthN): "Who are you?" - Verify identity via JWT
   - Authorization (AuthZ): "What can you do?" - Check permissions via RBAC

2. **5-Tier Role Hierarchy**:
   - User (1): Default role for all registrations
   - Moderator (2): Content moderation
   - Admin (3): Full user management with hierarchy limits
   - SuperAdmin (4): Elevated administration
   - Owner (5): Unrestricted access

3. **Hierarchy Enforcement is Critical**:
   - Users can only affect users with **strictly lower** roles
   - Prevents privilege escalation attacks
   - Enforced by `checkRoleHierarchy` and `checkRoleChangeHierarchy` middleware

4. **Middleware Patterns**:
   - `requireAdmin`: Basic role check (role >= 3)
   - `checkRoleHierarchy`: Enforces hierarchy for modify/delete
   - `checkRoleChangeHierarchy`: Strictest rules for role changes
   - Middleware composition provides defense-in-depth

5. **Security Best Practices**:
   - Always start with least privilege (role 1)
   - Use soft deletes for audit trail
   - Prevent self-modification for critical operations
   - Log authorization failures
   - Validate all inputs
   - Use transactions for multi-step operations

### Further Learning

- **Explore the Full Implementation**:
  - [`/src/core/middleware/adminAuth.ts`](../../TCSS-460-auth-squared/src/core/middleware/adminAuth.ts) - RBAC middleware
  - [`/src/controllers/adminController.ts`](../../TCSS-460-auth-squared/src/controllers/adminController.ts) - Admin operations
  - [`/src/routes/admin/index.ts`](../../TCSS-460-auth-squared/src/routes/admin/index.ts) - Route protection
  - [`/src/core/models/index.ts`](../../TCSS-460-auth-squared/src/core/models/index.ts) - Role definitions

- **Deep Dive Topics**:
  - Permission-Based RBAC (roles + permissions tables)
  - Attribute-Based Access Control (ABAC)
  - OAuth 2.0 scopes and claims
  - Multi-tenancy and role hierarchies
  - RBAC in microservices architectures

- **Related Documentation**:
  - [Authentication Guide](../../TCSS-460-auth-squared/docs-2.0/authentication-guide.md) - JWT authentication concepts
  - [Web Security Guide](../../TCSS-460-auth-squared/docs-2.0/web-security-guide.md) - Security best practices
  - [Database Fundamentals](../../TCSS-460-auth-squared/docs-2.0/database-fundamentals.md) - Schema design

### Related Resources

- **NIST RBAC Standard**: https://csrc.nist.gov/projects/role-based-access-control
- **OWASP Authorization Cheat Sheet**: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- **OAuth 2.0 and RBAC**: https://auth0.com/docs/manage-users/access-control/rbac

---

## Related Guides

- **[JWT Implementation Guide](./jwt-implementation-guide.md)** - Authentication before authorization
- **[API Route Organization](./api-route-organization.md)** - How roles protect different route tiers
- **[Account Lifecycle Guide](./account-lifecycle-guide.md)** - Role changes throughout user lifecycle

---

**Questions or feedback?** Reach out to cfb3@uw.edu or visit office hours!

**Now you understand RBAC! Start exploring the codebase and experiment with the admin endpoints.**
