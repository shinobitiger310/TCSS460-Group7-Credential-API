# JSON Fundamentals

A comprehensive introduction to JSON (JavaScript Object Notation), the universal data format for web APIs.

> **💡 Related Code**: See JSON usage in [`/src/types/apiTypes.ts`](../src/types/apiTypes.ts), request/response examples in controllers, and test data in [`/testing/postman/`](../testing/postman/)

## Quick Navigation
- 📡 **API Responses**: All endpoints return JSON - Try [Swagger UI](http://localhost:8000/api-docs)
- 🧪 **Testing**: [Postman Collection](../testing/postman/) uses JSON for requests
- 📘 **TypeScript**: [TypeScript Patterns](./typescript-patterns.md) - How types relate to JSON
- 🌐 **HTTP**: [HTTP Fundamentals](./http-fundamentals.md) - JSON in HTTP context
- 🔧 **Request/Response**: [Request-Response Model](./request-response-model.md) - JSON data flow

## Table of Contents

- [What is JSON?](#what-is-json)
- [JSON Syntax Rules](#json-syntax-rules)
- [JSON Data Types](#json-data-types)
- [JSON vs JavaScript Objects](#json-vs-javascript-objects)
- [Common JSON Mistakes](#common-json-mistakes)
- [JSON in Web APIs](#json-in-web-apis)
- [Working with JSON](#working-with-json)
- [Validation and Tools](#validation-and-tools)

---

## What is JSON?

### Definition

**JSON** stands for **JavaScript Object Notation**. It's a lightweight, text-based data format used to exchange information between systems, particularly in web APIs.

### Why JSON?

**Before JSON, we had:**
- **XML** - Verbose, complex, harder to read
- **Custom formats** - Every API used different formats
- **Plain text** - No structure, hard to parse

**JSON solved this:**
✅ **Human-readable** - Easy to understand at a glance
✅ **Language-independent** - Works with any programming language
✅ **Lightweight** - Less data to transmit than XML
✅ **Easy to parse** - Built into JavaScript, libraries exist for all languages
✅ **Industry standard** - 99% of modern web APIs use JSON

### Real-World Analogy

Think of JSON as a **universal language for data**:

- **English** is for humans to communicate
- **JSON** is for computers/applications to communicate
- Just like English has grammar rules, JSON has syntax rules

**Example: Restaurant Order**
```
Human: "I'll have a burger, fries, and a coke"
JSON: {"meal": "burger", "sides": ["fries"], "drink": "coke"}
```

---

## JSON Syntax Rules

JSON has **strict syntax rules**. Breaking any rule makes the JSON invalid!

### Rule 1: Data is in Name/Value Pairs

```json
{
  "name": "John"
}
```

- **Name** (key): Always a string in double quotes
- **Colon** separates name and value
- **Value**: Can be string, number, boolean, null, array, or object

### Rule 2: Data is Separated by Commas

```json
{
  "name": "John",
  "age": 25,
  "active": true
}
```

❌ **No comma after last item!**

### Rule 3: Objects are in Curly Braces

```json
{
  "user": {
    "name": "John",
    "age": 25
  }
}
```

### Rule 4: Arrays are in Square Brackets

```json
{
  "tags": ["student", "developer", "learner"]
}
```

### Rule 5: Strings Use Double Quotes

```json
{
  "name": "John"
}
```

❌ **NOT single quotes:** `{'name': 'John'}`

### Complete Example

```json
{
  "name": "John Doe",
  "age": 25,
  "active": true,
  "enrolled": true,
  "courses": ["TCSS 460", "TCSS 450", "TCSS 480"],
  "address": {
    "city": "Tacoma",
    "state": "WA",
    "zip": "98402"
  },
  "gpa": 3.8,
  "metadata": null
}
```

---

## JSON Data Types

JSON supports **six data types**:

### 1. String

Text in double quotes.

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "status": "active"
}
```

**Rules:**
- Must use double quotes (not single)
- Escape special characters: `\"`, `\\`, `\n`, `\t`

**Examples:**
```json
{
  "message": "Hello, World!",
  "quote": "He said, \"Hello\"",
  "path": "C:\\Users\\John",
  "multiline": "Line 1\nLine 2"
}
```

### 2. Number

Integer or floating-point number (no quotes).

```json
{
  "age": 25,
  "price": 19.99,
  "quantity": 100,
  "temperature": -5.5,
  "scientific": 1.5e10
}
```

**Rules:**
- No quotes around numbers
- Can be positive or negative
- Can be integer or decimal
- Can use scientific notation

**Not allowed:**
- ❌ Leading zeros: `007`
- ❌ Hex values: `0xFF`
- ❌ `NaN` or `Infinity`

### 3. Boolean

True or false (lowercase, no quotes).

```json
{
  "active": true,
  "enrolled": false,
  "verified": true
}
```

**Rules:**
- Must be lowercase: `true` or `false`
- ❌ NOT: `True`, `TRUE`, `"true"`

### 4. Null

Represents absence of value (lowercase, no quotes).

```json
{
  "middleName": null,
  "secondaryEmail": null
}
```

**Use cases:**
- Optional field with no value
- Explicitly empty value
- Placeholder

**Not the same as:**
- ❌ Undefined (doesn't exist in JSON)
- ❌ Empty string `""`
- ❌ Zero `0`

### 5. Array

Ordered list of values in square brackets.

```json
{
  "tags": ["student", "developer", "active"],
  "scores": [95, 87, 92, 88],
  "flags": [true, false, true],
  "mixed": ["text", 42, true, null],
  "nested": [
    ["a", "b"],
    ["c", "d"]
  ]
}
```

**Rules:**
- Values separated by commas
- Can contain any JSON type
- Can mix types (but not recommended)
- Can be nested

**Common use:**
```json
{
  "users": [
    {"name": "John", "age": 25},
    {"name": "Jane", "age": 30}
  ]
}
```

### 6. Object

Unordered collection of name/value pairs in curly braces.

```json
{
  "user": {
    "name": "John",
    "age": 25
  },
  "address": {
    "street": "123 Main St",
    "city": "Tacoma",
    "coordinates": {
      "lat": 47.2529,
      "lng": -122.4443
    }
  }
}
```

**Rules:**
- Names (keys) must be strings
- Values can be any JSON type
- Nested objects allowed
- Order doesn't matter (unlike arrays)

---

## JSON vs JavaScript Objects

JSON looks like JavaScript, but they're **not identical**!

### Similarities

Both use curly braces and key/value pairs:

```javascript
// JavaScript object
const user = {
  name: "John",
  age: 25
};

// JSON (as string)
const json = '{"name":"John","age":25}';
```

### Key Differences

| Feature | JavaScript Object | JSON |
|---------|------------------|------|
| **Keys** | Can be unquoted | Must be quoted strings |
| **Strings** | Single or double quotes | Only double quotes |
| **Values** | Functions, undefined, Date, etc. | Only 6 data types |
| **Trailing commas** | Allowed | ❌ Not allowed |
| **Comments** | Allowed | ❌ Not allowed |
| **Format** | Native object | Text string |

### Examples

**✅ Valid JavaScript, ❌ Invalid JSON:**

```javascript
// JavaScript object (valid)
const jsObject = {
  name: 'John',                    // Single quotes OK
  age: 25,                         // Trailing comma OK
  greet: function() {              // Functions OK
    return "Hello";
  },
  date: new Date(),                // Date objects OK
  value: undefined,                // undefined OK
  /* comment */                    // Comments OK
};

// JSON (invalid - has errors!)
const invalidJson = `{
  name: 'John',        // ❌ Single quotes
  age: 25,            // ❌ Trailing comma
  greet: function() {  // ❌ Functions not allowed
    return "Hello";
  }
}`;

// ✅ Valid JSON
const validJson = `{
  "name": "John",
  "age": 25
}`;
```

### Converting Between Them

**JavaScript → JSON (stringify):**
```javascript
const user = { name: "John", age: 25 };
const json = JSON.stringify(user);
// Result: '{"name":"John","age":25}'
```

**JSON → JavaScript (parse):**
```javascript
const json = '{"name":"John","age":25}';
const user = JSON.parse(json);
// Result: { name: 'John', age: 25 }
```

---

## Common JSON Mistakes

### Mistake 1: Trailing Commas

```json
// ❌ WRONG - Trailing comma
{
  "name": "John",
  "age": 25,
}

// ✅ CORRECT - No trailing comma
{
  "name": "John",
  "age": 25
}
```

**Why it matters:** Parsers will reject the entire JSON.

### Mistake 2: Single Quotes

```json
// ❌ WRONG - Single quotes
{
  'name': 'John',
  'age': 25
}

// ✅ CORRECT - Double quotes
{
  "name": "John",
  "age": 25
}
```

### Mistake 3: Unquoted Keys

```json
// ❌ WRONG - Unquoted keys
{
  name: "John",
  age: 25
}

// ✅ CORRECT - Quoted keys
{
  "name": "John",
  "age": 25
}
```

### Mistake 4: Using Undefined

```json
// ❌ WRONG - undefined doesn't exist in JSON
{
  "name": "John",
  "age": undefined
}

// ✅ CORRECT - Use null instead
{
  "name": "John",
  "age": null
}
```

### Mistake 5: Comments

```json
// ❌ WRONG - Comments not allowed
{
  "name": "John",  // User's first name
  "age": 25
}

// ✅ CORRECT - No comments
{
  "name": "John",
  "age": 25
}
```

### Mistake 6: Missing Quotes on Strings

```json
// ❌ WRONG - Missing quotes
{
  "status": active
}

// ✅ CORRECT - Quotes on strings
{
  "status": "active"
}
```

### Mistake 7: Wrong Boolean Capitalization

```json
// ❌ WRONG - Capitalized
{
  "active": True
}

// ✅ CORRECT - Lowercase
{
  "active": true
}
```

---

## JSON in Web APIs

### How APIs Use JSON

APIs send and receive data using JSON:

```
┌─────────────────────────────────────────────────────────────┐
│                     API REQUEST/RESPONSE                    │
└─────────────────────────────────────────────────────────────┘

Client                          Server
  │                               │
  │  POST /auth/register          │
  │  Content-Type: application/json
  │  {                            │
  │    "username": "john_doe",    │
  │    "email": "john@example.com",│
  │    "password": "securePass123"│
  │  }                            │
  ├──────────────────────────────▶│
  │                               │
  │                          Process request
  │                          Save to database
  │                               │
  │  HTTP 201 Created             │
  │  Content-Type: application/json
  │◀──────────────────────────────┤
  │  {                            │
  │    "success": true,           │
  │    "data": {                  │
  │      "user": {                │
  │        "id": 1,               │
  │        "username": "john_doe",│
  │        "email": "john@example.com"│
  │      },                       │
  │      "token": "eyJhbGc..."    │
  │    }                          │
  │  }                            │
  │                               │
```

### Request JSON (Client → Server)

**Example: User registration**

```bash
POST /auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**In our code:**
```typescript
// TypeScript interface matches JSON structure
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Express automatically parses JSON
app.post('/auth/register', (request, response) => {
  const { username, email, password }: RegisterRequest = request.body;
  // request.body contains parsed JSON object
});
```

### Response JSON (Server → Client)

**Example: Success response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  },
  "message": "User registered successfully",
  "timestamp": "2025-09-30T10:30:00.000Z"
}
```

**Example: Error response**

```json
{
  "success": false,
  "message": "Validation failed: Name is required",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-09-30T10:30:00.000Z",
  "details": {
    "field": "name",
    "error": "Name must be between 1 and 100 characters"
  }
}
```

### Content-Type Header

APIs must specify they're sending/receiving JSON:

```
Content-Type: application/json
```

**Without this header:**
- Server won't parse request body as JSON
- Client won't interpret response as JSON
- Errors will occur!

### JSON in This Project

**All our endpoints use JSON:**

```bash
# GET request - JSON response
curl http://localhost:8000/health
# Response: {"success":true,"message":"Server is running","timestamp":"..."}

# POST request - JSON request and response
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"john_doe","email":"john@example.com","password":"securePass123"}'
# Response: {"success":true,"message":"User registered successfully","data":{...}}
```

---

## Working with JSON

### Reading JSON

**In browser:**
```javascript
fetch('http://localhost:8000/health')
  .then(response => response.json())  // Parse JSON
  .then(data => {
    console.log(data.success);  // Access properties
    console.log(data.message);
  });
```

**In Postman:**
1. Send request
2. View "Body" tab in response
3. Postman automatically formats JSON
4. Click through nested objects

**In cURL:**
```bash
curl http://localhost:8000/health | jq
# jq formats JSON nicely (requires jq installation)
```

### Writing JSON

**Creating JSON manually:**
```json
{
  "name": "John",
  "message": "Hello"
}
```

**In JavaScript:**
```javascript
// Create object
const data = {
  name: "John",
  message: "Hello"
};

// Convert to JSON string
const jsonString = JSON.stringify(data);
// Result: '{"name":"John","message":"Hello"}'

// Pretty print (with indentation)
const prettyJson = JSON.stringify(data, null, 2);
// Result:
// {
//   "name": "John",
//   "message": "Hello"
// }
```

**In TypeScript (our project):**
```typescript
// Type-safe JSON creation
interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

const requestData: RegisterRequest = {
  username: "john_doe",
  email: "john@example.com",
  password: "securePass123"
};

// TypeScript ensures structure matches interface
// JSON.stringify converts to JSON string
const jsonString = JSON.stringify(requestData);
```

### Nested JSON

**Accessing nested values:**

```json
{
  "user": {
    "name": "John",
    "address": {
      "city": "Tacoma",
      "state": "WA"
    }
  }
}
```

**JavaScript access:**
```javascript
const data = JSON.parse(jsonString);

console.log(data.user.name);           // "John"
console.log(data.user.address.city);   // "Tacoma"

// Safe access (if property might not exist)
console.log(data.user?.phone);         // undefined (no error)
```

### Arrays in JSON

**Working with arrays:**

```json
{
  "users": [
    {"name": "John", "age": 25},
    {"name": "Jane", "age": 30}
  ]
}
```

**JavaScript access:**
```javascript
const data = JSON.parse(jsonString);

// Access by index
console.log(data.users[0].name);  // "John"

// Loop through array
data.users.forEach(user => {
  console.log(user.name);
});

// Map to new array
const names = data.users.map(user => user.name);
// Result: ["John", "Jane"]
```

---

## Validation and Tools

### Online JSON Validators

**Test if your JSON is valid:**

- [JSONLint](https://jsonlint.com/) - Validates and formats JSON
- [JSON Editor Online](https://jsoneditoronline.org/) - Visual editor
- [JSONPath Online Evaluator](https://jsonpath.com/) - Test queries

**How to use:**
1. Copy your JSON
2. Paste into validator
3. Click "Validate JSON"
4. See errors or confirmation

### Common Validation Errors

**Error: Unexpected token**
```json
{
  "name": "John",  // ← Trailing comma
}
// Error: Unexpected token }
```

**Error: Unexpected string**
```json
{
  name: "John"  // ← Missing quotes on key
}
// Error: Unexpected string
```

**Error: Unexpected end of JSON input**
```json
{
  "name": "John"
  // ← Missing closing brace
// Error: Unexpected end of JSON input
```

### Browser DevTools

**Chrome/Firefox:**
1. Open DevTools (F12)
2. Go to "Network" tab
3. Make API request
4. Click request
5. View "Response" tab
6. JSON is formatted automatically

**Console:**
```javascript
// Test JSON parsing
const json = '{"name":"John","age":25}';
console.log(JSON.parse(json));

// Pretty print object
console.log(data);  // Browser formats nicely
```

### VS Code / WebStorm

**Both IDEs have built-in JSON support:**

- ✅ Syntax highlighting
- ✅ Error detection (red squiggles)
- ✅ Auto-formatting (Format Document)
- ✅ Bracket matching
- ✅ IntelliSense/code completion

**Format JSON in editor:**
- VS Code: `Shift+Alt+F` (Windows) or `Shift+Option+F` (Mac)
- WebStorm: `Ctrl+Alt+L` (Windows) or `Cmd+Option+L` (Mac)

### API Testing Tools

**Postman:**
- Automatically validates JSON
- Highlights errors
- Formats responses
- Saves requests

**Swagger UI (This Project):**
- http://localhost:8000/api-docs
- Pre-built JSON examples
- Interactive testing
- No manual JSON writing needed!

---

## Practice Exercises

### Exercise 1: Create Valid JSON

**Task:** Represent this data as JSON:
- Student name: Alice Johnson
- Age: 22
- Courses: TCSS 460, TCSS 450, TCSS 480
- GPA: 3.8
- Active: yes

**Solution:**
```json
{
  "name": "Alice Johnson",
  "age": 22,
  "courses": ["TCSS 460", "TCSS 450", "TCSS 480"],
  "gpa": 3.8,
  "active": true
}
```

### Exercise 2: Fix Invalid JSON

**Task:** Fix the errors in this JSON:

```json
{
  'name': 'John',
  age: 25,
  active: True,
  courses: ['TCSS 460', 'TCSS 450',],
  metadata: undefined
}
```

**Solution:**
```json
{
  "name": "John",
  "age": 25,
  "active": true,
  "courses": ["TCSS 460", "TCSS 450"],
  "metadata": null
}
```

**Errors fixed:**
1. Changed single quotes to double quotes
2. Quoted the keys
3. Lowercased `true`
4. Changed double quotes in array to double quotes
5. Removed trailing comma
6. Changed `undefined` to `null`

### Exercise 3: Test with API

**Task:** Send this JSON to the API:

```json
{
  "username": "your_username",
  "email": "you@example.com",
  "password": "testPassword123"
}
```

**Steps:**
1. Start server: `npm run dev`
2. Open: http://localhost:8000/api-docs
3. Find `POST /auth/register`
4. Click "Try it out"
5. Paste JSON above
6. Click "Execute"
7. See JSON response!

---

## JSON Best Practices

### 1. Use Consistent Naming

**Choose a convention and stick to it:**

```json
// ✅ camelCase (recommended for JavaScript/TypeScript)
{
  "firstName": "John",
  "lastName": "Doe",
  "emailAddress": "john@example.com"
}

// ✅ snake_case (common in other languages)
{
  "first_name": "John",
  "last_name": "Doe",
  "email_address": "john@example.com"
}

// ❌ Mixed (inconsistent)
{
  "firstName": "John",
  "last_name": "Doe",
  "email-address": "john@example.com"
}
```

### 2. Keep Structure Flat When Possible

```json
// ❌ Too nested (harder to access)
{
  "user": {
    "personal": {
      "name": {
        "first": "John",
        "last": "Doe"
      }
    }
  }
}

// ✅ Flatter (easier to work with)
{
  "firstName": "John",
  "lastName": "Doe"
}
```

### 3. Use Arrays for Lists

```json
// ❌ Numbered properties
{
  "student1": "John",
  "student2": "Jane",
  "student3": "Bob"
}

// ✅ Array
{
  "students": ["John", "Jane", "Bob"]
}
```

### 4. Include Metadata in Responses

```json
// ✅ Good API response
{
  "success": true,
  "data": {
    "name": "John"
  },
  "timestamp": "2025-09-30T10:30:00.000Z",
  "version": "1.0.0"
}
```

### 5. Handle Null Appropriately

```json
// ✅ Use null for missing optional data
{
  "name": "John",
  "middleName": null,
  "lastName": "Doe"
}

// ❌ Don't use empty strings for missing data
{
  "name": "John",
  "middleName": "",
  "lastName": "Doe"
}
```

---

## Further Reading

**Official Resources:**
- [JSON.org](https://www.json.org/) - Official JSON specification
- [MDN: Working with JSON](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Objects/JSON) - Mozilla guide

**Tools:**
- [JSONLint](https://jsonlint.com/) - Validate JSON
- [JSON Formatter](https://jsonformatter.org/) - Format and validate

**Related Guides:**
- [HTTP Fundamentals](./http-fundamentals.md) - How JSON travels over HTTP
- [Request-Response Model](./request-response-model.md) - JSON in request/response cycle
- [TypeScript Patterns](./typescript-patterns.md) - Type-safe JSON handling

**📚 Security Best Practices:** For comprehensive security guidance on handling JSON data, see [Web Security Guide](/docs/web-security-guide.md) and [Validation Strategies](/docs/validation-strategies.md).

---

*Understanding JSON is fundamental to working with modern web APIs. Every endpoint in this project sends and receives JSON data. Master JSON, and you'll be able to work with any web API!*
