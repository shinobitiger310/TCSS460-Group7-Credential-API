# Validation Strategies

A comprehensive guide to input validation, data sanitization, and maintaining data integrity in web applications.

> **💡 Related Code**: See implementations in [`/src/core/middleware/validation.ts`](../src/core/middleware/validation.ts) and [`/src/controllers/authController.ts`](../src/controllers/authController.ts)

## Quick Navigation
- 🛡️ **Middleware Validation**: [`validation.ts`](../src/core/middleware/validation.ts) - Express validation middleware
- 🎯 **Usage Examples**: [`authController.ts`](../src/controllers/authController.ts) - Validation in practice
- 📝 **API Patterns**: [API Design Patterns](./api-design-patterns.md#error-handling) - Validation error responses
- 🔒 **Security**: [Web Security Guide](./web-security-guide.md#input-validation-security) - Security-focused validation
- 🏗️ **Architecture**: [Node.js Architecture](./node-express-architecture.md#middleware-system) - Validation middleware patterns

## Table of Contents

- [Input Validation Fundamentals](#input-validation-fundamentals)
- [Validation vs Sanitization](#validation-vs-sanitization)
- [Server-Side vs Client-Side](#server-side-vs-client-side)
- [Validation Types](#validation-types)
- [Implementation Patterns](#implementation-patterns)
- [Security Considerations](#security-considerations)

---

## Input Validation Fundamentals

### What is Input Validation?

Input validation is the process of ensuring that user-provided data meets your application's requirements before processing it. This is critical for security, data integrity, and user experience.

### Why Validation Matters

#### ✅ **Security Benefits:**
- **Prevents malicious input** (SQL injection, XSS attacks)
- **Blocks unauthorized access** attempts
- **Protects against data corruption**
- **Prevents system exploitation**

#### ✅ **Data Integrity Benefits:**
- **Ensures database contains only valid data**
- **Maintains referential integrity**
- **Prevents inconsistent state**
- **Enforces business rules**

#### ✅ **User Experience Benefits:**
- **Provides clear feedback** when input is incorrect
- **Guides users** toward valid input
- **Prevents frustrating errors**
- **Improves application reliability**

#### ✅ **Application Stability Benefits:**
- **Prevents crashes** from unexpected data formats
- **Maintains consistent behavior**
- **Reduces error handling complexity**
- **Improves system reliability**

### Input Validation in Our Codebase

```typescript
// From /src/core/middleware/validation.ts
export const isStringProvided = (value: any): boolean => {
  return typeof value === 'string' && value.trim().length > 0;
};

export const isValidRole = (role: any): boolean => {
  const num = parseInt(role);
  return Number.isInteger(num) && num >= 1 && num <= 5;
};
```

---

## Validation vs Sanitization

### Understanding the Difference

#### **VALIDATION**
- **Purpose**: Check if input meets requirements
- **Action**: Accept valid input, reject invalid input
- **Result**: Boolean (pass/fail)
- **When**: Before processing data

```typescript
// Validation example
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

if (!isValidEmail(userInput)) {
  return sendError(response, 400, "Invalid email format");
}
```

#### **SANITIZATION**
- **Purpose**: Clean input to remove harmful content
- **Action**: Accept and modify input
- **Result**: Cleaned version of input
- **When**: After validation passes

```typescript
// Sanitization example
const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

const cleanInput = sanitizeString(validatedInput);
```

### Best Practice: Validate First, Then Sanitize

```typescript
// ✅ GOOD: Proper validation and sanitization flow
export const processUserInput = (input: any): string | null => {
  // 1. Validate input meets requirements
  if (!isStringProvided(input)) {
    return null; // Reject invalid input
  }

  if (!isValidLength(input, 1, 100)) {
    return null; // Reject out-of-range input
  }

  // 2. Sanitize accepted input
  return sanitizeString(input);
};

// ❌ BAD: Sanitizing without validation
export const processUserInputBad = (input: any): string => {
  return sanitizeString(input || ''); // Might sanitize invalid data!
};
```

---

## Server-Side vs Client-Side Validation

### Client-Side Validation (Browser)

#### ✅ **Advantages:**
- **Immediate feedback** to users
- **Better user experience** (no round trips)
- **Reduced server load** (fewer invalid requests)
- **Real-time validation** as user types

#### ❌ **Disadvantages:**
- **Can be bypassed** or disabled by users
- **Not secure** on its own
- **Limited validation** capabilities
- **Inconsistent** across browsers

```javascript
// Client-side validation example
function validateForm() {
  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;

  if (!username.trim() || username.length < 3) {
    showError('Username must be at least 3 characters');
    return false;
  }

  if (!email.includes('@')) {
    showError('Please enter a valid email address');
    return false;
  }

  return true;
}
```

### Server-Side Validation (Your API)

#### ✅ **Advantages:**
- **Secure and cannot be bypassed**
- **Authoritative validation**
- **Protects your database and business logic**
- **Consistent validation** logic
- **Access to complete data** context

#### ❌ **Disadvantages:**
- **Slower feedback** to users (requires round trip)
- **Increased server load**
- **Network dependency**

```typescript
// Server-side validation example (from /src/core/middleware/validation.ts)
export const validateRegister = [
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters'),

  handleValidationErrors
];
```

### **GOLDEN RULE**
> Always validate on the server, optionally add client-side for UX.

---

## Validation Types

### 1. Type Validation

Ensure input is the expected data type.

```typescript
// Type validation examples
export const isValidNumber = (value: any): boolean => {
  return !isNaN(value) && !isNaN(parseFloat(value));
};

export const isValidInteger = (value: any): boolean => {
  return Number.isInteger(Number(value));
};

export const isValidBoolean = (value: any): boolean => {
  return typeof value === 'boolean' || value === 'true' || value === 'false';
};

// Usage in validation middleware
body('age').isInt().withMessage('Age must be an integer'),
body('active').isBoolean().withMessage('Active must be a boolean'),
```

### 2. Format Validation

Verify input matches expected patterns.

> **📖 Verification Workflows**: See the [Verification Workflows Guide](./verification-workflows-guide.md) for complete email and SMS verification implementation.

```typescript
// Format validation examples
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
  return phoneRegex.test(phone);
};

export const isValidURL = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Usage in validation middleware
body('email').isEmail().withMessage('Must be a valid email'),
body('website').isURL().withMessage('Must be a valid URL'),
```

### 3. Range Validation

Check if values are within acceptable limits.

```typescript
// Range validation examples
export const isValidLength = (value: string, min: number, max: number): boolean => {
  const length = value.trim().length;
  return length >= min && length <= max;
};

export const isValidRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max;
};

export const isValidDate = (date: string): boolean => {
  const parsed = new Date(date);
  return !isNaN(parsed.getTime()) && parsed > new Date('1900-01-01');
};

// Usage in validation middleware
body('name').isLength({ min: 1, max: 100 }).withMessage('Name must be 1-100 characters'),
body('priority').isInt({ min: 1, max: 3 }).withMessage('Priority must be 1-3'),
body('birthdate').isISO8601().withMessage('Must be a valid date'),
```

### 4. Business Rule Validation

Enforce domain-specific constraints.

```typescript
// Business rule validation examples (Auth² specific)
export const isValidRole = (role: any): boolean => {
  // Business rule: Role must be 1 (User), 2 (Moderator), 3 (Admin), 4 (SuperAdmin), or 5 (Owner)
  const num = parseInt(role);
  return Number.isInteger(num) && num >= 1 && num <= 5;
};

export const isValidUsername = (username: string): boolean => {
  // Business rule: alphanumeric, underscore, hyphen, 3-50 chars
  const usernameRegex = /^[a-zA-Z0-9_-]{3,50}$/;
  return usernameRegex.test(username);
};

export const isValidPassword = (password: string): boolean => {
  // Business rule: at least 8 chars, max 128 chars
  const hasLength = password.length >= 8 && password.length <= 128;
  return hasLength;
};

// Usage in controllers (from /src/controllers/authController.ts)
if (!isValidRole(request.body.role)) {
  return sendError(response, 400, "Role must be between 1 and 5");
}
```

---

## Implementation Patterns

### Express-Validator Integration

```typescript
// Validation middleware using express-validator (from /src/core/middleware/validation.ts)
import { body, param, query, validationResult } from 'express-validator';

// User registration validation
export const validateRegister = [
  body('firstname')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 1, max: 100 }).withMessage('First name must be between 1 and 100 characters'),

  body('lastname')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 1, max: 100 }).withMessage('Last name must be between 1 and 100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(), // Sanitization

  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters'),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone is required')
    .matches(/^\d{10,}$/).withMessage('Phone must be at least 10 digits'),

  handleValidationErrors
];

// Admin user creation with role validation
export const validateAdminCreateUser = [
  // ... firstname, lastname, email, username, password, phone validation (same as above)

  body('role')
    .notEmpty().withMessage('Role is required')
    .isInt({ min: 1, max: 5 }).withMessage('Role must be an integer between 1 and 5')
    .toInt(),

  handleValidationErrors
];

// Route usage (from /src/routes/open/index.ts)
router.post('/auth/register', validateRegister, AuthController.register);
```

### Custom Validation Functions

```typescript
// Custom validator for user uniqueness (from /src/core/utilities/validationUtils.ts)
export const validateUserUniqueness = async (
  credentials: { email?: string; username?: string; phone?: string },
  response: Response
): Promise<boolean> => {
  const { email, username, phone } = credentials;

  // Check email uniqueness
  if (email) {
    const emailCheck = await pool.query(
      'SELECT Account_ID FROM Account WHERE Email = $1',
      [email]
    );
    if (emailCheck.rowCount > 0) {
      sendError(response, 409, 'Email already exists', ErrorCodes.USER_EMAIL_EXISTS);
      return true; // User exists (validation failed)
    }
  }

  // Check username uniqueness
  if (username) {
    const usernameCheck = await pool.query(
      'SELECT Account_ID FROM Account WHERE Username = $1',
      [username]
    );
    if (usernameCheck.rowCount > 0) {
      sendError(response, 409, 'Username already exists', ErrorCodes.USER_USERNAME_EXISTS);
      return true; // User exists (validation failed)
    }
  }

  // Check phone uniqueness
  if (phone) {
    const phoneCheck = await pool.query(
      'SELECT Account_ID FROM Account WHERE Phone = $1',
      [phone]
    );
    if (phoneCheck.rowCount > 0) {
      sendError(response, 409, 'Phone number already exists', ErrorCodes.USER_PHONE_EXISTS);
      return true; // User exists (validation failed)
    }
  }

  return false; // User does not exist (validation passed)
};

// Usage in controller (from /src/controllers/authController.ts)
const userExists = await validateUserUniqueness(
  { email, username, phone },
  response
);
if (userExists) return;
```

### Validation Schemas

```typescript
// Using Joi for schema validation
import Joi from 'joi';

const messageSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 1 character',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    }),

  message: Joi.string()
    .min(1)
    .required()
    .messages({
      'string.min': 'Message cannot be empty',
      'any.required': 'Message is required'
    }),

  priority: Joi.number()
    .integer()
    .min(1)
    .max(3)
    .required()
    .messages({
      'number.min': 'Priority must be at least 1',
      'number.max': 'Priority cannot exceed 3',
      'any.required': 'Priority is required'
    })
});

// Validation middleware
const validateWithJoi = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return sendValidationError(res, "Validation failed", errors);
    }

    req.body = value; // Use validated/sanitized data
    next();
  };
};

// Usage
router.post('/messages', validateWithJoi(messageSchema), createMessage);
```

---

## Security Considerations

### 1. Never Trust User Input

```typescript
// ❌ BAD: Trusting user input
const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
await pool.query(query); // SQL injection vulnerability!

// ✅ GOOD: Always validate and use parameterized queries
const id = parseInt(req.params.id);
if (!Number.isInteger(id) || id <= 0) {
  return sendError(res, 400, "Invalid user ID");
}
const query = 'SELECT * FROM users WHERE id = $1';
await pool.query(query, [id]);
```

### 2. Validate Length Limits

```typescript
// Prevent buffer overflow and DoS attacks
body('message')
  .isLength({ max: 1000 })
  .withMessage('Message cannot exceed 1000 characters');

// File upload validation
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1                    // Single file only
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});
```

### 3. Sanitize Output to Prevent XSS

```typescript
// Basic XSS prevention
export const sanitizeString = (input: string): string => {
  return input.trim().replace(/[<>]/g, '');
};

// More comprehensive sanitization
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeHTML = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] }); // Strip all HTML
};

// Context-aware encoding
export const encodeForHTML = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};
```

### 4. Use Allowlists Instead of Blocklists

```typescript
// ❌ BAD: Blocklist approach (easy to bypass)
const blockedWords = ['script', 'javascript', 'eval'];
const isValidInput = (input: string): boolean => {
  return !blockedWords.some(word => input.toLowerCase().includes(word));
};

// ✅ GOOD: Allowlist approach (more secure)
const allowedCharacters = /^[a-zA-Z0-9\s\-_.!?]+$/;
const isValidInput = (input: string): boolean => {
  return allowedCharacters.test(input);
};

// Allowlist for file extensions
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
const isValidFileExtension = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return allowedExtensions.includes(ext);
};
```

### 5. Validate File Uploads

```typescript
const fileUploadValidation = (req: Request, res: Response, next: NextFunction) => {
  const file = req.file;

  if (!file) {
    return sendError(res, 400, "File is required");
  }

  // Validate file size
  if (file.size > 5 * 1024 * 1024) { // 5MB
    return sendError(res, 400, "File too large");
  }

  // Validate MIME type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (!allowedTypes.includes(file.mimetype)) {
    return sendError(res, 400, "Invalid file type");
  }

  // Validate file extension (don't trust MIME type alone)
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return sendError(res, 400, "Invalid file extension");
  }

  next();
};
```

---

## Testing Validation Logic

### Unit Testing Validation Functions

```typescript
// Test validation utilities
describe('Validation Utils', () => {
  describe('isValidEmail', () => {
    it('should return true for valid emails', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('test.user@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });

  describe('isValidUsername', () => {
    it('should accept valid usernames', () => {
      expect(isValidUsername('john_doe')).toBe(true);
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('test-user')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(isValidUsername('ab')).toBe(false); // Too short
      expect(isValidUsername('user@name')).toBe(false); // Invalid character
      expect(isValidUsername('a'.repeat(51))).toBe(false); // Too long
    });
  });

  describe('isValidRole', () => {
    it('should accept valid role levels', () => {
      expect(isValidRole(1)).toBe(true); // User
      expect(isValidRole(2)).toBe(true); // Moderator
      expect(isValidRole(3)).toBe(true); // Admin
      expect(isValidRole(4)).toBe(true); // SuperAdmin
      expect(isValidRole(5)).toBe(true); // Owner
    });

    it('should reject invalid role levels', () => {
      expect(isValidRole(0)).toBe(false);
      expect(isValidRole(6)).toBe(false);
      expect(isValidRole(1.5)).toBe(false);
      expect(isValidRole('admin')).toBe(false);
    });
  });
});
```

### Integration Testing Validation Middleware

```typescript
// Test auth validation middleware
describe('Auth Validation Middleware', () => {
  it('should accept valid registration data', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        firstname: 'John',
        lastname: 'Doe',
        email: 'john.doe@example.com',
        username: 'johndoe',
        password: 'SecurePass123',
        phone: '1234567890'
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data.user.username).toBe('johndoe');
  });

  it('should reject missing required fields', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        email: 'john.doe@example.com',
        username: 'johndoe'
        // Missing firstname, lastname, password, phone
      })
      .expect(400);

    expect(response.body.success).toBe(false);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('should reject invalid email format', async () => {
    const response = await request(app)
      .post('/auth/register')
      .send({
        firstname: 'John',
        lastname: 'Doe',
        email: 'invalid-email', // Invalid format
        username: 'johndoe',
        password: 'SecurePass123',
        phone: '1234567890'
      })
      .expect(400);

    expect(response.body.message).toContain('email');
  });

  it('should reject invalid role values for admin creation', async () => {
    const response = await request(app)
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstname: 'Jane',
        lastname: 'Admin',
        email: 'jane@example.com',
        username: 'janeadmin',
        password: 'SecurePass123',
        phone: '0987654321',
        role: 10 // Invalid role
      })
      .expect(400);

    expect(response.body.message).toContain('Role must be');
  });
});
```

---

## Performance Considerations

### Efficient Validation

```typescript
// ✅ GOOD: Early validation exit
const validateInput = (input: any): ValidationResult => {
  // Check most likely failures first
  if (typeof input !== 'string') {
    return { valid: false, error: 'Must be a string' };
  }

  if (input.length === 0) {
    return { valid: false, error: 'Cannot be empty' };
  }

  if (input.length > 1000) {
    return { valid: false, error: 'Too long' };
  }

  // More expensive validation last
  if (!complexPatternTest(input)) {
    return { valid: false, error: 'Invalid format' };
  }

  return { valid: true };
};

// ❌ BAD: Always doing expensive validation
const validateInputBad = (input: any): ValidationResult => {
  const expensiveResult = complexPatternTest(input); // Runs even for non-strings!

  if (typeof input !== 'string' || input.length === 0) {
    return { valid: false, error: 'Invalid input' };
  }

  return { valid: expensiveResult };
};
```

### Caching Validation Results

```typescript
// Cache expensive validation results
const validationCache = new Map<string, boolean>();

const isValidDomain = (domain: string): boolean => {
  if (validationCache.has(domain)) {
    return validationCache.get(domain)!;
  }

  const isValid = performExpensiveDomainValidation(domain);
  validationCache.set(domain, isValid);

  // Cache cleanup (prevent memory leaks)
  if (validationCache.size > 1000) {
    const firstKey = validationCache.keys().next().value;
    validationCache.delete(firstKey);
  }

  return isValid;
};
```

---

## Further Reading

- [OWASP Input Validation](https://owasp.org/www-project-cheat-sheets/cheatsheets/Input_Validation_Cheat_Sheet.html) - Security-focused validation guide
- [Express Validator Documentation](https://express-validator.github.io/docs/) - Popular validation library
- [Joi Validation Library](https://joi.dev/) - Powerful schema validation

---

*Effective validation strategies are the first line of defense against security vulnerabilities and data corruption. Implementing comprehensive validation ensures your application remains secure, reliable, and user-friendly.*
