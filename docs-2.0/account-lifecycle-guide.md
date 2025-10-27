# Account Lifecycle Management Guide

A comprehensive educational guide to user account management from birth to death in TCSS-460-auth-squared.

> **Learning Objectives**: Understand complete user account lifecycle, state management, security considerations, and administrative operations for senior CS students.

## Quick Navigation
- **Registration Phase**: [Account Creation](#1-registration-phase-account-birth)
- **Verification Phase**: [Email & SMS Verification](#2-verification-phase-account-activation)
- **Active Use Phase**: [Login & Password Management](#3-active-use-phase-normal-operations)
- **Role Management**: [Privilege Elevation](#4-role-elevation-phase-permission-management)
- **Account Updates**: [Profile Changes](#5-account-update-phase-profile-management)
- **Password Recovery**: [Reset Flow](#6-password-reset-flow-account-recovery)
- **Account Deletion**: [Soft Delete & Cleanup](#7-account-deletion-phase-end-of-life)
- **State Diagrams**: [Status Transitions](#account-status-state-diagram)
- **Timeline Examples**: [User Journeys](#typical-user-journey-timelines)

---

## Table of Contents

1. [Account Lifecycle Overview](#account-lifecycle-overview)
2. [Registration Phase - Account Birth](#1-registration-phase-account-birth)
3. [Verification Phase - Account Activation](#2-verification-phase-account-activation)
4. [Active Use Phase - Normal Operations](#3-active-use-phase-normal-operations)
5. [Role Elevation Phase - Permission Management](#4-role-elevation-phase-permission-management)
6. [Account Update Phase - Profile Management](#5-account-update-phase-profile-management)
7. [Password Reset Flow - Account Recovery](#6-password-reset-flow-account-recovery)
8. [Account Deletion Phase - End of Life](#7-account-deletion-phase-end-of-life)
9. [Account Status State Diagram](#account-status-state-diagram)
10. [Database Schema & Relationships](#database-schema--relationships)
11. [Typical User Journey Timelines](#typical-user-journey-timelines)
12. [Security Considerations by Phase](#security-considerations-by-phase)
13. [Admin Operations & Permissions](#admin-operations--permissions)
14. [Cascade Delete Considerations](#cascade-delete-considerations)

---

## Account Lifecycle Overview

### The Complete Journey

User accounts in TCSS-460-auth-squared follow a well-defined lifecycle with clear states and transitions. Understanding this lifecycle is essential for building secure, maintainable authentication systems.

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ACCOUNT LIFECYCLE FLOW                          │
└─────────────────────────────────────────────────────────────────────┘

  BIRTH                VERIFICATION           ACTIVE USE
    ↓                       ↓                      ↓
┌─────────┐          ┌──────────┐           ┌──────────┐
│Register │─────────▶│ Verify   │──────────▶│  Login   │
│  POST   │          │Email/SMS │           │  Active  │
│/register│          │          │           │  Usage   │
└─────────┘          └──────────┘           └──────────┘
    │                     │                      │
    │                     │                      ├──▶ Password Change
    │                     │                      ├──▶ Profile Updates
    │                     │                      ├──▶ Role Changes
    │                     │                      │
    │                     │                      ↓
    │                     │                 ┌──────────┐
    │                     │                 │Password  │
    │                     │                 │Reset     │
    │                     │                 │Flow      │
    │                     │                 └──────────┘
    │                     │                      │
    │                     │                      ↓
    │                     │                 ┌──────────┐
    │                     └─────────────────│Suspended │
    │                                       │ Locked   │
    │                                       │ Deleted  │
    └───────────────────────────────────────┴──────────┘
                                             END OF LIFE
```

### Core Database Tables

The account lifecycle spans four primary tables:

1. **Account** - Core user information and status
2. **Account_Credential** - Password hashes and salts
3. **Email_Verification** - Email verification tokens
4. **Phone_Verification** - SMS verification codes

### Account States

| State | Description | Can Login? | Database Status |
|-------|-------------|-----------|-----------------|
| **pending** | Newly registered, awaiting verification | Yes | Account_Status = 'pending' |
| **active** | Fully verified and operational | Yes | Account_Status = 'active' |
| **suspended** | Temporarily disabled by admin | No | Account_Status = 'suspended' |
| **locked** | Security lock (too many failed attempts) | No | Account_Status = 'locked' |
| **deleted** | Soft-deleted by admin | No | Account_Status = 'deleted' |

---

## 1. Registration Phase: Account Birth

### Overview

Registration is the entry point to the system. Users provide basic information and receive an account with role=1 (User) and status='pending'. This phase creates the foundation records but does not yet fully activate the account.

### Endpoint Details

**POST /auth/register**
- **Access**: Public (open routes)
- **Validation**: Email format, password strength, unique username/email/phone
- **Initial Role**: 1 (User) - hardcoded for security
- **Initial Status**: 'pending' - requires verification
- **Controller**: `AuthController.register()` in `/src/controllers/authController.ts`

### Registration Request Flow

```typescript
// Client sends registration request
POST /auth/register
Content-Type: application/json

{
  "firstname": "Jane",
  "lastname": "Doe",
  "email": "jane.doe@example.com",
  "password": "SecurePass123!",
  "username": "janedoe",
  "phone": "2065551234"
}
```

### Step-by-Step Process

#### Step 1: Validation
```typescript
// Middleware: validateRegister (runs BEFORE controller)
// Located in: /src/core/middleware/authValidation.ts

- Email format validation (must be valid email)
- Password strength (min 8 chars, uppercase, lowercase, number)
- Required fields check (all fields must be present)
- Field length validation
```

#### Step 2: Uniqueness Check
```typescript
// Controller: AuthController.register()
// Lines 30-34 in authController.ts

const userExists = await validateUserUniqueness(
  { email, username, phone },
  response
);
if (userExists) return; // Stops execution if duplicate found

// Checks three uniqueness constraints:
// - Email must be unique (no other account with this email)
// - Username must be unique
// - Phone must be unique
```

#### Step 3: Transaction - Create Account & Credentials
```typescript
// Lines 37-85 in authController.ts
// Uses executeTransactionWithResponse() for atomicity

await executeTransactionWithResponse(
  async (client) => {
    // 3a. Create Account record
    const insertAccountResult = await client.query(
      `INSERT INTO Account
       (FirstName, LastName, Username, Email, Phone, Account_Role,
        Email_Verified, Phone_Verified, Account_Status)
       VALUES ($1, $2, $3, $4, $5, 1, FALSE, FALSE, 'pending')
       RETURNING Account_ID`,
      [firstname, lastname, username, email, phone]
    );

    const accountId = insertAccountResult.rows[0].account_id;

    // 3b. Generate secure password credentials
    const salt = generateSalt();              // Random salt
    const saltedHash = generateHash(password, salt); // bcrypt hash

    // 3c. Store credentials in separate table
    await client.query(
      `INSERT INTO Account_Credential
       (Account_ID, Salted_Hash, Salt)
       VALUES ($1, $2, $3)`,
      [accountId, saltedHash, salt]
    );

    // 3d. Generate JWT access token
    const token = generateAccessToken({
      id: accountId,
      email,
      role: 1
    });

    // 3e. Return success response
    return {
      accessToken: token,
      user: {
        id: accountId,
        email,
        name: firstname,
        lastname,
        username,
        role: 'User',
        emailVerified: false,
        phoneVerified: false,
        accountStatus: 'pending'
      }
    };
  },
  response,
  'User registration successful',
  'Registration failed'
);
```

### Database Changes

**Table: Account**
```sql
INSERT INTO Account (
  FirstName,           -- 'Jane'
  LastName,            -- 'Doe'
  Username,            -- 'janedoe' (must be unique)
  Email,               -- 'jane.doe@example.com' (must be unique)
  Phone,               -- '2065551234' (must be unique)
  Account_Role,        -- 1 (User role - hardcoded)
  Email_Verified,      -- FALSE (not yet verified)
  Phone_Verified,      -- FALSE (not yet verified)
  Account_Status,      -- 'pending' (awaiting verification)
  Created_At,          -- CURRENT_TIMESTAMP
  Updated_At           -- CURRENT_TIMESTAMP
) RETURNING Account_ID;
```

**Table: Account_Credential**
```sql
INSERT INTO Account_Credential (
  Account_ID,          -- From Account table
  Salted_Hash,         -- bcrypt hash of password
  Salt                 -- Random salt used for hashing
);
```

### Security Considerations - Registration

1. **Password Hashing**: Never store plaintext passwords
   - Uses bcrypt algorithm via `generateHash()`
   - Salt stored separately for additional security

2. **Role Hardcoding**: Initial role always set to 1 (User)
   - Prevents privilege escalation during registration
   - Admins must explicitly promote users later

3. **Uniqueness Constraints**: Prevents duplicate accounts
   - Database-level UNIQUE constraints on Email, Username, Phone
   - Application-level validation before insertion

4. **Transaction Safety**: All-or-nothing operation
   - If credential creation fails, account creation is rolled back
   - Prevents orphaned accounts without credentials

### What Can User Do After Registration?

✅ **User CAN:**
- Login with credentials (even with status='pending')
- Request email verification
- Request SMS verification
- Change password (if they know old password)

❌ **User CANNOT:**
- Access certain protected features (depends on implementation)
- Verify without requesting verification codes/links
- Change role (requires admin intervention)

### Common Registration Errors

| Error Code | Message | Cause |
|------------|---------|-------|
| `VALD_MISSING_FIELDS` | Missing required fields | Incomplete request body |
| `VALD_INVALID_EMAIL` | Invalid email format | Malformed email address |
| `VALD_INVALID_PASSWORD` | Password too weak | Doesn't meet strength requirements |
| `USER_EXISTS` | User already exists | Email, username, or phone already taken |
| `SRVR_TRANSACTION_FAILED` | Registration failed | Database transaction error |

---

## 2. Verification Phase: Account Activation

### Overview

After registration, users should verify their email and phone to confirm ownership. Verification changes the `Email_Verified` and `Phone_Verified` flags from FALSE to TRUE. While verification is recommended, users can often still login with status='pending'.

### Email Verification Flow

#### 2.1: Send Email Verification

**POST /auth/verify/email/send** (Protected - requires JWT)

```typescript
// Client requests email verification
POST /auth/verify/email/send
Authorization: Bearer <jwt_token>

// Controller: VerificationController.sendEmailVerification()
// Lines 22-103 in verificationController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract user ID from JWT claims
const userId = request.claims.id;

// Step 2: Get user information
const userResult = await pool.query(
  'SELECT FirstName, Email, Email_Verified FROM Account WHERE Account_ID = $1',
  [userId]
);

// Step 3: Check if already verified
if (email_verified) {
  sendError(response, 400, 'Email is already verified');
  return;
}

// Step 4: Rate limiting check (prevent spam)
// Checks for recent verification request within last 5 minutes
const recentVerification = await pool.query(
  `SELECT COUNT(*) as count
   FROM Email_Verification
   WHERE Account_ID = $1
   AND Token_Expires > NOW()
   AND Created_At > NOW() - INTERVAL '5 minutes'`,
  [userId]
);

if (count > 0) {
  sendError(response, 429, 'Please wait before requesting another email');
  return;
}

// Step 5: Delete old verification tokens (cleanup)
await pool.query(
  'DELETE FROM Email_Verification WHERE Account_ID = $1',
  [userId]
);

// Step 6: Generate verification token
const verificationToken = generateSecureToken(); // Random 64-char string
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

// Step 7: Store token in database
await pool.query(
  `INSERT INTO Email_Verification
   (Account_ID, Email, Verification_Token, Token_Expires)
   VALUES ($1, $2, $3, $4)`,
  [userId, email, verificationToken, expiresAt]
);

// Step 8: Create verification URL
const baseUrl = getEnvVar('APP_BASE_URL', 'http://localhost:8000');
const verificationUrl = `${baseUrl}/auth/verify/email/confirm?token=${verificationToken}`;

// Step 9: Send email (actual SMTP sending)
const emailSent = await sendVerificationEmail(email, firstname, verificationUrl);

// Step 10: Return success response
sendSuccess(response, {
  expiresIn: '48 hours',
  verificationUrl: isDevelopment() ? verificationUrl : undefined
}, 'Verification email sent successfully');
```

**Database Changes:**
```sql
-- Email_Verification table
INSERT INTO Email_Verification (
  Account_ID,              -- User requesting verification
  Email,                   -- Email to verify
  Verification_Token,      -- Random 64-character token
  Token_Expires,           -- NOW() + 48 hours
  Verified,                -- FALSE (not yet confirmed)
  Created_At               -- CURRENT_TIMESTAMP
);
```

#### 2.2: Confirm Email Verification

**GET /auth/verify/email/confirm?token=xxx** (Public - no JWT required)

```typescript
// User clicks link in email
GET /auth/verify/email/confirm?token=abc123...xyz

// Controller: VerificationController.confirmEmailVerification()
// Lines 108-171 in verificationController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract token from query string
const { token } = request.query;

// Step 2: Find verification record and join with Account
const verificationResult = await pool.query(
  `SELECT ev.Account_ID, ev.Email, ev.Token_Expires, a.Email_Verified
   FROM Email_Verification ev
   JOIN Account a ON ev.Account_ID = a.Account_ID
   WHERE ev.Verification_Token = $1`,
  [token]
);

if (verificationResult.rowCount === 0) {
  sendError(response, 400, 'Invalid verification token');
  return;
}

// Step 3: Check if already verified
if (email_verified) {
  sendError(response, 400, 'Email is already verified');
  return;
}

// Step 4: Check token expiration (48 hours)
if (new Date() > new Date(token_expires)) {
  sendError(response, 400, 'Verification token has expired');
  return;
}

// Step 5: Transaction - Update account and delete token
await executeTransactionWithResponse(
  async (client) => {
    // Mark email as verified
    await client.query(
      `UPDATE Account
       SET Email_Verified = TRUE, Updated_At = NOW()
       WHERE Account_ID = $1`,
      [account_id]
    );

    // Delete verification token (single-use)
    await client.query(
      'DELETE FROM Email_Verification WHERE Account_ID = $1',
      [account_id]
    );

    return null;
  },
  response,
  'Email verified successfully',
  'Failed to verify email'
);
```

**Database Changes:**
```sql
-- Account table
UPDATE Account
SET Email_Verified = TRUE,
    Updated_At = NOW()
WHERE Account_ID = 123;

-- Email_Verification table
DELETE FROM Email_Verification WHERE Account_ID = 123;
```

### Phone Verification Flow

#### 2.3: Send SMS Verification Code

**POST /auth/verify/phone/send** (Protected - requires JWT)

```typescript
// Client requests SMS verification
POST /auth/verify/phone/send
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "carrier": "att"  // Optional: AT&T, tmobile, verizon, etc.
}

// Controller: VerificationController.sendSMSVerification()
// Lines 176-257 in verificationController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract user ID and carrier
const userId = request.claims.id;
const { carrier } = request.body;

// Step 2: Get user information
const userResult = await pool.query(
  'SELECT FirstName, Phone, Phone_Verified FROM Account WHERE Account_ID = $1',
  [userId]
);

// Step 3: Check if already verified
if (phone_verified) {
  sendError(response, 400, 'Phone is already verified');
  return;
}

// Step 4: Rate limiting (1 request per minute)
const recentVerification = await pool.query(
  `SELECT COUNT(*) as count
   FROM Phone_Verification
   WHERE Account_ID = $1
   AND Code_Expires > NOW()
   AND Created_At > NOW() - INTERVAL '1 minute'`,
  [userId]
);

if (count > 0) {
  sendError(response, 429, 'Please wait before requesting another SMS code');
  return;
}

// Step 5: Delete old verification codes
await pool.query(
  'DELETE FROM Phone_Verification WHERE Account_ID = $1',
  [userId]
);

// Step 6: Generate 6-digit code
const verificationCode = generateVerificationCode(); // Random 6 digits
const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

// Step 7: Store code in database
await pool.query(
  `INSERT INTO Phone_Verification
   (Account_ID, Phone, Verification_Code, Code_Expires, Attempts)
   VALUES ($1, $2, $3, $4, 0)`,
  [userId, phone, verificationCode, expiresAt]
);

// Step 8: Send SMS via email-to-SMS gateway
const message = `Auth² Code: ${verificationCode}\nExpires in 15 min\nDo not share`;
const smsSent = await sendSMSViaEmail(phone, message, carrier);

// Step 9: Return success response
sendSuccess(response, {
  expiresIn: '15 minutes',
  verificationCode: isDevelopment() ? verificationCode : undefined
}, 'SMS verification code sent successfully');
```

**Database Changes:**
```sql
-- Phone_Verification table
INSERT INTO Phone_Verification (
  Account_ID,              -- User requesting verification
  Phone,                   -- Phone number to verify
  Verification_Code,       -- 6-digit code
  Code_Expires,            -- NOW() + 15 minutes
  Attempts,                -- 0 (no failed attempts yet)
  Verified,                -- FALSE (not yet confirmed)
  Created_At               -- CURRENT_TIMESTAMP
);
```

#### 2.4: Verify SMS Code

**POST /auth/verify/phone/verify** (Protected - requires JWT)

```typescript
// Client submits verification code
POST /auth/verify/phone/verify
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "code": "123456"
}

// Controller: VerificationController.verifySMSCode()
// Lines 262-345 in verificationController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract user ID and code
const userId = request.claims.id;
const { code } = request.body;

// Step 2: Find verification record
const verificationResult = await pool.query(
  `SELECT pv.*, a.Phone_Verified
   FROM Phone_Verification pv
   JOIN Account a ON pv.Account_ID = a.Account_ID
   WHERE pv.Account_ID = $1`,
  [userId]
);

if (verificationResult.rowCount === 0) {
  sendError(response, 400, 'No verification code found');
  return;
}

// Step 3: Check if already verified
if (phone_verified) {
  sendError(response, 400, 'Phone is already verified');
  return;
}

// Step 4: Check code expiration (15 minutes)
if (new Date() > new Date(code_expires)) {
  sendError(response, 400, 'Verification code has expired');
  return;
}

// Step 5: Check attempt limit (max 3 attempts)
if (attempts >= 3) {
  sendError(response, 400, 'Too many failed attempts');
  return;
}

// Step 6: Verify code
if (verification_code !== code) {
  // Increment attempt count
  await pool.query(
    'UPDATE Phone_Verification SET Attempts = Attempts + 1 WHERE Account_ID = $1',
    [userId]
  );

  const remainingAttempts = 3 - (attempts + 1);
  sendError(response, 400,
    `Invalid code. ${remainingAttempts} attempts remaining`);
  return;
}

// Step 7: Transaction - Update account and delete code
await executeTransactionWithResponse(
  async (client) => {
    // Mark phone as verified
    await client.query(
      `UPDATE Account
       SET Phone_Verified = TRUE, Updated_At = NOW()
       WHERE Account_ID = $1`,
      [userId]
    );

    // Delete verification code (single-use)
    await client.query(
      'DELETE FROM Phone_Verification WHERE Account_ID = $1',
      [userId]
    );

    return null;
  },
  response,
  'Phone verified successfully',
  'Failed to verify SMS code'
);
```

**Database Changes:**
```sql
-- Account table
UPDATE Account
SET Phone_Verified = TRUE,
    Updated_At = NOW()
WHERE Account_ID = 123;

-- Phone_Verification table
DELETE FROM Phone_Verification WHERE Account_ID = 123;
```

### Verification Security Features

1. **Rate Limiting**:
   - Email: 1 request per 5 minutes
   - SMS: 1 request per 1 minute
   - Prevents spam and abuse

2. **Expiration Times**:
   - Email token: 48 hours (longer for convenience)
   - SMS code: 15 minutes (shorter for security)

3. **Attempt Limiting**:
   - SMS codes: Maximum 3 attempts
   - Prevents brute-force attacks on 6-digit codes

4. **Single-Use Tokens**:
   - Tokens/codes deleted after successful verification
   - Cannot be reused even if intercepted

5. **Token Cleanup**:
   - Old tokens deleted before issuing new ones
   - Prevents database clutter and confusion

---

## 3. Active Use Phase: Normal Operations

### Overview

Once registered (and optionally verified), users enter the active use phase. This includes logging in, maintaining sessions, and changing passwords. The account status may remain 'pending' or be set to 'active' depending on verification requirements.

### 3.1: User Login

**POST /auth/login** (Public endpoint)

```typescript
// Client sends login credentials
POST /auth/login
Content-Type: application/json

{
  "email": "jane.doe@example.com",
  "password": "SecurePass123!"
}

// Controller: AuthController.login()
// Lines 91-166 in authController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract credentials from request
const { email, password } = request.body;

// Step 2: Find account with credentials (JOIN query)
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
  sendError(response, 401, 'Invalid credentials');
  return;
}

const account = accountResult.rows[0];

// Step 3: Check account status (prevent locked/suspended login)
if (account.account_status === 'suspended') {
  sendError(response, 403, 'Account is suspended. Contact support.');
  return;
}

if (account.account_status === 'locked') {
  sendError(response, 403, 'Account is locked. Contact support.');
  return;
}

// Step 4: Verify password using bcrypt
if (!account.salted_hash || !verifyPassword(password, account.salt, account.salted_hash)) {
  sendError(response, 401, 'Invalid credentials');
  return;
}

// Step 5: Generate JWT access token (14-day expiry)
const jwtSecret = getEnvVar('JWT_SECRET');
const token = jwt.sign(
  {
    id: account.account_id,
    email: account.email,
    role: account.account_role
  },
  jwtSecret,
  { expiresIn: '14d' }
);

// Step 6: Map role number to role name
const roleNames = ['', 'User', 'Moderator', 'Admin', 'SuperAdmin', 'Owner'];
const roleName = roleNames[account.account_role] || 'User';

// Step 7: Return success response with token and user info
sendSuccess(response, {
  accessToken: token,
  user: {
    id: account.account_id,
    email: account.email,
    name: account.firstname,
    lastname: account.lastname,
    username: account.username,
    role: roleName,
    emailVerified: account.email_verified,
    phoneVerified: account.phone_verified,
    accountStatus: account.account_status
  }
}, 'Login successful');
```

**Login Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "jane.doe@example.com",
      "name": "Jane",
      "lastname": "Doe",
      "username": "janedoe",
      "role": "User",
      "emailVerified": true,
      "phoneVerified": false,
      "accountStatus": "pending"
    }
  }
}
```

**Database Access:** Read-only (no changes)

### 3.2: Password Change (Authenticated User)

**POST /auth/user/password/change** (Protected - requires JWT)

```typescript
// Client submits password change
POST /auth/user/password/change
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "oldPassword": "SecurePass123!",
  "newPassword": "NewSecurePass456!"
}

// Controller: AuthController.changePassword()
// Lines 171-231 in authController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract data from request
const { oldPassword, newPassword } = request.body;
const userId = request.claims.id; // From JWT token

// Step 2: Get current credentials
const credentialsResult = await pool.query(
  'SELECT Salted_Hash, Salt FROM Account_Credential WHERE Account_ID = $1',
  [userId]
);

if (credentialsResult.rowCount === 0) {
  sendError(response, 404, 'User credentials not found');
  return;
}

const { salted_hash, salt } = credentialsResult.rows[0];

// Step 3: Verify old password
if (!verifyPassword(oldPassword, salt, salted_hash)) {
  sendError(response, 400, 'Current password is incorrect');
  return;
}

// Step 4: Ensure new password is different
if (verifyPassword(newPassword, salt, salted_hash)) {
  sendError(response, 400, 'New password must be different');
  return;
}

// Step 5: Transaction - Update credentials
await executeTransactionWithResponse(
  async (client) => {
    // Generate new salt and hash
    const newSalt = generateSalt();
    const newSaltedHash = generateHash(newPassword, newSalt);

    // Update password
    await client.query(
      `UPDATE Account_Credential
       SET Salted_Hash = $1, Salt = $2
       WHERE Account_ID = $3`,
      [newSaltedHash, newSalt, userId]
    );

    // Update account timestamp (for audit trail)
    await client.query(
      'UPDATE Account SET Updated_At = NOW() WHERE Account_ID = $1',
      [userId]
    );

    return null;
  },
  response,
  'Password changed successfully',
  'Failed to change password'
);
```

**Database Changes:**
```sql
-- Account_Credential table
UPDATE Account_Credential
SET Salted_Hash = '<new_hash>',
    Salt = '<new_salt>'
WHERE Account_ID = 123;

-- Account table (for audit trail)
UPDATE Account
SET Updated_At = NOW()
WHERE Account_ID = 123;
```

**Security Features:**
1. Requires old password (prevents unauthorized changes if JWT is stolen)
2. New password must be different (prevents immediate reuse)
3. New salt generated (even same password would have different hash)
4. Transaction ensures atomicity (both updates succeed or both fail)

---

## 4. Role Elevation Phase: Permission Management

### Overview

Users start with role=1 (User). Admins can promote users to higher roles for additional privileges. The system enforces a role hierarchy to prevent unauthorized elevation.

### Role Hierarchy

```
┌─────────────────────────────────────────────┐
│          ROLE HIERARCHY PYRAMID             │
└─────────────────────────────────────────────┘

                5: Owner
                   │
                   ▼
            4: SuperAdmin
                   │
                   ▼
              3: Admin
                   │
                   ▼
            2: Moderator
                   │
                   ▼
               1: User
```

| Role Level | Role Name | Capabilities |
|------------|-----------|--------------|
| 5 | Owner | Full system access, can manage all users |
| 4 | SuperAdmin | Extensive admin capabilities |
| 3 | Admin | User management, role changes (up to Admin) |
| 2 | Moderator | Content moderation, limited admin |
| 1 | User | Basic user operations |

### 4.1: Admin Changes User Role

**PUT /admin/users/:id/role** (Admin only - requires role >= 3)

```typescript
// Admin promotes user to Moderator
PUT /admin/users/123/role
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "role": 2  // New role level (Moderator)
}

// Controller: AdminController.changeUserRole()
// Lines 515-572 in adminController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract data from request
const userId = parseInt(request.params.id);
const { role } = request.body;
const newRole = parseInt(role);

// Note: Role hierarchy validation happens in middleware
// Admin (role 3) cannot promote to SuperAdmin (4) or Owner (5)

// Step 2: Get current user details
const currentUserQuery = await pool.query(
  'SELECT * FROM Account WHERE Account_ID = $1',
  [userId]
);

if (currentUserQuery.rowCount === 0) {
  sendError(response, 404, 'User not found');
  return;
}

const currentUser = currentUserQuery.rows[0];
const oldRole = currentUser.account_role;

// Step 3: Update user role
const updateResult = await pool.query(
  `UPDATE Account
   SET Account_Role = $1, Updated_At = NOW()
   WHERE Account_ID = $2
   RETURNING *`,
  [newRole, userId]
);

// Step 4: Return success with before/after comparison
sendSuccess(response, {
  user: {
    id: userId,
    email: updatedUser.email,
    role: RoleName[newRole],
    roleLevel: newRole,
    updatedAt: updatedUser.updated_at
  },
  previousRole: {
    role: RoleName[oldRole],
    roleLevel: oldRole
  }
}, `User role changed from ${RoleName[oldRole]} to ${RoleName[newRole]}`);
```

**Database Changes:**
```sql
-- Account table
UPDATE Account
SET Account_Role = 2,           -- Promoted to Moderator
    Updated_At = NOW()
WHERE Account_ID = 123;
```

**Role Change Response:**
```json
{
  "success": true,
  "message": "User role changed from User to Moderator",
  "data": {
    "user": {
      "id": 123,
      "email": "jane.doe@example.com",
      "role": "Moderator",
      "roleLevel": 2,
      "updatedAt": "2025-10-14T19:30:00.000Z"
    },
    "previousRole": {
      "role": "User",
      "roleLevel": 1
    }
  }
}
```

### 4.2: Admin Creates User with Elevated Role

**POST /admin/users** (Admin only - requires role >= 3)

```typescript
// Admin creates new user with Admin role
POST /admin/users
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "firstname": "John",
  "lastname": "Admin",
  "email": "john.admin@example.com",
  "password": "AdminPass123!",
  "username": "johnadmin",
  "phone": "2065555678",
  "role": 3  // Admin role (requires admin permission)
}

// Controller: AdminController.createUser()
// Lines 19-73 in adminController.ts
```

**Key Differences from User Registration:**
- Role can be specified (not hardcoded to 1)
- Account_Status set to 'active' (not 'pending')
- Still requires uniqueness checks
- Still uses transaction for atomicity

**Database Changes:**
```sql
-- Account table
INSERT INTO Account (
  FirstName, LastName, Username, Email, Phone,
  Account_Role,        -- 3 (Admin) - specified by admin
  Email_Verified,      -- FALSE
  Phone_Verified,      -- FALSE
  Account_Status,      -- 'active' (not 'pending')
  Created_At, Updated_At
) RETURNING Account_ID;

-- Account_Credential table
INSERT INTO Account_Credential (
  Account_ID, Salted_Hash, Salt
);
```

---

## 5. Account Update Phase: Profile Management

### Overview

Admins can update account properties including verification status and account status. Regular users cannot update their own account status or role.

### 5.1: Admin Updates User Account

**PUT /admin/users/:id** (Admin only - requires role >= 3)

```typescript
// Admin updates account status and verification flags
PUT /admin/users/123
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "accountStatus": "active",
  "emailVerified": true,
  "phoneVerified": true
}

// Controller: AdminController.updateUser()
// Lines 333-394 in adminController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract data from request
const userId = parseInt(request.params.id);
const { accountStatus, emailVerified, phoneVerified } = request.body;

// Step 2: Build dynamic update query
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
  sendError(response, 400, 'No valid updates provided');
  return;
}

// Step 3: Add automatic timestamp and user ID
updates.push(`Updated_At = NOW()`);
values.push(userId);

// Step 4: Execute update
const updateQuery = `
  UPDATE Account
  SET ${updates.join(', ')}
  WHERE Account_ID = $${paramCount}
  RETURNING *
`;

const result = await pool.query(updateQuery, values);

// Step 5: Return updated user info
sendSuccess(response, {
  user: {
    id: result.rows[0].account_id,
    accountStatus: result.rows[0].account_status,
    emailVerified: result.rows[0].email_verified,
    phoneVerified: result.rows[0].phone_verified,
    updatedAt: result.rows[0].updated_at
  }
}, 'User updated successfully');
```

**Database Changes:**
```sql
-- Account table (dynamic update based on request)
UPDATE Account
SET Account_Status = 'active',
    Email_Verified = TRUE,
    Phone_Verified = TRUE,
    Updated_At = NOW()
WHERE Account_ID = 123;
```

**Typical Update Scenarios:**

1. **Manual Verification**: Admin verifies email/phone without token
2. **Account Activation**: Change status from 'pending' to 'active'
3. **Account Suspension**: Change status to 'suspended' (temporary ban)
4. **Account Locking**: Change status to 'locked' (security measure)

---

## 6. Password Reset Flow: Account Recovery

### Overview

When users forget their password, they can request a password reset via email. This creates a time-limited token that allows password change without knowing the old password.

### Password Reset Sequence Diagram

```
┌──────┐              ┌──────────┐              ┌──────────┐
│ User │              │  Server  │              │  Email   │
└──┬───┘              └────┬─────┘              └────┬─────┘
   │                       │                         │
   │ 1. POST /reset-request│                         │
   │──────────────────────>│                         │
   │    {email}            │                         │
   │                       │                         │
   │                       │ 2. Generate token       │
   │                       │    (1 hour expiry)      │
   │                       │─┐                       │
   │                       │ │                       │
   │                       │<┘                       │
   │                       │                         │
   │                       │ 3. Send reset email     │
   │                       │────────────────────────>│
   │                       │                         │
   │                       │                         │ 4. User receives email
   │                       │                         │    with reset link
   │                       │                         │
   │ 5. Click link         │                         │
   │    (token in URL)     │                         │
   │                       │                         │
   │ 6. POST /reset        │                         │
   │──────────────────────>│                         │
   │    {token, password}  │                         │
   │                       │                         │
   │                       │ 7. Verify token         │
   │                       │    Update password      │
   │                       │─┐                       │
   │                       │ │                       │
   │                       │<┘                       │
   │                       │                         │
   │<──────────────────────│                         │
   │ 8. Password reset     │                         │
   │    successful         │                         │
   │                       │                         │
```

### 6.1: Request Password Reset

**POST /auth/password/reset-request** (Public endpoint)

```typescript
// User requests password reset
POST /auth/password/reset-request
Content-Type: application/json

{
  "email": "jane.doe@example.com"
}

// Controller: AuthController.requestPasswordReset()
// Lines 236-278 in authController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract email from request
const { email } = request.body;

// Step 2: Find account with verified email
const accountResult = await pool.query(
  'SELECT Account_ID, FirstName, Email_Verified FROM Account WHERE Email = $1',
  [email]
);

// Step 3: Security: Always return success (prevent email enumeration)
// Don't reveal whether email exists or is verified
if (accountResult.rowCount === 0 || !accountResult.rows[0].email_verified) {
  sendSuccess(response, null,
    'If the email exists and is verified, a reset link will be sent.');
  return;
}

const { account_id, firstname } = accountResult.rows[0];

// Step 4: Generate password reset token (1 hour expiry)
const resetToken = generatePasswordResetToken(account_id, email);
// This creates JWT with:
// - payload: { id, email, type: 'password_reset' }
// - expiry: 1 hour
// - signed with JWT_SECRET

// Step 5: Create reset URL
const baseUrl = getEnvVar('APP_BASE_URL', 'http://localhost:8000');
const resetUrl = `${baseUrl}/auth/password/reset?token=${resetToken}`;

// Step 6: Send password reset email
const emailSent = await sendPasswordResetEmail(email, firstname, resetUrl);

if (!emailSent && !isDevelopment()) {
  sendError(response, 500, 'Failed to send reset email');
  return;
}

// Step 7: Return success (with URL in development mode)
const responseData = isDevelopment() ? { resetUrl } : null;
sendSuccess(response, responseData,
  'If the email exists and is verified, a reset link will be sent.');
```

**Security Features:**
1. **Email Enumeration Prevention**: Always returns success message
2. **Verified Email Required**: Only works with verified email addresses
3. **Short Token Expiry**: 1 hour (compared to 48 hours for verification)
4. **JWT-based Token**: Cryptographically signed, cannot be forged

**Database Access:** Read-only (no records created)

### 6.2: Reset Password with Token

**POST /auth/password/reset** (Public endpoint)

```typescript
// User submits new password with token
POST /auth/password/reset
Content-Type: application/json

{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "NewSecurePass789!"
}

// Controller: AuthController.resetPassword()
// Lines 283-353 in authController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract token and new password
const { token, password } = request.body;

// Step 2: Verify and decode JWT reset token
let decoded: any;
try {
  decoded = jwt.verify(token, getEnvVar('JWT_SECRET'));
} catch (error) {
  sendError(response, 400, 'Invalid or expired reset token');
  return;
}

// Step 3: Validate token type
if (decoded.type !== 'password_reset') {
  sendError(response, 400, 'Invalid reset token');
  return;
}

const userId = decoded.id;

// Step 4: Verify account still exists
const accountCheck = await pool.query(
  'SELECT Account_ID FROM Account WHERE Account_ID = $1',
  [userId]
);

if (accountCheck.rowCount === 0) {
  sendError(response, 404, 'Account not found');
  return;
}

// Step 5: Transaction - Update password
await executeTransactionWithResponse(
  async (client) => {
    // Generate new salt and hash
    const salt = generateSalt();
    const saltedHash = generateHash(password, salt);

    // Update password (or create if doesn't exist)
    const updateResult = await client.query(
      `UPDATE Account_Credential
       SET Salted_Hash = $1, Salt = $2
       WHERE Account_ID = $3`,
      [saltedHash, salt, userId]
    );

    if (updateResult.rowCount === 0) {
      // If no credentials exist, create them
      await client.query(
        `INSERT INTO Account_Credential
         (Account_ID, Salted_Hash, Salt)
         VALUES ($1, $2, $3)`,
        [userId, saltedHash, salt]
      );
    }

    // Update account timestamp
    await client.query(
      'UPDATE Account SET Updated_At = NOW() WHERE Account_ID = $1',
      [userId]
    );

    return null;
  },
  response,
  'Password reset successful',
  'Failed to reset password'
);
```

**Database Changes:**
```sql
-- Account_Credential table
UPDATE Account_Credential
SET Salted_Hash = '<new_hash>',
    Salt = '<new_salt>'
WHERE Account_ID = 123;

-- OR if credentials don't exist (edge case)
INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt)
VALUES (123, '<new_hash>', '<new_salt>');

-- Account table (audit trail)
UPDATE Account
SET Updated_At = NOW()
WHERE Account_ID = 123;
```

### 6.3: Admin Resets User Password

**PUT /admin/users/:id/password** (Admin only - requires role >= 3)

```typescript
// Admin resets user password (no token required)
PUT /admin/users/123/password
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "password": "NewAdminResetPass123!"
}

// Controller: AdminController.resetUserPassword()
// Lines 456-510 in adminController.ts
```

**Key Differences from User Reset:**
- No token required (admin privilege)
- No old password verification
- Admin can reset any user's password
- Same transaction pattern for updating credentials

---

## 7. Account Deletion Phase: End of Life

### Overview

Accounts can be soft-deleted (status set to 'deleted') by admins. Soft deletion preserves data for audit purposes while preventing login. Hard deletion (actual database removal) is not implemented by default due to cascade considerations.

### 7.1: Soft Delete (Admin Operation)

**DELETE /admin/users/:id** (Admin only - requires role >= 3)

```typescript
// Admin soft-deletes user account
DELETE /admin/users/123
Authorization: Bearer <admin_jwt_token>

// Controller: AdminController.deleteUser()
// Lines 399-423 in adminController.ts
```

**Step-by-Step Process:**

```typescript
// Step 1: Extract user ID from URL parameter
const userId = parseInt(request.params.id);

// Step 2: Soft delete by updating status
const result = await pool.query(
  `UPDATE Account
   SET Account_Status = 'deleted', Updated_At = NOW()
   WHERE Account_ID = $1 AND Account_Status != 'deleted'
   RETURNING Account_ID`,
  [userId]
);

// Step 3: Check if user was found and deleted
if (result.rowCount === 0) {
  sendError(response, 404, 'User not found or already deleted');
  return;
}

// Step 4: Return success
sendSuccess(response, null, 'User deleted successfully');
```

**Database Changes:**
```sql
-- Account table (soft delete)
UPDATE Account
SET Account_Status = 'deleted',
    Updated_At = NOW()
WHERE Account_ID = 123
  AND Account_Status != 'deleted';
```

**What Happens After Soft Delete:**

✅ **Preserved:**
- Account record remains in database
- Account credentials remain intact
- Verification records remain (if any)
- User ID remains valid for foreign key references
- Audit trail is maintained

❌ **Prevented:**
- User cannot login (status check during login)
- User cannot request password reset
- User cannot be found in active user lists (typically filtered)
- Account appears "deleted" to admins

### Account Suspension vs Deletion

| Operation | Status | Reversible | Data Preserved | Login Blocked |
|-----------|--------|------------|----------------|---------------|
| **Suspend** | 'suspended' | Yes (admin updates status) | Yes | Yes |
| **Lock** | 'locked' | Yes (admin updates status) | Yes | Yes |
| **Soft Delete** | 'deleted' | Yes (admin updates status) | Yes | Yes |
| **Hard Delete** | (removed) | No | No | N/A |

### Hard Delete Considerations

Hard deletion (actual database removal) is not implemented by default because:

1. **Cascade Constraints**: ON DELETE CASCADE removes related records
   - Account_Credential records deleted automatically
   - Email_Verification records deleted automatically
   - Phone_Verification records deleted automatically

2. **Foreign Key Issues**: If other tables reference Account_ID
   - Messages, posts, comments might reference user
   - Hard delete would cascade and remove content
   - OR hard delete would fail due to foreign key constraints

3. **Audit Requirements**: Many systems require retention
   - Legal requirements for data retention
   - Audit trails for security investigations
   - Compliance with regulations (GDPR allows deletion but requires records)

**Hard Delete Implementation (if needed):**
```sql
-- This will CASCADE delete all related records
DELETE FROM Account WHERE Account_ID = 123;

-- Cascades to:
-- - Account_Credential (via FK ON DELETE CASCADE)
-- - Email_Verification (via FK ON DELETE CASCADE)
-- - Phone_Verification (via FK ON DELETE CASCADE)
```

---

## Account Status State Diagram

### State Transition Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                    ACCOUNT STATUS STATES                        │
└─────────────────────────────────────────────────────────────────┘

                    [User Registers]
                           │
                           ▼
                    ┌─────────────┐
         ┌──────────│   PENDING   │◀─────────────┐
         │          │ (awaiting   │              │
         │          │verification)│              │
         │          └─────────────┘              │
         │                 │                     │
         │                 │ [Verification      │
         │                 │  Complete OR       │
         │                 │  Admin Activates]  │
         │                 ▼                     │
         │          ┌─────────────┐              │
         │    ┌─────│   ACTIVE    │─────┐        │
         │    │     │  (normal    │     │        │
         │    │     │  operations)│     │        │
         │    │     └─────────────┘     │        │
         │    │            │            │        │
         │    │            │            │        │
         │    │            │            │        │
    [Unlock]  │    [Lock/Suspend]  [Delete]     │
         │    │            │            │        │
         │    │            ▼            │        │
         │    │     ┌─────────────┐     │        │
         │    │     │ SUSPENDED   │     │   [Reactivate]
         │    │     │  (temp ban) │     │        │
         │    │     └─────────────┘     │        │
         │    │            │            │        │
         │    │            │            │        │
         │    │    [Security Event]     │        │
         │    │            │            │        │
         │    │            ▼            │        │
         │    │     ┌─────────────┐     │        │
         │    └────▶│   LOCKED    │─────┘        │
         │          │ (security   │              │
         │          │   hold)     │              │
         └─────────▶└─────────────┘              │
                           │                     │
                           │ [Admin Deletes]     │
                           ▼                     │
                    ┌─────────────┐              │
                    │   DELETED   │──────────────┘
                    │(soft delete)│  [Reactivate]
                    └─────────────┘

LEGEND:
──▶  State transition (with trigger condition)
│    Possible state
[X]  Trigger/condition for transition
```

### State Transition Table

| From State | To State | Trigger | Who Can Perform |
|------------|----------|---------|-----------------|
| (none) | pending | User registration | Anyone |
| pending | active | Email/SMS verification complete | User (via verification) |
| pending | active | Admin activation | Admin |
| active | suspended | Admin suspends account | Admin |
| active | locked | Security event (e.g., too many failed logins) | System/Admin |
| active | deleted | Admin deletes account | Admin |
| suspended | active | Admin reactivates | Admin |
| suspended | deleted | Admin deletes suspended account | Admin |
| locked | active | Admin unlocks | Admin |
| locked | deleted | Admin deletes locked account | Admin |
| deleted | active | Admin reactivates (restore) | Admin |

---

## Database Schema & Relationships

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE SCHEMA                            │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────────────┐
│         Account              │  ◀─── Primary table
├──────────────────────────────┤
│ PK: Account_ID (SERIAL)      │
│     FirstName                │
│     LastName                 │
│ UQ: Username                 │
│ UQ: Email                    │
│     Email_Verified (BOOL)    │  ◀─── Verification flags
│ UQ: Phone                    │
│     Phone_Verified (BOOL)    │  ◀─── Verification flags
│     Account_Role (INT)       │  ◀─── 1-5 (User to Owner)
│     Account_Status (VARCHAR) │  ◀─── pending/active/suspended/locked/deleted
│     Created_At               │
│     Updated_At               │
└──────────────────────────────┘
         │ 1
         │
         │ 1:1
         │
         ▼ *
┌──────────────────────────────┐
│    Account_Credential        │  ◀─── Password storage
├──────────────────────────────┤
│ PK: Credential_ID (SERIAL)   │
│ FK: Account_ID               │  ◀─── ON DELETE CASCADE
│     Salted_Hash              │  ◀─── bcrypt hash
│     Salt                     │  ◀─── Random salt
└──────────────────────────────┘

┌──────────────────────────────┐
│     Email_Verification       │  ◀─── Email verification tokens
├──────────────────────────────┤
│ PK: Verification_ID (SERIAL) │
│ FK: Account_ID               │  ◀─── ON DELETE CASCADE
│     Email                    │
│ UQ: Verification_Token       │  ◀─── 64-char unique token
│     Token_Expires (TIMESTAMP)│  ◀─── 48 hours from creation
│     Verified (BOOL)          │
│     Created_At               │
└──────────────────────────────┘
         ▲
         │ 1:*
         │
         │ 1
┌──────────────────────────────┐
│         Account              │
└──────────────────────────────┘
         │ 1
         │
         │ 1:*
         │
         ▼ *
┌──────────────────────────────┐
│     Phone_Verification       │  ◀─── SMS verification codes
├──────────────────────────────┤
│ PK: Verification_ID (SERIAL) │
│ FK: Account_ID               │  ◀─── ON DELETE CASCADE
│     Phone                    │
│     Verification_Code (6)    │  ◀─── 6-digit code
│     Code_Expires (TIMESTAMP) │  ◀─── 15 minutes from creation
│     Attempts (INT)           │  ◀─── Failed verification attempts
│     Verified (BOOL)          │
│     Created_At               │
└──────────────────────────────┘
```

### Table Details

#### Account Table
**Primary table for user accounts**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Account_ID | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| FirstName | VARCHAR(255) | NOT NULL | User's first name |
| LastName | VARCHAR(255) | NOT NULL | User's last name |
| Username | VARCHAR(255) | UNIQUE, NOT NULL | Unique username |
| Email | VARCHAR(255) | UNIQUE, NOT NULL | Unique email address |
| Email_Verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| Phone | VARCHAR(15) | UNIQUE, NOT NULL | Unique phone number |
| Phone_Verified | BOOLEAN | DEFAULT FALSE | Phone verification status |
| Account_Role | INT | NOT NULL | Role level (1-5) |
| Account_Status | VARCHAR(20) | DEFAULT 'pending' | Account status |
| Created_At | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| Updated_At | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes:**
- `idx_account_email` ON (Email)
- `idx_account_phone` ON (Phone)
- `idx_account_username` ON (Username)
- `idx_account_status` ON (Account_Status)

#### Account_Credential Table
**Stores password hashes**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Credential_ID | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| Account_ID | INT | FK → Account, NOT NULL | Account reference |
| Salted_Hash | VARCHAR(255) | NOT NULL | bcrypt password hash |
| Salt | VARCHAR(255) | - | Salt used for hashing |

**Foreign Key:** ON DELETE CASCADE (credential deleted when account deleted)

#### Email_Verification Table
**Stores email verification tokens**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Verification_ID | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| Account_ID | INT | FK → Account, NOT NULL | Account reference |
| Email | VARCHAR(255) | NOT NULL | Email to verify |
| Verification_Token | VARCHAR(64) | UNIQUE, NOT NULL | Random token for URL |
| Token_Expires | TIMESTAMPTZ | NOT NULL | Expiration (48 hours) |
| Verified | BOOLEAN | DEFAULT FALSE | Verification status |
| Created_At | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_email_verification_account` ON (Account_ID)
- `idx_email_verification_token` ON (Verification_Token)
- `idx_email_verification_expires` ON (Token_Expires)

**Foreign Key:** ON DELETE CASCADE

#### Phone_Verification Table
**Stores SMS verification codes**

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| Verification_ID | SERIAL | PRIMARY KEY | Auto-incrementing ID |
| Account_ID | INT | FK → Account, NOT NULL | Account reference |
| Phone | VARCHAR(15) | NOT NULL | Phone to verify |
| Verification_Code | VARCHAR(6) | NOT NULL | 6-digit code |
| Code_Expires | TIMESTAMPTZ | NOT NULL | Expiration (15 minutes) |
| Attempts | INT | DEFAULT 0 | Failed attempt counter |
| Verified | BOOLEAN | DEFAULT FALSE | Verification status |
| Created_At | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |

**Indexes:**
- `idx_phone_verification_account` ON (Account_ID)
- `idx_phone_verification_code` ON (Verification_Code)
- `idx_phone_verification_expires` ON (Code_Expires)

**Foreign Key:** ON DELETE CASCADE

---

## Typical User Journey Timelines

### Timeline 1: Standard User Journey (Happy Path)

```
Day 1 - Morning (9:00 AM):
  ➤ User visits registration page
  ➤ POST /auth/register
    - Creates Account with status='pending', role=1
    - Creates Account_Credential with hashed password
    - Returns JWT token
  ➤ Account state: pending, Email_Verified=false, Phone_Verified=false

Day 1 - Morning (9:05 AM):
  ➤ User requests email verification
  ➤ POST /auth/verify/email/send (authenticated)
    - Generates 64-char token
    - Inserts Email_Verification record (expires in 48 hours)
    - Sends email with verification link

Day 1 - Morning (9:10 AM):
  ➤ User clicks email verification link
  ➤ GET /auth/verify/email/confirm?token=abc...
    - Validates token (not expired, exists)
    - Updates Account: Email_Verified=true
    - Deletes Email_Verification record (single-use)
  ➤ Account state: pending, Email_Verified=true, Phone_Verified=false

Day 1 - Afternoon (2:00 PM):
  ➤ User requests SMS verification
  ➤ POST /auth/verify/phone/send (authenticated)
    - Generates 6-digit code
    - Inserts Phone_Verification record (expires in 15 minutes)
    - Sends SMS via email-to-SMS gateway

Day 1 - Afternoon (2:03 PM):
  ➤ User submits verification code
  ➤ POST /auth/verify/phone/verify (authenticated)
    - Validates code (correct, not expired, attempts < 3)
    - Updates Account: Phone_Verified=true
    - Deletes Phone_Verification record (single-use)
  ➤ Account state: pending, Email_Verified=true, Phone_Verified=true

Day 2:
  ➤ Admin reviews new accounts
  ➤ PUT /admin/users/123
    - Updates Account_Status='active'
  ➤ Account state: active, Email_Verified=true, Phone_Verified=true
  ➤ User is now fully activated!

Day 30:
  ➤ User logs in regularly
  ➤ POST /auth/login
    - Validates credentials
    - Checks Account_Status != suspended/locked/deleted
    - Returns new JWT token
  ➤ User operates normally with active account
```

### Timeline 2: Password Reset Journey

```
Day 45 - User Forgets Password:
  ➤ User requests password reset
  ➤ POST /auth/password/reset-request
    - Validates email exists and is verified
    - Generates JWT reset token (expires in 1 hour)
    - Sends password reset email
  ➤ Database: No changes (token embedded in URL)

Day 45 - 15 Minutes Later:
  ➤ User clicks password reset link
  ➤ POST /auth/password/reset
    - Validates JWT token (not expired, type='password_reset')
    - Generates new salt and hash
    - Updates Account_Credential with new password
    - Updates Account.Updated_At timestamp
  ➤ Password successfully reset!

Day 45 - 5 Minutes Later:
  ➤ User logs in with new password
  ➤ POST /auth/login
    - Validates new credentials
    - Returns JWT token
  ➤ User regains access to account
```

### Timeline 3: Admin Intervention Journey

```
Day 60 - Security Incident:
  ➤ Admin detects suspicious activity
  ➤ PUT /admin/users/123
    - Updates Account_Status='suspended'
  ➤ Account state: suspended (login blocked)

Day 60 - 30 Minutes Later:
  ➤ User attempts to login
  ➤ POST /auth/login
    - Credentials valid BUT status check fails
    - Returns 403: "Account is suspended. Contact support."
  ➤ Login prevented

Day 65 - Investigation Complete:
  ➤ Admin clears user and reactivates
  ➤ PUT /admin/users/123
    - Updates Account_Status='active'
  ➤ Account state: active (login restored)

Day 65 - User Logs In:
  ➤ POST /auth/login
    - Status check passes
    - Login successful
  ➤ User back to normal operations
```

### Timeline 4: Role Elevation Journey

```
Day 90 - Active User Contributor:
  ➤ User has been helpful in community
  ➤ Account state: role=1 (User)

Day 90 - Admin Promotes:
  ➤ Admin promotes to Moderator
  ➤ PUT /admin/users/123/role
    - Updates Account_Role=2
  ➤ Account state: role=2 (Moderator)
  ➤ Response includes before/after role comparison

Day 91 - User Logs In:
  ➤ POST /auth/login
    - JWT includes role=2 in claims
    - User sees moderator capabilities in UI
  ➤ User can now access moderator features

Day 180 - Exceptional Performance:
  ➤ Superadmin promotes to Admin
  ➤ PUT /admin/users/123/role
    - Updates Account_Role=3
  ➤ Account state: role=3 (Admin)
  ➤ User now has admin capabilities
```

### Timeline 5: Account Deletion Journey

```
Day 365 - User Requests Account Closure:
  ➤ User contacts support

Day 365 - Admin Soft Deletes:
  ➤ DELETE /admin/users/123
    - Updates Account_Status='deleted'
  ➤ Account state: deleted (login blocked)
  ➤ Data preserved: Account, Account_Credential remain in database

Day 365 - 10 Minutes Later:
  ➤ User attempts to login
  ➤ POST /auth/login
    - Account found BUT status check fails
    - Returns 403: "Account is suspended. Contact support."
      (Note: Deleted accounts treated like suspended for security)
  ➤ Login prevented

Day 400 - User Changes Mind:
  ➤ User contacts support to restore account

Day 400 - Admin Reactivates:
  ➤ PUT /admin/users/123
    - Updates Account_Status='active'
  ➤ Account state: active
  ➤ All data intact: Credentials, verification status, role preserved
  ➤ User can login immediately!
```

---

## Security Considerations by Phase

### 1. Registration Phase Security

**Threats:**
- Automated bot registrations
- Mass account creation
- Email/username enumeration
- Weak password acceptance

**Mitigations:**
✅ Password strength validation (min 8 chars, mixed case, numbers)
✅ Unique constraints prevent duplicates (email, username, phone)
✅ bcrypt hashing with salt for password storage
✅ Transaction ensures atomicity (no orphaned accounts)
✅ Initial role hardcoded to 1 (prevents privilege escalation)

**Best Practices:**
```typescript
// Always validate before insertion
const userExists = await validateUserUniqueness({ email, username, phone });

// Always hash passwords
const salt = generateSalt();
const saltedHash = generateHash(password, salt);

// Always use transactions for multi-table operations
await executeTransactionWithResponse(async (client) => {
  // Create account and credentials atomically
});
```

### 2. Verification Phase Security

**Threats:**
- Token/code guessing attacks
- Token reuse after verification
- Expired token acceptance
- Rate limit bypass (spam)

**Mitigations:**
✅ Email tokens: 64 random characters (2^256 possibilities)
✅ SMS codes: 6 digits with 3 attempt limit (prevents brute force)
✅ Expiration enforcement (48 hours email, 15 minutes SMS)
✅ Single-use tokens (deleted after verification)
✅ Rate limiting (5 min email, 1 min SMS)

**Best Practices:**
```typescript
// Always check expiration
if (new Date() > new Date(token_expires)) {
  sendError(response, 400, 'Token expired');
  return;
}

// Always delete after use (single-use)
await client.query('DELETE FROM Email_Verification WHERE Account_ID = $1');

// Always enforce attempt limits
if (attempts >= 3) {
  sendError(response, 400, 'Too many attempts');
  return;
}
```

### 3. Login Phase Security

**Threats:**
- Credential stuffing attacks
- Brute force password guessing
- Session hijacking
- Account status bypass

**Mitigations:**
✅ bcrypt verification (computationally expensive, slows attacks)
✅ Account status checks (suspended/locked/deleted cannot login)
✅ Generic error messages (prevent username enumeration)
✅ JWT with 14-day expiry (limits stolen token usefulness)

**Best Practices:**
```typescript
// Always check account status BEFORE password verification
if (account.account_status === 'suspended') {
  sendError(response, 403, 'Account suspended');
  return;
}

// Always use generic error messages
if (!verifyPassword(password, salt, hash)) {
  sendError(response, 401, 'Invalid credentials'); // Don't say "wrong password"
  return;
}

// Always set reasonable token expiry
const token = jwt.sign(payload, secret, { expiresIn: '14d' });
```

### 4. Password Change/Reset Security

**Threats:**
- Unauthorized password changes (stolen JWT)
- Password reset token theft
- Email enumeration via reset
- Password reuse

**Mitigations:**
✅ Change password requires old password (even with valid JWT)
✅ Reset token expires in 1 hour (short window)
✅ Generic success messages (prevent email enumeration)
✅ Verified email required for reset (prevents hijacking)
✅ New password must differ from old password

**Best Practices:**
```typescript
// Change password: Always verify old password
if (!verifyPassword(oldPassword, salt, saltedHash)) {
  sendError(response, 400, 'Current password incorrect');
  return;
}

// Password reset: Always return same message
// (Don't reveal if email exists or is verified)
sendSuccess(response, null,
  'If the email exists and is verified, a reset link will be sent.');

// Always enforce short expiry for reset tokens
const resetToken = jwt.sign(payload, secret, { expiresIn: '1h' });
```

### 5. Admin Operations Security

**Threats:**
- Unauthorized admin access
- Privilege escalation
- Mass account manipulation
- Audit trail bypass

**Mitigations:**
✅ Role-based access control (middleware checks role >= 3)
✅ Role hierarchy enforcement (admin cannot promote to superadmin)
✅ Audit timestamps (Updated_At on all changes)
✅ Soft delete preserves audit trail

**Best Practices:**
```typescript
// Always verify admin role in middleware
if (request.claims.role < UserRole.ADMIN) {
  sendError(response, 403, 'Admin access required');
  return;
}

// Always enforce role hierarchy
if (newRole >= request.claims.role) {
  sendError(response, 403, 'Cannot promote to equal/higher role');
  return;
}

// Always update timestamps for audit
await client.query(
  'UPDATE Account SET ... , Updated_At = NOW() WHERE Account_ID = $1'
);
```

---

## Admin Operations & Permissions

### Admin Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│              ADMIN PERMISSION HIERARCHY                         │
└─────────────────────────────────────────────────────────────────┘

Role 5: Owner
  ├─ All SuperAdmin permissions
  ├─ System configuration
  ├─ Manage SuperAdmins
  └─ Delete Admins/SuperAdmins

Role 4: SuperAdmin
  ├─ All Admin permissions
  ├─ Manage Admins
  ├─ Advanced system operations
  └─ Promote users to Admin

Role 3: Admin
  ├─ Create/Read/Update/Delete users
  ├─ Change user roles (up to Moderator)
  ├─ Reset user passwords
  ├─ View dashboard statistics
  ├─ Suspend/Lock/Delete accounts
  └─ Promote users to Moderator

Role 2: Moderator
  ├─ View user lists
  ├─ Search users
  └─ Limited content moderation (not shown in code)

Role 1: User
  └─ Standard user operations only
```

### Admin Endpoints Reference

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/admin/users` | POST | Admin (3+) | Create user with any role (up to own level) |
| `/admin/users` | GET | Moderator (2+) | Get all users (paginated, filtered) |
| `/admin/users/search` | GET | Moderator (2+) | Search users by name/email/username |
| `/admin/users/:id` | GET | Moderator (2+) | Get specific user details |
| `/admin/users/:id` | PUT | Admin (3+) | Update user (status, verification flags) |
| `/admin/users/:id` | DELETE | Admin (3+) | Soft delete user |
| `/admin/users/:id/role` | PUT | Admin (3+) | Change user role (hierarchy enforced) |
| `/admin/users/:id/password` | PUT | Admin (3+) | Reset user password |
| `/admin/dashboard/stats` | GET | Admin (3+) | Get dashboard statistics |

### Admin Operation Examples

#### View Dashboard Statistics

```typescript
GET /admin/dashboard/stats
Authorization: Bearer <admin_jwt_token>

// Controller: AdminController.getDashboardStats()

// Response:
{
  "success": true,
  "data": {
    "statistics": {
      "total_users": 1523,
      "active_users": 1401,
      "pending_users": 87,
      "suspended_users": 15,
      "email_verified": 1450,
      "phone_verified": 1123,
      "new_users_week": 42,
      "new_users_month": 156
    }
  }
}
```

#### Search Users

```typescript
GET /admin/users/search?q=john&fields=firstname,lastname,username
Authorization: Bearer <admin_jwt_token>

// Controller: AdminController.searchUsers()

// Response:
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 123,
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "role": "User",
        "accountStatus": "active"
      },
      // ... more matching users
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalUsers": 5,
      "totalPages": 1
    },
    "searchTerm": "john",
    "fieldsSearched": ["firstname", "lastname", "username"]
  }
}
```

#### Get User Details

```typescript
GET /admin/users/123
Authorization: Bearer <admin_jwt_token>

// Controller: AdminController.getUserById()

// Response:
{
  "success": true,
  "data": {
    "user": {
      "id": 123,
      "firstName": "Jane",
      "lastName": "Doe",
      "username": "janedoe",
      "email": "jane.doe@example.com",
      "phone": "2065551234",
      "role": "User",
      "roleLevel": 1,
      "emailVerified": true,
      "phoneVerified": false,
      "accountStatus": "active",
      "createdAt": "2025-09-01T10:00:00.000Z",
      "updatedAt": "2025-10-14T15:30:00.000Z"
    }
  }
}
```

---

## Cascade Delete Considerations

### Foreign Key Cascade Behavior

When an Account is deleted (hard delete), the CASCADE behavior automatically removes related records:

```sql
-- Foreign key definitions with CASCADE

CREATE TABLE Account_Credential (
  ...
  FOREIGN KEY(Account_ID) REFERENCES Account(Account_ID)
    ON DELETE CASCADE
);

CREATE TABLE Email_Verification (
  ...
  FOREIGN KEY(Account_ID) REFERENCES Account(Account_ID)
    ON DELETE CASCADE
);

CREATE TABLE Phone_Verification (
  ...
  FOREIGN KEY(Account_ID) REFERENCES Account(Account_ID)
    ON DELETE CASCADE
);
```

### Cascade Delete Flow

```
DELETE FROM Account WHERE Account_ID = 123;

┌─────────────────────────────────────────────────────────┐
│                  CASCADE DELETE FLOW                    │
└─────────────────────────────────────────────────────────┘

        ┌─────────────────┐
        │  DELETE Account │
        │   (Account_ID=  │
        │       123)      │
        └────────┬────────┘
                 │
     ┌───────────┴───────────┐
     │                       │
     ▼                       ▼
┌──────────────┐    ┌──────────────────┐
│   CASCADE    │    │    CASCADE       │
│   DELETE     │    │    DELETE        │
│Account_      │    │Email_            │
│Credential    │    │Verification      │
│              │    │                  │
│(Account_ID=  │    │(Account_ID=123)  │
│    123)      │    │                  │
└──────────────┘    └──────────────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    CASCADE       │
                    │    DELETE        │
                    │Phone_            │
                    │Verification      │
                    │                  │
                    │(Account_ID=123)  │
                    └──────────────────┘

RESULT:
- Account record removed
- Account_Credential record removed
- Email_Verification records removed (if any)
- Phone_Verification records removed (if any)
```

### Why Soft Delete is Preferred

**Advantages of Soft Delete (Account_Status='deleted'):**

1. **Data Preservation**: All records remain in database
   - Audit trail intact for investigations
   - Historical data available for analytics
   - Can restore account if user changes mind

2. **Foreign Key Safety**: No cascade concerns
   - If other systems reference Account_ID, they still work
   - Messages/posts/comments don't need cascade logic
   - External systems remain consistent

3. **Compliance**: Easier to meet regulatory requirements
   - GDPR allows soft delete with anonymization
   - Financial regulations often require data retention
   - Legal holds preserved

4. **Recovery**: Reactivation is simple
   ```sql
   UPDATE Account SET Account_Status = 'active' WHERE Account_ID = 123;
   ```

**When Hard Delete Makes Sense:**

- GDPR "right to be forgotten" explicit requests
- Legal requirement to purge data
- Database maintenance (remove truly unwanted data)
- User explicitly requests complete removal

**Hard Delete Implementation:**
```sql
-- This removes everything via CASCADE
DELETE FROM Account WHERE Account_ID = 123;

-- Manual cascade (if ON DELETE CASCADE not set)
DELETE FROM Phone_Verification WHERE Account_ID = 123;
DELETE FROM Email_Verification WHERE Account_ID = 123;
DELETE FROM Account_Credential WHERE Account_ID = 123;
DELETE FROM Account WHERE Account_ID = 123;
```

---

## Summary: Account Lifecycle Phases

### Phase Summary Table

| Phase | Entry Point | Exit Point | Database Changes | Security Focus |
|-------|-------------|------------|------------------|----------------|
| **Registration** | POST /auth/register | Account created | Account + Account_Credential | Password hashing, role hardcoding |
| **Verification** | POST /verify/email/send or /phone/send | Email/Phone verified | Verification tables, Account flags | Token security, rate limiting |
| **Active Use** | POST /auth/login | Ongoing usage | None (read-only login) | Status checks, JWT expiry |
| **Role Elevation** | PUT /admin/users/:id/role | Role changed | Account.Account_Role | Role hierarchy, admin permissions |
| **Account Updates** | PUT /admin/users/:id | Status/flags updated | Account fields | Admin authorization |
| **Password Reset** | POST /auth/password/reset-request | Password changed | Account_Credential | Token expiry, email enumeration |
| **Account Deletion** | DELETE /admin/users/:id | Account soft-deleted | Account.Account_Status | Soft vs hard delete, data preservation |

### Key Takeaways for Students

1. **Transactions are Critical**: Multi-table operations must be atomic
   - Registration creates Account + Account_Credential
   - Verification updates Account + deletes verification record
   - Always use `executeTransactionWithResponse()` or `withTransaction()`

2. **Security Layered**: Multiple defenses at each phase
   - Validation middleware before controller logic
   - Status checks during login
   - Role hierarchy in admin operations
   - Rate limiting for verification

3. **State Management**: Account status drives behavior
   - 'pending' → Can login, should verify
   - 'active' → Fully operational
   - 'suspended'/'locked' → Cannot login
   - 'deleted' → Soft deleted, data preserved

4. **Verification is Optional but Recommended**: Users can login before verification
   - Email_Verified and Phone_Verified are flags, not gates
   - Some features may require verification (implementation-specific)
   - Password reset requires verified email (security measure)

5. **Soft Delete Preferred**: Preserve data, maintain integrity
   - Easier to recover from mistakes
   - Maintains audit trail
   - Prevents cascade deletion issues
   - Hard delete only when legally required

6. **Admin Operations are Powerful**: Require careful authorization
   - Role hierarchy prevents privilege escalation
   - All changes update timestamps (audit trail)
   - Admins can override most user operations
   - Dashboard provides oversight

---

## Further Reading

### Related Documentation
- **Node.js Architecture**: `/docs-2.0/node-express-architecture.md` - MVC pattern, middleware, routing
- **Database Fundamentals**: `/docs-2.0/database-fundamentals.md` - Transactions, pooling, ACID
- **Authentication Guide**: `/docs-2.0/authentication-guide.md` - JWT, bcrypt, security patterns
- **Web Security**: `/docs-2.0/web-security-guide.md` - CORS, SQL injection, XSS prevention
- **API Documentation**: `/docs-2.0/API_DOCUMENTATION.md` - Complete endpoint reference

### Source Code References
- **AuthController**: `/src/controllers/authController.ts` - Registration, login, password operations
- **VerificationController**: `/src/controllers/verificationController.ts` - Email/SMS verification
- **AdminController**: `/src/controllers/adminController.ts` - User management, role changes
- **Database Schema**: `/data/init.sql` - Complete table definitions
- **Models**: `/src/core/models/index.ts` - TypeScript interfaces and enums

---

## Related Guides

- **[JWT Implementation Guide](./jwt-implementation-guide.md)** - Login and token generation
- **[RBAC Guide](./rbac-guide.md)** - Role assignments and promotions
- **[Verification Workflows Guide](./verification-workflows-guide.md)** - Account verification phase
- **[Password Security Guide](./password-security-guide.md)** - Password changes and resets
- **[Transaction Patterns Guide](./transaction-patterns-guide.md)** - Atomic account operations

---

**Educational Note**: This guide demonstrates real-world user account management patterns used in production systems. Understanding the complete lifecycle—from registration through deletion—is essential for building secure, maintainable authentication systems. Pay special attention to transaction management, security considerations, and state transitions as these are fundamental concepts that apply across all database-driven applications.
