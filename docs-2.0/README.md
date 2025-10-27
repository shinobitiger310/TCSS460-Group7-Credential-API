# <img src="/images/logo.svg" alt="TCSS-460-auth-squared" width="60" style="vertical-align: middle;"> TCSS-460-auth-squared - Educational Documentation

Welcome to the comprehensive educational documentation for the TCSS-460-auth-squared project. This documentation is designed to help students understand fundamental web development, API design, authentication/authorization systems, and software engineering concepts through practical examples.

## 📚 Documentation Structure

### Core Documentation

- **[Complete API Reference](/doc/API_DOCUMENTATION.md)** - Detailed endpoint documentation with examples
- **[Interactive API Testing](http://localhost:8000/api-docs)** - Swagger UI for hands-on endpoint testing

### Quick Start Guide

1. **Start the API:** Ensure the development server is running (`npm run dev`)
2. **Begin with Fundamentals:** Start with [HTTP Fundamentals](/doc/http-fundamentals.md)
3. **Test Interactively:** Use [Swagger UI](http://localhost:8000/api-docs) to test endpoints
4. **Explore Code:** Review the practical implementations in the codebase

## 🎯 Learning Objectives & Resources

By studying this documentation alongside the codebase, students will gain:

### **HTTP & REST API Fundamentals**
- JSON data format for web APIs
- Understanding of HTTP methods and their semantic meanings
- RESTful API design principles and conventions
- Request/response cycles and parameter handling
- Client-server architecture and communication patterns

**📚 Study:** [JSON Fundamentals](/doc/json-fundamentals.md) → [HTTP Fundamentals](/doc/http-fundamentals.md) → [HTTP History & Evolution](/doc/http-history-evolution.md) → [Client-Server Architecture](/doc/client-server-architecture.md) → [Request-Response Model](/doc/request-response-model.md) → [HTTP Methods](/doc/http-methods.md) → [HTTP Status Codes](/doc/http-status-codes.md)
**🔒 Security:** [Web Security Guide](/doc/web-security-guide.md) → [Validation Strategies](/doc/validation-strategies.md)
**🔧 Practice:** Try the [Interactive API Documentation](http://localhost:8000/api-docs)
**✋ Hands-On:** Test `POST /auth/register`, `POST /auth/login`, `GET /auth/verify`

### **API Documentation & Testing**
- Interactive API documentation with Swagger/OpenAPI
- API testing methodologies and tools
- Documentation-driven development practices

**📚 Study:** [Testing Strategies](/doc/testing-strategies.md)
**🔧 Practice:** Use [Swagger UI](http://localhost:8000/api-docs) to test all endpoints
**✋ Hands-On:** Test authentication endpoints: `POST /auth/login`, `POST /auth/register`

### **API Security & Authentication**
- API authentication patterns (API Keys vs JWT)
- Stateful vs stateless authentication
- Protected endpoints and middleware authorization
- Request tracking and usage analytics
- Authentication security best practices

**📚 Study:** [API Authentication Guide](/doc/authentication-guide.md)
**🔒 Security:** [Web Security Guide](/doc/web-security-guide.md) → [Validation Strategies](/doc/validation-strategies.md)
**🔑 Practice:** Register and login to receive JWT tokens for protected endpoints
**✋ Hands-On:** Test protected endpoints: `GET /admin/users` with Authorization header

### **Backend Development Foundations**
- Node.js and Express.js application architecture
- Asynchronous programming and the event loop
- Middleware patterns and request processing pipelines
- Input validation and error handling strategies
- TypeScript compilation and development workflow

**📚 Study:** [Async JavaScript & Node.js](/doc/async-javascript-nodejs.md), [Node.js & Express Architecture](/doc/node-express-architecture.md), [Error Handling Patterns](/doc/error-handling-patterns.md), [Development Workflow](/doc/development-workflow.md)
**🗃️ Database:** [Database Fundamentals](/doc/database-fundamentals.md)
**🔧 Practice:** Examine health check patterns: `GET /health`
**✋ Hands-On:** Test validation with `POST /auth/register` using JSON data

### **Professional Development Practices**
- TypeScript type safety and interface design
- Code organization and maintainability patterns
- Modern tooling and development workflows
- Module system and import/export patterns

**📚 Study:** [Import/Export Patterns](/doc/import-export-patterns.md), [TypeScript Patterns](/doc/typescript-patterns.md), [Environment Configuration](/doc/environment-configuration.md)
**🔧 Practice:** Examine barrel exports in `src/types/index.ts` and `src/controllers/index.ts`
**✋ Hands-On:** Create a new utility module and export it using named exports

### **Advanced Implementation Guides**
Deep dives into specific TCSS-460-auth-squared features and patterns.

**📚 Study:**
- [JWT Implementation Guide](/doc/jwt-implementation-guide.md) - Token generation, validation, security
- [Password Security Guide](/doc/password-security-guide.md) - Hashing, salts, timing-safe comparison
- [RBAC Guide](/doc/rbac-guide.md) - Role-based access control and hierarchy
- [Verification Workflows Guide](/doc/verification-workflows-guide.md) - Email and SMS verification
- [Transaction Patterns Guide](/doc/transaction-patterns-guide.md) - Database transaction utilities
- [Account Lifecycle Guide](/doc/account-lifecycle-guide.md) - Complete user journey
- [API Route Organization](/doc/api-route-organization.md) - Three-tier route structure

**🔧 Practice:** Test authentication flows, role permissions, verification workflows
**✋ Hands-On:** Implement JWT middleware, create admin routes, add verification

## 🔗 Integration with Codebase

This project demonstrates key concepts through practical implementation:

```
/src/routes/open/index.ts                 → Authentication endpoints and health check patterns
/src/controllers/authController.ts        → Authentication operations (register, login, verify)
/src/routes/closed/index.ts               → Protected admin endpoints
/src/core/middleware/validation.ts        → Validation middleware
/src/core/utilities/validationUtils.ts    → Input validation utilities
/src/core/models/index.ts                 → Type definitions and database models
```

## 📖 How to Use This Documentation

1. **Start with the API Documentation** - Review available endpoints and their functionality
2. **Test with Swagger UI** - Use the interactive documentation at `/api-docs`
3. **Examine source code** - See how concepts are implemented in practice
4. **Run Postman tests** - Use the provided test collection for hands-on learning

## 🚀 Getting Started

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Explore the interactive documentation:**
   - [Swagger UI](http://localhost:8000/api-docs) - Test endpoints interactively
   - [API Documentation](http://localhost:8000/doc/API_DOCUMENTATION.md) - Comprehensive endpoint reference

3. **Test the API endpoints:**
   - Health check: `GET /health`
   - Register user: `POST /auth/register`
   - Login: `POST /auth/login`

## 📚 Browse All Educational Resources

**Quick Access:**
- **[Browse All Documentation Files](http://localhost:8000/doc)** - Complete list of educational materials
- **[Interactive API Testing](http://localhost:8000/api-docs)** - Swagger UI for hands-on learning
- **[Complete API Reference](http://localhost:8000/doc/API_DOCUMENTATION.md)** - Detailed endpoint documentation

**Fundamentals Series:**
- [JSON Fundamentals](http://localhost:8000/doc/json-fundamentals.md) - **START HERE** - Understanding JSON, the data format APIs use
- [HTTP Fundamentals](http://localhost:8000/doc/http-fundamentals.md) - Core HTTP concepts and introduction
- [HTTP History & Evolution](http://localhost:8000/doc/http-history-evolution.md) - How HTTP developed over time
- [Client-Server Architecture](http://localhost:8000/doc/client-server-architecture.md) - Architectural patterns
- [Request-Response Model](http://localhost:8000/doc/request-response-model.md) - Communication mechanics
- [HTTP Methods](http://localhost:8000/doc/http-methods.md) - GET, POST, PUT, DELETE explained
- [HTTP Status Codes](http://localhost:8000/doc/http-status-codes.md) - Response codes reference

**Development & Architecture:**
- [Async JavaScript & Node.js](http://localhost:8000/doc/async-javascript-nodejs.md) - Asynchronous programming and event loop
- [Development Workflow](http://localhost:8000/doc/development-workflow.md) - TypeScript compilation, build process, and tooling
- [Import/Export Patterns](http://localhost:8000/doc/import-export-patterns.md) - Module system, exports, and imports
- [Node.js & Express Architecture](http://localhost:8000/doc/node-express-architecture.md) - MVC patterns and middleware
- [TypeScript Patterns](http://localhost:8000/doc/typescript-patterns.md) - Type safety and patterns
- [Error Handling Patterns](http://localhost:8000/doc/error-handling-patterns.md) - Error management strategies
- [Testing Strategies](http://localhost:8000/doc/testing-strategies.md) - API testing approaches
- [Environment Configuration](http://localhost:8000/doc/environment-configuration.md) - Configuration management

**Advanced Topics:**
- [API Authentication Guide](http://localhost:8000/doc/authentication-guide.md) - API Keys vs JWT, authentication patterns
- [JWT Implementation Guide](http://localhost:8000/doc/jwt-implementation-guide.md) - Complete JWT implementation
- [Password Security Guide](http://localhost:8000/doc/password-security-guide.md) - Password hashing and security
- [RBAC Guide](http://localhost:8000/doc/rbac-guide.md) - Role-based access control
- [Verification Workflows Guide](http://localhost:8000/doc/verification-workflows-guide.md) - Email and SMS verification
- [Web Security Guide](http://localhost:8000/doc/web-security-guide.md) - XSS, SQL injection, input validation
- [Validation Strategies](http://localhost:8000/doc/validation-strategies.md) - Comprehensive validation guide
- [Database Fundamentals](http://localhost:8000/doc/database-fundamentals.md) - Transactions, pooling, optimization
- [Transaction Patterns Guide](http://localhost:8000/doc/transaction-patterns-guide.md) - Transaction utility patterns
- [Account Lifecycle Guide](http://localhost:8000/doc/account-lifecycle-guide.md) - User account management
- [API Route Organization](http://localhost:8000/doc/api-route-organization.md) - Route structure patterns

---

*This documentation is part of the TCSS-460 coursework and demonstrates industry-standard practices for educational purposes.*