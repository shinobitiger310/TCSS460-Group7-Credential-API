# TCSS-460-auth-squared AI Assistant Instructions

## Project Overview

**TCSS-460-auth-squared** (Authentication × Authorization = Auth²) is a complete **Identity and Access Management (IAM) API** built with Node.js/Express/TypeScript for TCSS 460 - Software Engineering at the University of Washington Tacoma. This is the **third API in the course progression** (Basic API → Message API → Auth² API), designed to teach authentication, authorization, JWT tokens, role-based access control, and security best practices.

**Instructor**: Professor Charles Bryan (cfb3@uw.edu)
**Course Level**: Senior-level undergraduate computer science elective
**Educational Focus**: Teaching Web API fundamentals, authentication patterns, and security concepts - NOT production optimization

## Development Philosophy & Coding Standards

### Core Principles
- **Readable and contextual identifiers** - Use descriptive variable and function names
- **Prefer `request` and `response`** instead of `req`/`res` - Reinforces HTTP Request/Response cycle for students
- **Functional expression-based coding style** over imperative when readable - Don't overdo it; if statements work fine
- **Keep it simple and educational** - Focus on clarity over optimization
- **Simple database design** - Clean and understandable; indexing is fine but database efficiency is NOT the focus

### Key Educational Objectives
This project demonstrates:
- RESTful API design principles
- HTTP request/response patterns
- Authentication patterns (JWT tokens, password hashing)
- Authorization patterns (role-based access control, hierarchy enforcement)
- Security best practices (SQL injection prevention, timing-safe comparisons)
- Database integration with PostgreSQL
- TypeScript in Node.js applications
- Testing strategies (Jest, Supertest)
- Clean architecture and separation of concerns
- Environment-based configuration
- Docker containerization
- Email and SMS verification workflows
- Transaction management for data consistency

## Interaction Guidelines

### How to Address the Instructor
- Always address Professor Bryan as "Professor Bryan"
- Think of this as a **colleague/TA relationship** working together
- You are a graduate teaching assistant with significant software development experience
- We are a team: your success is my success, and vice versa
- Technically hierarchical, but not super formal
- Push back when you think you're right, but cite evidence
- Neither of us is afraid to admit when we don't know something
- Do not work ahead of me. Please prompt before attempting to complete a task.
- When we work to add new features, it should be in a feature branch. If I forget to prompt this, you should remind me. 

### Communication Style
- Be direct and clear
- Focus on educational clarity
- Explain "why" not just "how"
- Reference specific files and line numbers when helpful
- Use technical precision but maintain readability
- Do not work ahead of me. Please prompt before attempting to complete a task.

## Technology Stack

### Runtime & Framework
- **Node.js**: v22.14.0 (ES2020 target)
- **Express**: v5.1.0 (latest major version)
- **TypeScript**: v5.7.2 (strict mode enabled)

### Database
- **PostgreSQL**: Running in Docker (latest image)
- **pg**: v8.16.3 (node-postgres driver)

### Development Tools
- **Jest**: v30.1.3 (testing framework with ts-jest)
- **Supertest**: v7.1.4 (HTTP testing)
- **nodemon**: v3.1.10 (hot reload during development)
- **ESLint**: v9.34.0 with TypeScript plugin
- **Prettier**: v3.6.2 (code formatting)
- **tsconfig-paths**: v4.2.0 (path aliasing support)

### Key Dependencies
- **dotenv**: v16.4.7 (environment configuration)
- **cors**: v2.8.5 (CORS middleware)
- **express-validator**: v7.2.1 (request validation)
- **jsonwebtoken**: v9.0.2 (JWT authentication)
- **nodemailer**: v7.0.6 (email service)
- **twilio**: v5.9.0 (SMS service - optional)
- **swagger-ui-express**: v5.0.1 (API documentation)
- **yamljs**: v0.3.0 (YAML parsing for Swagger)

## Project Architecture

### Directory Structure

```
src/
├── app.ts                     # Express app configuration
├── index.ts                   # Server lifecycle management
├── routes/
│   ├── index.ts              # Main router (combines all route groups)
│   ├── open/                 # Public routes (no authentication)
│   │   └── index.ts          # Login, register, password reset, email verify
│   ├── closed/               # Protected routes (requires JWT)
│   │   └── index.ts          # Change password, verification endpoints
│   └── admin/                # Admin-only routes (requires admin role)
│       └── index.ts          # User CRUD, role management, dashboard
├── controllers/
│   ├── index.ts              # Barrel export
│   ├── authController.ts     # Authentication operations
│   ├── adminController.ts    # Admin user management
│   └── verificationController.ts  # Email/SMS verification
├── core/
│   ├── middleware/
│   │   ├── index.ts          # Barrel export
│   │   ├── jwt.ts            # JWT token validation (checkToken)
│   │   ├── adminAuth.ts      # Admin role checking & hierarchy enforcement
│   │   ├── validation.ts     # express-validator chains for all endpoints
│   │   └── verificationChecks.ts  # Rate limiting & verification checks
│   ├── utilities/
│   │   ├── index.ts          # Barrel export
│   │   ├── database.ts       # PostgreSQL connection pool (singleton)
│   │   ├── credentialingUtils.ts  # Password hashing & verification
│   │   ├── tokenUtils.ts     # JWT token generation
│   │   ├── emailService.ts   # Nodemailer email sending
│   │   ├── responseUtils.ts  # sendSuccess() & sendError() helpers
│   │   ├── validationUtils.ts # Custom validation functions
│   │   ├── errorCodes.ts     # Standardized error codes
│   │   ├── envConfig.ts      # Environment variable helpers
│   │   ├── userExistenceUtils.ts  # User uniqueness validation
│   │   └── transactionUtils.ts    # Database transaction wrapper
│   └── models/
│       └── index.ts          # TypeScript interfaces, enums, constants
├── test/
│   └── setup.ts              # Jest test configuration
└── __tests__/                # Unit tests (co-located with utilities)
    └── (various .test.ts files)

data/
├── init.sql                  # Database schema initialization
└── heroku.sql               # Heroku-specific schema

docs/
├── swagger.yaml             # OpenAPI 3.0 specification
└── postman-collection.json  # Postman API tests

ai.prof/
├── instructions.md          # This file - AI assistant guidelines
├── api-consistency-guide.md # Patterns from Message API
├── database-mocking-strategies.md  # Testing strategies
└── auth-api-documentation-plan.md  # Documentation roadmap
```

### TypeScript Path Aliases (tsconfig.json:19-29)

The project uses path aliases for clean imports:

```typescript
// Path aliases configured in tsconfig.json
{
  "@core/*": ["core/*"],
  "@routes/*": ["routes/*"],
  "@controllers": ["controllers/index"],
  "@utilities": ["core/utilities/index"],
  "@middleware": ["core/middleware/index"],
  "@models": ["core/models/index"],
  "@db": ["core/utilities/database"],
  "@auth": ["core/utilities/credentialingUtils"]
}
```

**Usage Examples:**
```typescript
import { pool, sendSuccess, sendError, ErrorCodes } from '@utilities';
import { checkToken, requireAdmin } from '@middleware';
import { AuthController, AdminController } from '@controllers';
import { IJwtRequest, UserRole, RoleName } from '@models';
```

**IMPORTANT**: Always use path aliases in imports. Never use relative paths like `../../types`.

## Complete API Endpoints

### Public Routes (Open)
**Authentication:**
- `POST /auth/login` - User login, returns JWT token
- `POST /auth/register` - New user registration (always role 1)
- `POST /auth/password/reset-request` - Request password reset email
- `POST /auth/password/reset` - Reset password with token

**Verification:**
- `GET /auth/verify/carriers` - List supported SMS carriers
- `GET /auth/verify/email/confirm?token=xxx` - Verify email via link

**Testing:**
- `GET /jwt_test` - Simple API health check

### Protected Routes (Closed - Requires JWT)
**User Operations:**
- `POST /auth/user/password/change` - Change password (requires old password)

**Verification:**
- `POST /auth/verify/phone/send` - Send SMS verification code
- `POST /auth/verify/phone/verify` - Verify SMS code
- `POST /auth/verify/email/send` - Send email verification

### Admin Routes (Requires Admin Role)
**User Management:**
- `POST /admin/users/create` - Create user with specified role
- `GET /admin/users?page=1&limit=20&status=active&role=3` - List users (paginated, filterable)
- `GET /admin/users/search?q=searchTerm&fields=email,username` - Search users
- `GET /admin/users/stats/dashboard` - Dashboard statistics
- `GET /admin/users/:id` - Get user details
- `PUT /admin/users/:id` - Update user (status, verification flags)
- `DELETE /admin/users/:id` - Soft delete user (set status to 'deleted')
- `PUT /admin/users/:id/password` - Admin reset user password
- `PUT /admin/users/:id/role` - Change user role (with hierarchy enforcement)

## Database Architecture

### Connection Management
- **File**: src/core/utilities/database.ts
- **Pattern**: Singleton connection pool with dependency injection support for testing
- **Configuration**: From environment variables via `envConfig.ts`
- **Functions**: `connectToDatabase()`, `disconnectFromDatabase()`, `getPool()`, `setPool()`, `resetPool()`

### Database Schema (data/init.sql)

**4 Tables:**

**Account** - Main user table
```sql
Account_ID (SERIAL PK), FirstName, LastName, Username (UNIQUE),
Email (UNIQUE), Email_Verified (BOOLEAN), Phone (UNIQUE),
Phone_Verified (BOOLEAN), Account_Role (INT),
Account_Status (VARCHAR: pending/active/suspended/locked),
Created_At, Updated_At
```

**Account_Credential** - Password storage
```sql
Credential_ID (SERIAL PK), Account_ID (FK),
Salted_Hash (VARCHAR), Salt (VARCHAR)
```

**Email_Verification** - Email verification tokens
```sql
Verification_ID (SERIAL PK), Account_ID (FK), Email,
Verification_Token (VARCHAR UNIQUE), Token_Expires (TIMESTAMPTZ),
Verified (BOOLEAN), Created_At
```

**Phone_Verification** - SMS verification codes
```sql
Verification_ID (SERIAL PK), Account_ID (FK), Phone,
Verification_Code (VARCHAR 6-digit), Code_Expires (TIMESTAMPTZ),
Attempts (INT), Verified (BOOLEAN), Created_At
```

**Role Hierarchy:**
- 1: User (basic access)
- 2: Moderator (user management)
- 3: Admin (full user CRUD, create roles ≤ 3)
- 4: SuperAdmin (system admin, create roles ≤ 4)
- 5: Owner (complete control)

**Security Features:**
- SHA256 password hashing with unique salts per user
- Parameterized queries (SQL injection prevention)
- Timing-safe password comparison
- JWT tokens with 14-day expiry
- Email verification tokens (48-hour expiry)
- SMS verification codes (15-minute expiry, attempt limiting)

## Response Patterns

### Standard Success Response Structure
```typescript
{
  success: true,
  message: string,
  data: T | null,
  timestamp?: string
}
```

**Example:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": 1,
      "email": "user@example.com",
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

### Standard Error Response Structure
```typescript
{
  success: false,
  message: string,
  errorCode: string,
  timestamp?: string
}
```

**Example:**
```json
{
  "success": false,
  "message": "Invalid credentials",
  "errorCode": "AUTH001"
}
```

**Error Code Format:** `CATEGORY + 3-digit number`
- `AUTH001-099` - Authentication errors
- `USER001-099` - User errors
- `PASS001-099` - Password errors
- `VRFY001-099` - Verification errors
- `VALD001-099` - Validation errors
- `SRVR001-099` - Server errors

**Helper Functions:** `sendSuccess(response, data, message, statusCode?)` and `sendError(response, statusCode, message, errorCode)` in src/core/utilities/responseUtils.ts

**Remember**: This is an **educational project**. The goal is teaching Web API fundamentals to senior computer science students. Clarity and learning outcomes trump production optimization.