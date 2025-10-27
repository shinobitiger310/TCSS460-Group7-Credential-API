# TCSS-460-auth-squared API Documentation

**Authentication × Authorization = Auth²**

Complete REST API documentation for the TCSS-460-auth-squared - a comprehensive authentication and authorization system demonstrating modern web API development patterns.

This API showcases:
- JWT-based authentication with Bearer tokens
- Role-based access control (RBAC) with hierarchy enforcement
- Password reset flows with email verification
- Email and phone verification systems
- Admin user management with pagination and search
- Transaction-based database operations
- Comprehensive input validation with express-validator
- Secure password hashing with SHA256 and unique salts
- Rate limiting for verification endpoints

## API Information

- **Version:** 1.0.0
- **Base URL:** http://localhost:8000
- **Documentation:** [Swagger UI](http://localhost:8000/api-docs)
- **Authentication:** JWT Bearer tokens (14-day expiry)

## Authentication Flow

1. **Register** a new account (`POST /auth/register`) - Creates a basic user account (role 1)
2. **Login** with credentials (`POST /auth/login`) - Returns JWT access token
3. Include token in `Authorization: Bearer <token>` header for protected endpoints
4. **Verify** email and phone for full account activation

## Role Hierarchy

The TCSS-460-auth-squared implements a 5-tier role system with strict hierarchy enforcement:

- **1 - User**: Basic access to protected endpoints
- **2 - Moderator**: User management capabilities
- **3 - Admin**: Full user CRUD operations, can create users up to admin level
- **4 - SuperAdmin**: System administration capabilities
- **5 - Owner**: Complete system control

**Hierarchy Rules:**
- Admins can only manage users with equal or lower roles
- Cannot modify users with higher roles than yourself
- Cannot change your own role

## Security Features

- **Password Hashing**: SHA256 with unique per-user salts
- **JWT Tokens**: 14-day expiry with role-based claims
- **Email Verification**: 48-hour verification tokens (single-use)
- **SMS Verification**: 6-digit codes with 15-minute expiry (3 attempts max)
- **Rate Limiting**: Enforced on verification endpoints
- **Account Status**: Suspended and locked accounts are denied access

---

## Public Authentication Endpoints

These endpoints do not require authentication.

### POST /auth/register

Register a new user account with role 1 (User).

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "firstname": "John",
  "lastname": "Doe",
  "email": "john.doe@example.com",
  "username": "johndoe",
  "password": "SecurePass123!",
  "phone": "2065551234"
}
```

**Request Body Parameters:**
- `firstname` (required): First name, 1-100 characters
- `lastname` (required): Last name, 1-100 characters
- `email` (required): Valid email address (must be unique)
- `username` (required): Username, 3-50 characters, alphanumeric with underscore/hyphen only (must be unique)
- `password` (required): Password, 8-128 characters
- `phone` (required): Phone number, minimum 10 digits (must be unique)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "john.doe@example.com",
      "name": "John",
      "lastname": "Doe",
      "username": "johndoe",
      "role": "User",
      "emailVerified": false,
      "phoneVerified": false,
      "accountStatus": "pending"
    }
  }
}
```

**Error Response - Email Already Exists (400 Bad Request):**
```json
{
  "success": false,
  "message": "Email already in use",
  "errorCode": "AUTH002"
}
```

**Error Response - Username Already Exists (400 Bad Request):**
```json
{
  "success": false,
  "message": "Username already in use",
  "errorCode": "AUTH003"
}
```

**Error Response - Validation Failed (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

**Validation Rules:**
- Email must be valid format and unique
- Username must be 3-50 characters, alphanumeric plus underscore/hyphen, and unique
- Password must be 8-128 characters
- Phone must be at least 10 digits and unique
- All fields are required

**Notes:**
- New accounts are created with `pending` status until verified
- Role is automatically set to 1 (User)
- Email and phone verification required for full access

---

### POST /auth/login

Authenticate with email and password to receive a JWT token.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

**Request Body Parameters:**
- `email` (required): Account email address
- `password` (required): Account password

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 123,
      "email": "john.doe@example.com",
      "name": "John",
      "lastname": "Doe",
      "username": "johndoe",
      "role": "User",
      "emailVerified": true,
      "phoneVerified": false,
      "accountStatus": "active"
    }
  }
}
```

**Error Response - Invalid Credentials (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "errorCode": "AUTH001"
}
```

**Error Response - Account Suspended (403 Forbidden):**
```json
{
  "success": false,
  "message": "Account is suspended. Please contact support.",
  "errorCode": "AUTH005"
}
```

**Error Response - Account Locked (403 Forbidden):**
```json
{
  "success": false,
  "message": "Account is locked. Please contact support.",
  "errorCode": "AUTH006"
}
```

**Account Restrictions:**
- Suspended accounts receive 403 error and cannot login
- Locked accounts receive 403 error and cannot login
- Pending/unverified accounts can login but may have limited access

**Notes:**
- Store the `accessToken` for use in subsequent authenticated requests
- Token expires in 14 days
- Include token as `Authorization: Bearer <token>` in request headers

---

### POST /auth/password/reset-request

Request a password reset email. Always returns success message to prevent email enumeration.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "john.doe@example.com"
}
```

**Request Body Parameters:**
- `email` (required): Account email address

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "If the email exists and is verified, a reset link will be sent.",
  "data": null
}
```

**Success Response (Development Mode):**
```json
{
  "success": true,
  "message": "If the email exists and is verified, a reset link will be sent.",
  "data": {
    "resetUrl": "http://localhost:8000/auth/password/reset?token=abc123..."
  }
}
```

**Security Features:**
- Always returns same message regardless of whether email exists
- Only sends reset email if account exists AND email is verified
- Reset tokens expire in 1 hour
- In development mode, includes reset URL in response for testing

**Notes:**
- Check your email for the password reset link
- Reset link is valid for 1 hour only
- Can only be used once

---

### POST /auth/password/reset

Reset password using the token from the reset email.

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "password": "NewSecurePass456!"
}
```

**Request Body Parameters:**
- `token` (required): Reset token from email link
- `password` (required): New password, 8-128 characters

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful",
  "data": null
}
```

**Error Response - Invalid Token (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token",
  "errorCode": "AUTH007"
}
```

**Error Response - Account Not Found (404 Not Found):**
```json
{
  "success": false,
  "message": "Account not found",
  "errorCode": "USER001"
}
```

**Token Requirements:**
- Must be valid JWT token
- Must have type 'password_reset'
- Must not be expired (1 hour limit)
- Can only be used once

**Notes:**
- After successful reset, login with new password
- Old password is immediately invalidated
- Account timestamp is updated

---

### GET /auth/verify/carriers

Get list of supported SMS carriers for phone verification.

**Example Request:**
```bash
GET /auth/verify/carriers HTTP/1.1
Host: localhost:8000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Carriers retrieved successfully",
  "data": {
    "carriers": [
      {
        "id": "att",
        "name": "AT&T",
        "gateway": "@txt.att.net"
      },
      {
        "id": "tmobile",
        "name": "T-Mobile",
        "gateway": "@tmomail.net"
      },
      {
        "id": "verizon",
        "name": "Verizon",
        "gateway": "@vtext.com"
      },
      {
        "id": "sprint",
        "name": "Sprint",
        "gateway": "@messaging.sprintpcs.com"
      },
      {
        "id": "metropcs",
        "name": "Metro PCS",
        "gateway": "@mymetropcs.com"
      },
      {
        "id": "boost",
        "name": "Boost Mobile",
        "gateway": "@smsmyboostmobile.com"
      },
      {
        "id": "cricket",
        "name": "Cricket",
        "gateway": "@sms.cricketwireless.net"
      },
      {
        "id": "uscellular",
        "name": "US Cellular",
        "gateway": "@email.uscc.net"
      }
    ],
    "note": "SMS verification uses email-to-SMS gateways. Results may vary by carrier."
  }
}
```

**Notes:**
- No authentication required
- SMS verification uses email-to-SMS gateways
- Results may vary by carrier
- Use carrier ID when sending SMS verification codes

---

### GET /auth/verify/email/confirm

Verify email address using token from verification email.

**Query Parameters:**
- `token` (required): Verification token from email

**Example Request:**
```bash
GET /auth/verify/email/confirm?token=abc123def456... HTTP/1.1
Host: localhost:8000
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": null
}
```

**Error Response - Invalid Token (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid verification token",
  "errorCode": "VRFY001"
}
```

**Error Response - Already Verified (400 Bad Request):**
```json
{
  "success": false,
  "message": "Email is already verified",
  "errorCode": "VRFY002"
}
```

**Error Response - Token Expired (400 Bad Request):**
```json
{
  "success": false,
  "message": "Verification token has expired",
  "errorCode": "VRFY003"
}
```

**Token Requirements:**
- Must match stored verification token in database
- Must not be expired (48 hour limit)
- Can only be used once (deleted after verification)

**Notes:**
- Typically accessed by clicking link in verification email
- After verification, account status may be updated
- Verification token is deleted after successful use

---

## Protected Authentication Endpoints

These endpoints require a valid JWT token in the Authorization header.

**Authentication Header:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### GET /jwt_test

Test endpoint to validate JWT token.

**Request Headers:**
```
Authorization: Bearer <your-token>
```

**Success Response (200 OK):**
```json
{
  "message": "Hello World! API is working correctly.",
  "timestamp": "2025-10-12T12:00:00.000Z",
  "service": "TCSS-460-auth-squared"
}
```

**Error Response - No Token (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Auth token is not supplied",
  "errorCode": "AUTH009"
}
```

**Error Response - Invalid Token (403 Forbidden):**
```json
{
  "success": false,
  "message": "Token is not valid",
  "errorCode": "AUTH007"
}
```

**Notes:**
- Simple endpoint to test JWT token validity
- Useful for debugging authentication issues
- Returns current timestamp and service name

---

### POST /auth/user/password/change

Change your password (requires old password verification).

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-token>
```

**Request Body:**
```json
{
  "oldPassword": "CurrentPass123!",
  "newPassword": "NewSecurePass456!"
}
```

**Request Body Parameters:**
- `oldPassword` (required): Current password
- `newPassword` (required): New password, 8-128 characters (must be different from old)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully",
  "data": null
}
```

**Error Response - Incorrect Old Password (400 Bad Request):**
```json
{
  "success": false,
  "message": "Current password is incorrect",
  "errorCode": "AUTH001"
}
```

**Error Response - Same Password (400 Bad Request):**
```json
{
  "success": false,
  "message": "New password must be different from current password",
  "errorCode": "VALD005"
}
```

**Error Response - User Not Found (404 Not Found):**
```json
{
  "success": false,
  "message": "User credentials not found",
  "errorCode": "USER001"
}
```

**Requirements:**
- Must provide correct old password
- New password must be different from old password
- New password must meet validation rules (8-128 characters)
- Updates account timestamp

**Notes:**
- Generates new salt and hash for password
- Old password is immediately invalidated
- JWT token remains valid after password change

---

### POST /auth/verify/phone/send

Send SMS verification code to registered phone number.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-token>
```

**Request Body (Optional):**
```json
{
  "carrier": "att"
}
```

**Request Body Parameters:**
- `carrier` (optional): Carrier ID for specific SMS gateway (att, tmobile, verizon, etc.)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "SMS verification code sent successfully",
  "data": {
    "expiresIn": "15 minutes",
    "method": "email-to-sms",
    "availableCarriers": [
      "att", "tmobile", "verizon", "sprint",
      "metropcs", "boost", "cricket", "uscellular"
    ]
  }
}
```

**Success Response (Development Mode):**
```json
{
  "success": true,
  "message": "SMS verification code sent successfully",
  "data": {
    "expiresIn": "15 minutes",
    "method": "email-to-sms",
    "availableCarriers": ["att", "tmobile", "verizon", "sprint", "metropcs", "boost", "cricket", "uscellular"],
    "verificationCode": "123456"
  }
}
```

**Error Response - Already Verified (400 Bad Request):**
```json
{
  "success": false,
  "message": "Phone is already verified",
  "errorCode": "VRFY002"
}
```

**Error Response - Rate Limit (429 Too Many Requests):**
```json
{
  "success": false,
  "message": "Please wait before requesting another SMS code",
  "errorCode": "VRFY006"
}
```

**Features:**
- **Rate Limiting**: 1 request per minute
- **Code Expiry**: 15 minutes
- **Carrier Selection**: Optional carrier parameter for specific gateways
- **Development Mode**: Includes verification code in response for testing

**SMS Format:**
```
Auth² Code: 123456
Expires in 15 min
Do not share
```

**Notes:**
- Uses email-to-SMS gateway system
- Previous verification codes are deleted when new code is sent
- Code is 6 digits
- Maximum 3 verification attempts per code

---

### POST /auth/verify/phone/verify

Verify phone number with 6-digit SMS code.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <your-token>
```

**Request Body:**
```json
{
  "code": "123456"
}
```

**Request Body Parameters:**
- `code` (required): 6-digit verification code from SMS

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Phone verified successfully",
  "data": null
}
```

**Error Response - Invalid Code (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid verification code. 2 attempts remaining.",
  "errorCode": "VRFY004"
}
```

**Error Response - No Code Found (400 Bad Request):**
```json
{
  "success": false,
  "message": "No verification code found. Please request a new code.",
  "errorCode": "VRFY007"
}
```

**Error Response - Code Expired (400 Bad Request):**
```json
{
  "success": false,
  "message": "Verification code has expired",
  "errorCode": "VRFY003"
}
```

**Error Response - Too Many Attempts (400 Bad Request):**
```json
{
  "success": false,
  "message": "Too many failed attempts. Please request a new code.",
  "errorCode": "VRFY005"
}
```

**Error Response - Already Verified (400 Bad Request):**
```json
{
  "success": false,
  "message": "Phone is already verified",
  "errorCode": "VRFY002"
}
```

**Code Requirements:**
- Must be exactly 6 digits
- Must not be expired (15 minute limit)
- Must match most recent code sent
- Maximum 3 attempts per code

**Notes:**
- Failed attempts are tracked and counted
- After 3 failed attempts, must request new code
- Code is deleted after successful verification (single-use)
- Phone verified status is updated in account

---

### POST /auth/verify/email/send

Send email verification link to registered email address.

**Request Headers:**
```
Authorization: Bearer <your-token>
```

**Example Request:**
```bash
POST /auth/verify/email/send HTTP/1.1
Host: localhost:8000
Authorization: Bearer <your-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "expiresIn": "48 hours"
  }
}
```

**Success Response (Development Mode):**
```json
{
  "success": true,
  "message": "Verification email sent successfully",
  "data": {
    "expiresIn": "48 hours",
    "verificationUrl": "http://localhost:8000/auth/verify/email/confirm?token=abc123..."
  }
}
```

**Error Response - Already Verified (400 Bad Request):**
```json
{
  "success": false,
  "message": "Email is already verified",
  "errorCode": "VRFY002"
}
```

**Error Response - Rate Limit (429 Too Many Requests):**
```json
{
  "success": false,
  "message": "Please wait before requesting another verification email",
  "errorCode": "VRFY006"
}
```

**Features:**
- **Rate Limiting**: 1 request per 5 minutes
- **Token Expiry**: 48 hours
- **Development Mode**: Includes verification URL in response for testing

**Notes:**
- Sends email with verification link to registered email
- Previous verification tokens are deleted when new email is sent
- Token can only be used once
- Click link in email to verify: `/auth/verify/email/confirm?token=...`

---

## Admin Endpoints

These endpoints require admin role (level 3 or higher) and a valid JWT token.

**Authentication Header:**
```
Authorization: Bearer <admin-token>
```

### POST /admin/users/create

Create a new user with specified role (admin only).

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin-token>
```

**Request Body:**
```json
{
  "firstname": "Jane",
  "lastname": "Smith",
  "email": "jane.smith@example.com",
  "username": "janesmith",
  "password": "SecurePass123!",
  "phone": "2065559999",
  "role": 2
}
```

**Request Body Parameters:**
- `firstname` (required): First name, 1-100 characters
- `lastname` (required): Last name, 1-100 characters
- `email` (required): Valid email address (must be unique)
- `username` (required): Username, 3-50 characters (must be unique)
- `password` (required): Password, 8-128 characters
- `phone` (required): Phone number, minimum 10 digits (must be unique)
- `role` (required): Role level 1-5 (must be equal or lower than your role)

**Success Response (201 Created):**
```json
{
  "success": true,
  "message": "User created successfully by admin",
  "data": {
    "user": {
      "id": 456,
      "email": "jane.smith@example.com",
      "name": "Jane",
      "lastname": "Smith",
      "username": "janesmith",
      "role": "Moderator",
      "roleLevel": 2,
      "emailVerified": false,
      "phoneVerified": false,
      "accountStatus": "active"
    }
  }
}
```

**Error Response - Insufficient Permissions (403 Forbidden):**
```json
{
  "success": false,
  "message": "Cannot create user with higher role than your own",
  "errorCode": "AUTH009"
}
```

**Role Restrictions:**
- Can only create users with equal or lower role than yourself
- Admin (3) can create roles 1-3
- SuperAdmin (4) can create roles 1-4
- Owner (5) can create roles 1-5

**Account Status:**
- Admin-created accounts start with `active` status (not `pending`)
- Email and phone verification are still required for full functionality

**Notes:**
- All standard registration validation rules apply
- Created user receives same password hashing as regular registration
- No JWT token is returned (user must login separately)

---

### GET /admin/users

Get paginated list of all users with optional filtering.

**Request Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 20, max 100
- `status` (optional): Filter by account status (active, pending, suspended, locked, deleted)
- `role` (optional): Filter by role level (1-5)

**Example Requests:**
```bash
GET /admin/users HTTP/1.1
GET /admin/users?page=2&limit=50
GET /admin/users?status=active
GET /admin/users?role=3
GET /admin/users?status=active&role=3
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Retrieved 150 users",
  "data": {
    "users": [
      {
        "id": 123,
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "phone": "2065551234",
        "role": "User",
        "roleLevel": 1,
        "emailVerified": true,
        "phoneVerified": false,
        "accountStatus": "active",
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalUsers": 150,
      "totalPages": 8
    },
    "filters": null
  }
}
```

**Success Response with Filters:**
```json
{
  "success": true,
  "message": "Retrieved 5 users with filters applied",
  "data": {
    "users": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalUsers": 5,
      "totalPages": 1
    },
    "filters": {
      "status": "active",
      "role": {
        "level": 3,
        "name": "Admin"
      }
    }
  }
}
```

**Filtering Options:**
- **Status Filter**: `?status=active` - Filter by account status
  - Values: active, pending, suspended, locked, deleted
- **Role Filter**: `?role=3` - Filter by role level
  - Values: 1 (User), 2 (Moderator), 3 (Admin), 4 (SuperAdmin), 5 (Owner)
- **Combined Filters**: `?status=active&role=3` - Both filters use AND logic

**Pagination:**
- Default page size: 20 users
- Maximum page size: 100 users
- Results are ordered by creation date (newest first)

**Notes:**
- Returns empty array if no users match criteria
- Filters object is `null` if no filters applied
- Filters object shows applied filters with role name mapping

---

### GET /admin/users/search

Search users by name, email, or username.

**Request Headers:**
```
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `q` (required): Search term, 1-100 characters
- `fields` (optional): Comma-separated fields to search (firstname, lastname, username, email)
- `page` (optional): Page number, default 1
- `limit` (optional): Items per page, default 20, max 100

**Example Requests:**
```bash
GET /admin/users/search?q=john
GET /admin/users/search?q=john&fields=email,username
GET /admin/users/search?q=doe&fields=lastname&page=2&limit=50
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Found 5 users matching \"john\"",
  "data": {
    "users": [
      {
        "id": 123,
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "email": "john.doe@example.com",
        "phone": "2065551234",
        "role": "User",
        "roleLevel": 1,
        "emailVerified": true,
        "phoneVerified": false,
        "accountStatus": "active",
        "createdAt": "2025-01-15T10:30:00Z",
        "updatedAt": "2025-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalUsers": 5,
      "totalPages": 1
    },
    "searchTerm": "john",
    "fieldsSearched": ["firstname", "lastname", "email", "username"]
  }
}
```

**Error Response - Missing Query (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "q",
      "message": "Search term is required"
    }
  ]
}
```

**Search Features:**
- **Multi-field search**: Searches across multiple fields simultaneously
- **Case-insensitive**: Uses ILIKE for case-insensitive partial matching
- **Field filtering**: Optional `fields` parameter to search specific fields only
- **Pagination**: Same pagination as user list endpoint

**Searchable Fields:**
- `firstname` - First name
- `lastname` - Last name
- `username` - Username
- `email` - Email address

**Default Behavior:**
- If no `fields` specified, searches all 4 fields
- Returns users matching search term in ANY of the specified fields (OR logic)

**Notes:**
- Search term matches partial strings (e.g., "john" matches "Johnny", "johnson")
- Results ordered by creation date (newest first)
- Returns empty array if no matches found

---

### GET /admin/users/stats/dashboard

Get aggregate statistics about users for admin dashboard.

**Request Headers:**
```
Authorization: Bearer <admin-token>
```

**Example Request:**
```bash
GET /admin/users/stats/dashboard HTTP/1.1
Host: localhost:8000
Authorization: Bearer <admin-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Dashboard statistics retrieved",
  "data": {
    "statistics": {
      "total_users": "150",
      "active_users": "120",
      "pending_users": "20",
      "suspended_users": "5",
      "email_verified": "100",
      "phone_verified": "80",
      "new_users_week": "10",
      "new_users_month": "35"
    }
  }
}
```

**Statistics Breakdown:**
- `total_users`: Total number of users in system
- `active_users`: Users with active account status
- `pending_users`: Users with pending account status (unverified)
- `suspended_users`: Users with suspended account status
- `email_verified`: Users with verified email addresses
- `phone_verified`: Users with verified phone numbers
- `new_users_week`: Users created in last 7 days
- `new_users_month`: Users created in last 30 days

**Notes:**
- All counts are real-time from database
- Useful for admin dashboard visualizations
- Does not include deleted users in most counts
- No pagination needed (returns aggregate counts)

---

### GET /admin/users/:id

Get detailed information about a specific user.

**Request Headers:**
```
Authorization: Bearer <admin-token>
```

**Path Parameters:**
- `id` (required): User ID (integer)

**Example Request:**
```bash
GET /admin/users/123 HTTP/1.1
Host: localhost:8000
Authorization: Bearer <admin-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User details retrieved successfully",
  "data": {
    "user": {
      "id": 123,
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "phone": "2065551234",
      "role": "User",
      "roleLevel": 1,
      "emailVerified": true,
      "phoneVerified": false,
      "accountStatus": "active",
      "createdAt": "2025-01-15T10:30:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  }
}
```

**Error Response - Invalid ID (400 Bad Request):**
```json
{
  "success": false,
  "message": "Invalid user ID",
  "errorCode": "VALD001"
}
```

**Error Response - User Not Found (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "errorCode": "USER001"
}
```

**Notes:**
- User ID must be a valid integer
- Returns full user details including timestamps
- Does not return password or sensitive credential information

---

### PUT /admin/users/:id

Update user account details (admin only).

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin-token>
```

**Path Parameters:**
- `id` (required): User ID (integer)

**Request Body:**
```json
{
  "accountStatus": "suspended",
  "emailVerified": true,
  "phoneVerified": true
}
```

**Request Body Parameters (all optional, at least one required):**
- `accountStatus`: Account status (active, pending, suspended, locked)
- `emailVerified`: Email verification status (boolean)
- `phoneVerified`: Phone verification status (boolean)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "user": {
      "id": 123,
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "accountStatus": "suspended",
      "emailVerified": true,
      "phoneVerified": true,
      "updatedAt": "2025-10-12T14:30:00Z"
    }
  }
}
```

**Error Response - No Updates (400 Bad Request):**
```json
{
  "success": false,
  "message": "No valid updates provided",
  "errorCode": "VALD001"
}
```

**Error Response - Insufficient Permissions (403 Forbidden):**
```json
{
  "success": false,
  "message": "Cannot modify user with higher or equal role",
  "errorCode": "AUTH009"
}
```

**Role Hierarchy Enforcement:**
- Can only update users with lower role levels than yourself
- Cannot update users with equal or higher roles
- Cannot update your own account via this endpoint

**Updatable Fields:**
- **accountStatus**: Change account status (active, pending, suspended, locked)
- **emailVerified**: Manually verify or unverify email
- **phoneVerified**: Manually verify or unverify phone

**Notes:**
- At least one field must be provided
- Updated timestamp is automatically set
- Cannot update role via this endpoint (use `/admin/users/:id/role`)
- Cannot update password via this endpoint (use `/admin/users/:id/password`)

---

### DELETE /admin/users/:id

Soft delete a user by setting status to 'deleted'.

**Request Headers:**
```
Authorization: Bearer <admin-token>
```

**Path Parameters:**
- `id` (required): User ID (integer)

**Example Request:**
```bash
DELETE /admin/users/123 HTTP/1.1
Host: localhost:8000
Authorization: Bearer <admin-token>
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "data": null
}
```

**Error Response - User Not Found (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found or already deleted",
  "errorCode": "USER001"
}
```

**Error Response - Insufficient Permissions (403 Forbidden):**
```json
{
  "success": false,
  "message": "Cannot delete user with higher or equal role",
  "errorCode": "AUTH009"
}
```

**Error Response - Self-Deletion (403 Forbidden):**
```json
{
  "success": false,
  "message": "Cannot delete your own account",
  "errorCode": "AUTH009"
}
```

**Deletion Rules:**
- **Soft Delete Only**: Sets account status to 'deleted' (does not remove from database)
- **Role Hierarchy**: Can only delete users with lower roles than yourself
- **Self-Protection**: Cannot delete your own account
- **Already Deleted**: Returns 404 if user already has 'deleted' status

**Notes:**
- This is a soft delete operation (data is preserved)
- User can potentially be restored by changing status back to active
- Updated timestamp is set when deleted
- Deleted users cannot login

---

### PUT /admin/users/:id/password

Admin directly sets a new password for any user.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin-token>
```

**Path Parameters:**
- `id` (required): User ID (integer)

**Request Body:**
```json
{
  "password": "NewSecurePass456!"
}
```

**Request Body Parameters:**
- `password` (required): New password, 8-128 characters

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully by admin",
  "data": null
}
```

**Error Response - User Not Found (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "errorCode": "USER001"
}
```

**Error Response - Insufficient Permissions (403 Forbidden):**
```json
{
  "success": false,
  "message": "Cannot reset password for user with higher or equal role",
  "errorCode": "AUTH009"
}
```

**Error Response - Validation Failed (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

**Role Hierarchy Enforcement:**
- Can only reset passwords for users with lower roles than yourself
- Cannot reset passwords for users with equal or higher roles

**Security Features:**
- Generates new salt and hash for password
- Updates account timestamp
- Uses same password validation as registration (8-128 chars)
- Old password is immediately invalidated

**Use Cases:**
- Emergency password reset
- Account recovery when user cannot reset via email
- Administrative password management

**Notes:**
- Does not require old password
- User's JWT tokens remain valid (they don't need to re-login immediately)
- Account status is not changed

---

### PUT /admin/users/:id/role

Change a user's role with strict hierarchy enforcement.

**Request Headers:**
```
Content-Type: application/json
Authorization: Bearer <admin-token>
```

**Path Parameters:**
- `id` (required): User ID (integer)

**Request Body:**
```json
{
  "role": 2
}
```

**Request Body Parameters:**
- `role` (required): New role level (1-5)

**Success Response (200 OK):**
```json
{
  "success": true,
  "message": "User role changed from User to Moderator",
  "data": {
    "user": {
      "id": 123,
      "firstName": "John",
      "lastName": "Doe",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "phone": "2065551234",
      "role": "Moderator",
      "roleLevel": 2,
      "emailVerified": true,
      "phoneVerified": false,
      "accountStatus": "active",
      "updatedAt": "2025-10-12T15:00:00Z"
    },
    "previousRole": {
      "role": "User",
      "roleLevel": 1
    }
  }
}
```

**Error Response - User Not Found (404 Not Found):**
```json
{
  "success": false,
  "message": "User not found",
  "errorCode": "USER001"
}
```

**Error Response - Invalid Role (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "role",
      "message": "Role must be between 1 and 5"
    }
  ]
}
```

**Error Response - Insufficient Permissions (403 Forbidden):**
```json
{
  "success": false,
  "message": "Cannot assign role higher than or equal to your own",
  "errorCode": "AUTH009"
}
```

**Error Response - Self-Role-Change (403 Forbidden):**
```json
{
  "success": false,
  "message": "Cannot change your own role",
  "errorCode": "AUTH009"
}
```

**Role Levels:**
- **1**: User - Basic access
- **2**: Moderator - User management
- **3**: Admin - Full user CRUD, can create users up to admin level
- **4**: SuperAdmin - System administration
- **5**: Owner - Complete system control

**Role Hierarchy Rules:**
- Admin (3) and higher can change lower roles up to their own level
- Only higher roles can demote equal roles (e.g., super admin can demote admin, but admin cannot demote admin)
- Cannot promote to above your own role level
- Cannot change your own role
- Admin (3) can assign roles 1-3, Super Admin (4) can assign 1-4, etc.

**Promotion/Demotion Examples:**
- Admin promoting User to Moderator: ✅ Allowed
- Admin promoting Moderator to Admin: ✅ Allowed
- Admin promoting Admin to SuperAdmin: ❌ Forbidden (cannot promote above own level)
- Admin demoting Admin to Moderator: ❌ Forbidden (cannot modify equal role)
- SuperAdmin demoting Admin to User: ✅ Allowed

**Notes:**
- Response includes both new and previous role information
- Updated timestamp is set when role changes
- User's JWT token remains valid (new role takes effect on next login)

---

## Error Codes Reference

The TCSS-460-auth-squared uses standardized error codes for consistent error handling:

### Authentication Errors (AUTH)
- `AUTH001` - Invalid credentials
- `AUTH002` - Email already in use
- `AUTH003` - Username already in use
- `AUTH004` - Phone already in use
- `AUTH005` - Account suspended
- `AUTH006` - Account locked
- `AUTH007` - Invalid token
- `AUTH009` - Insufficient permissions / Auth token not supplied

### Verification Errors (VRFY)
- `VRFY001` - Invalid verification token
- `VRFY002` - Already verified
- `VRFY003` - Token/code expired
- `VRFY004` - Invalid verification code
- `VRFY005` - Too many attempts
- `VRFY006` - Rate limit exceeded
- `VRFY007` - No verification code found

### Validation Errors (VALD)
- `VALD001` - Missing required fields / Invalid input
- `VALD005` - Invalid password

### User Errors (USER)
- `USER001` - User not found

### Server Errors (SRVR)
- `SRVR001` - Database error
- `SRVR002` - Transaction failed
- `SRVR003` - Email send failed
- `SRVR004` - SMS send failed

---

## Response Format Standards

All API responses follow a consistent structure:

### Success Response Format
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data varies by endpoint
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "Error description",
  "errorCode": "AUTH001"
}
```

### Validation Error Format
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

---

## Getting Started

### 1. Start the Development Server
```bash
npm run dev
```

### 2. Visit Interactive Documentation
```
http://localhost:8000/api-docs
```

### 3. Register a User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Test",
    "lastname": "User",
    "email": "test@example.com",
    "username": "testuser",
    "password": "SecurePass123!",
    "phone": "2065551234"
  }'
```

### 4. Use JWT Token
```bash
curl -X GET http://localhost:8000/jwt_test \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Educational Resources

This TCSS-460-auth-squared API demonstrates:

- **JWT Authentication**: Token-based authentication with Bearer scheme
- **Role-Based Access Control**: 5-tier hierarchy with strict enforcement
- **Password Security**: SHA256 hashing with unique salts per user
- **Email Verification**: Token-based email confirmation with expiry
- **SMS Verification**: Code-based phone verification via email-to-SMS gateway
- **Rate Limiting**: Protection against abuse on verification endpoints
- **Transaction Management**: Database transactions for data consistency
- **Input Validation**: Comprehensive validation with express-validator
- **Error Handling**: Standardized error codes and response formats
- **RESTful Design**: Proper HTTP methods and status codes
- **API Documentation**: OpenAPI/Swagger specification
- **Soft Deletes**: Non-destructive user deletion
- **Pagination**: Efficient large dataset handling
- **Search Functionality**: Multi-field user search with filtering
- **Admin Dashboard**: Aggregate statistics and metrics

---

## Contact

For questions about this educational API, please contact the TCSS-460 course staff.

**Email:** tcss460professor@gmail.com
