# Password Security Guide for TCSS-460-auth-squared

## Table of Contents
1. [Introduction: Why Password Security Matters](#introduction)
2. [Password Hashing Fundamentals](#hashing-fundamentals)
3. [Salt Generation and Storage](#salt-generation)
4. [SHA256 Implementation](#sha256-implementation)
5. [Timing-Safe Password Comparison](#timing-safe-comparison)
6. [Password Validation Rules](#password-validation)
7. [Database Storage Architecture](#database-storage)
8. [Password Reset Workflow](#password-reset)
9. [Common Vulnerabilities and Threats](#vulnerabilities)
10. [Best Practices and Defense in Depth](#best-practices)
11. [Code Examples from Implementation](#code-examples)
12. [Real-World Analogies](#analogies)

---

## 1. Introduction: Why Password Security Matters {#introduction}

### The Stakes

Passwords are the primary authentication mechanism for most web applications. A single password breach can lead to:

- **Account Takeover**: Attackers gain full access to user accounts
- **Data Exfiltration**: Sensitive user data can be stolen
- **Lateral Attacks**: Users who reuse passwords across services face cascading breaches
- **Reputation Damage**: Organizations lose user trust after security incidents
- **Legal Liability**: GDPR, CCPA, and other regulations impose penalties for inadequate security

### Historical Context

Major password breaches illustrate the importance of proper password security:

- **LinkedIn (2012)**: 6.5 million SHA-1 hashed passwords leaked **without salts** - easily cracked
- **Adobe (2013)**: 150 million passwords encrypted with ECB mode (not hashed) - fundamentally broken
- **Yahoo (2014)**: 3 billion accounts compromised due to weak hashing
- **LastPass (2022)**: Despite proper bcrypt hashing, vault backups were stolen

**Key Lesson**: Even if your database is breached, proper password security can prevent attackers from obtaining plaintext passwords.

### Threat Model

Who are we defending against?

1. **External Attackers**: Attempting to breach the database and crack passwords offline
2. **Insider Threats**: Malicious employees with database access
3. **Network Eavesdroppers**: Attempting to intercept passwords in transit (mitigated by HTTPS)
4. **Timing Attack Specialists**: Exploiting subtle timing differences to extract information

This guide focuses on **defense in depth**: multiple layers of security so that if one layer fails, others still protect user passwords.

---

## 2. Password Hashing Fundamentals {#hashing-fundamentals}

### What is Hashing?

A **cryptographic hash function** is a one-way mathematical function that converts input data (like a password) into a fixed-size output (the hash). Key properties:

```
H(password) → hash
```

**One-way**: Given `H(password) = hash`, it's computationally infeasible to find `password`
**Deterministic**: Same input always produces same output
**Avalanche Effect**: Tiny input change completely changes output
**Fixed Size**: Output length is constant regardless of input length

### Why Not Store Plaintext Passwords?

**NEVER store plaintext passwords.** This is a cardinal sin of security.

**Problem**: If the database is breached, attackers immediately have all user passwords.

```sql
-- NEVER DO THIS
CREATE TABLE users (
    username VARCHAR(50),
    password VARCHAR(128)  -- ❌ PLAINTEXT PASSWORD
);
```

**Real-World Analogy**: Storing plaintext passwords is like a bank keeping everyone's vault combination written on a sticky note next to the vault. If a thief breaks into the bank, they instantly have access to everything.

### Why Not Encrypt Passwords?

**Encryption is reversible** - if you have the decryption key, you can recover the original password.

**Problem**:
- Keys must be stored somewhere in the application
- If an attacker gains access to the database, they likely have access to the application code/environment
- Encryption is meant for data that needs to be decrypted later (like credit cards for processing)

**Passwords should NEVER be decrypted** because you only need to verify them, not recover them.

### Hash Function Properties for Passwords

Not all hash functions are suitable for passwords:

| Hash Function | Suitable for Passwords? | Why/Why Not |
|---------------|-------------------------|-------------|
| MD5 | ❌ No | Cryptographically broken, too fast |
| SHA-1 | ❌ No | Collision attacks exist, too fast |
| SHA-256 | ⚠️ Acceptable | Fast general-purpose hash, needs salting |
| bcrypt | ✅ Yes | Deliberately slow, built-in salt |
| Argon2 | ✅ Yes | Modern, memory-hard, resistant to GPU attacks |
| PBKDF2 | ✅ Yes | Deliberately slow via iterations |

### Why "Fast" is Bad for Passwords

For file integrity and digital signatures, fast hashing (SHA-256) is ideal. For passwords, **fast hashing is a vulnerability**.

**Attack Scenario**: Attacker steals your database containing password hashes.

With SHA-256 (no iterations):
- Modern GPU can compute **1 billion+ SHA-256 hashes per second**
- Common passwords cracked in seconds
- 8-character alphanumeric passwords: ~218 trillion combinations ÷ 1 billion/sec = ~2.5 days

With bcrypt (work factor 12):
- Same GPU computes ~10,000 hashes per second
- Same 8-character password: ~218 trillion combinations ÷ 10,000/sec = ~692 years

**Our Implementation Choice**: TCSS-460-auth-squared uses SHA-256 with unique salts per user as an educational example. In production, you should use bcrypt, Argon2, or PBKDF2.

---

## 3. Salt Generation and Why Unique Salts Per User {#salt-generation}

### What is a Salt?

A **salt** is random data added to the password before hashing:

```
hash = H(password + salt)
```

The salt is stored alongside the hash in the database:

```sql
CREATE TABLE Account_Credential (
    credential_id INT PRIMARY KEY,
    account_id INT,
    salted_hash CHAR(64),  -- SHA-256 hash of (password + salt)
    salt CHAR(32),         -- Random salt, unique per user
    -- other fields...
);
```

**Critical Point**: The salt is **not secret**. It's stored in plaintext in the database. Its purpose is not to hide information but to **prevent precomputation attacks**.

### Why Salts Matter: Rainbow Table Attacks

**Precomputation Attack**: An attack where the attacker does the expensive computational work **ahead of time** (before stealing the database), creating a massive lookup table. When they steal password hashes, they simply look them up instead of computing them - turning hours of computation into milliseconds of lookup.

**Rainbow Table Attack**: A specific type of precomputation attack that uses a space-time tradeoff technique. Instead of storing every possible password-hash pair (which would require petabytes), rainbow tables use "chains" of hashes to reduce storage while still enabling fast password recovery. A rainbow table is essentially a compressed precomputed lookup table.

**Without Salt** - Vulnerable to Rainbow Tables:

A **rainbow table** is a precomputed lookup table of password hashes. Here's a small example (real rainbow tables have billions of entries):

```
password123 → ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
admin       → 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
letmein     → 1c8bfe8f801d79745c4631d09fff36c82aa37fc4cce4fc946683d7b336b63032
qwerty      → 65e84be33532fb784c48129675f9eff3a682b27168c0ea744b2cf58ee02337c5
trustno1    → be12ae803fcb2d017e25d99ecbd140e1d02c0f35b2a865db9e7dd3df2d30ca00
123456      → 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
monkey      → 23f8e84a1d7c6b7d8a4f5e6c9d8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b
dragon      → 71ab8e7c3d9f2e5a4b8c6d7e9f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a
baseball    → 4e8a9f2b6d3c7e1f5a8d9c2e4b7f1a3d6e9c2f5b8a1d4e7c0f3a6d9e2b5c8f1a
```

**Note**: Each different password produces a completely different hash. That's how hash functions work - even a tiny change in input produces a completely different output.

**Attack Process**:
1. Attacker steals database with unsalted SHA-256 hashes
2. Attacker downloads rainbow table (terabytes of precomputed hashes for common passwords)
3. Attacker looks up each hash in the rainbow table
4. Millions of passwords cracked instantly via **lookup, not computation**

**Example**: If a stolen database contains hash `8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92`, the attacker looks it up in the rainbow table and instantly finds the password is `123456` - no computation needed!

**With Salt** - Rainbow Tables Useless:

User A (salt: `a3f9d8e7`):
```
password123 + a3f9d8e7 → 1e4d9c2a5b6f8e3a7d9c4b2e5f8a1d3c6e9b2a5d8e4f7c1a3d6b9e2f5c8a1d4e
```

User B (salt: `7b2e4c1f`):
```
password123 + 7b2e4c1f → 9f2e5c8b1d4a7e3c6f9b2e5a8d1c4f7e2b5a8d1e4c7f2a5d8e1b4c7f2e5a8d1c
```

**Same password, different hashes!**

The attacker now needs to recompute the entire rainbow table for **each unique salt**. With millions of users and unique salts, this becomes computationally infeasible.

### Why Unique Salts Per User?

⚠️ **Security Warning**: Never reuse the same salt across multiple users.

**Bad Practice** - Global Salt:
```typescript
const GLOBAL_SALT = "my_app_salt_2024";  // ❌ WRONG

function hashPassword(password: string): string {
    return crypto.createHash('sha256')
        .update(password + GLOBAL_SALT)
        .digest('hex');
}
```

**Problem**: If two users have the same password, they'll have the same hash:
```
User A: password123 + my_app_salt_2024 → hash_X
User B: password123 + my_app_salt_2024 → hash_X  // Same hash!
```

**Attack Vector**:
1. Attacker identifies duplicate hashes in your database
2. Attacker knows these users share the same password
3. Attacker cracks one hash → instantly cracks all users with that password
4. Attacker can build a **custom rainbow table** for your global salt

**Best Practice** - Unique Salt Per User:
```typescript
function generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');  // 32 hex characters
}

function hashPassword(password: string, salt: string): string {
    return crypto.createHash('sha256')
        .update(password + salt)
        .digest('hex');
}

// For new user registration
const salt = generateSalt();           // Unique random salt
const hash = hashPassword(password, salt);
// Store both salt and hash in database
```

**Result**: Even if two users have the same password, their hashes are completely different due to unique salts.

### Salt Generation Best Practices

1. **Cryptographically Secure Randomness**: Use `crypto.randomBytes()`, not `Math.random()`
   ```typescript
   // ✅ GOOD - Cryptographically secure
   const salt = crypto.randomBytes(16).toString('hex');

   // ❌ BAD - Predictable, not secure
   const salt = Math.random().toString(36).substring(2);
   ```

2. **Sufficient Length**: Minimum 16 bytes (128 bits) of entropy
   - 16 bytes = 2^128 possible salts
   - More salts than atoms in the observable universe

3. **Generate Once**: Create salt during user registration, reuse the same salt for that user's password verifications

4. **Store in Plaintext**: The salt is not secret - store it directly in the database alongside the hash

---

## 4. SHA256 Implementation in This Project {#sha256-implementation}

### SHA-256 Overview

**SHA-256** (Secure Hash Algorithm 256-bit) is part of the SHA-2 family designed by the NSA and published by NIST in 2001.

**Properties**:
- Output: 256 bits (64 hexadecimal characters)
- Collision-resistant (no practical collisions found)
- Avalanche effect: Changing 1 bit changes ~50% of output bits
- Fast: Can compute millions of hashes per second

**Why We Use It**: Educational simplicity and availability in Node.js crypto module. In production, prefer bcrypt or Argon2.

### Implementation in passwordUtils.ts

**File**: `src/core/utilities/passwordUtils.ts`

#### 1. Salt Generation

```typescript
import crypto from 'crypto';

/**
 * Generates a cryptographically secure random salt
 * @returns 32-character hexadecimal salt (16 bytes of randomness)
 */
export function generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
}
```

**How it works**:
- `crypto.randomBytes(16)`: Generates 16 bytes (128 bits) of cryptographically secure random data
- `.toString('hex')`: Converts binary data to 32-character hexadecimal string
- Each call produces a different, unpredictable salt

**Example Output**:
```
a3f9d8e7c2b5a1e4d9f7c3b8e2a5d1f6
7b2e4c1f9d6a3e8b5c2f7a1d4e9b3c6f
e9c4b2a7d5e1f8c3a6d9b2e5f1c8a4d7
```

#### 2. Password Hashing

```typescript
/**
 * Hashes a password with a salt using SHA-256
 * @param password - Plain text password
 * @param salt - Cryptographic salt (from generateSalt())
 * @returns 64-character hexadecimal hash
 */
export function hashPassword(password: string, salt: string): string {
    return crypto
        .createHash('sha256')
        .update(password + salt)
        .digest('hex');
}
```

**How it works**:
1. `crypto.createHash('sha256')`: Creates a SHA-256 hash object
2. `.update(password + salt)`: Concatenates password and salt, feeds to hash function
3. `.digest('hex')`: Finalizes hash, outputs as 64-character hex string

**Example**:
```typescript
const password = "SecurePass123!";
const salt = "a3f9d8e7c2b5a1e4d9f7c3b8e2a5d1f6";

const hash = hashPassword(password, salt);
// Result: "8f4d2a1e9b7c3f6d8a2e5b9f1c4d7a3e6b8f2a5d9c1e4f7a2d5b8e1c4f7a2d5b"
```

**Same password, different salt**:
```typescript
const salt2 = "7b2e4c1f9d6a3e8b5c2f7a1d4e9b3c6f";
const hash2 = hashPassword(password, salt2);
// Result: "2e9c5a7d1f4b8e3a6c9f2d5b8e1a4d7c3f6b9e2a5d8c1f4e7a3d6b9c2e5f8a1d"
// Completely different hash!
```

#### 3. Password Verification

```typescript
/**
 * Verifies a password against stored hash and salt
 * Uses timing-safe comparison to prevent timing attacks
 * @param password - Plain text password to verify
 * @param storedHash - Hash from database
 * @param storedSalt - Salt from database
 * @returns true if password matches, false otherwise
 */
export function verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string
): boolean {
    const hash = hashPassword(password, storedSalt);

    // Convert hex strings to buffers for timing-safe comparison
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    // Timing-safe comparison prevents timing attacks
    return crypto.timingSafeEqual(hashBuffer, storedHashBuffer);
}
```

**Verification Flow**:
1. User submits password during login
2. Retrieve stored hash and salt from database for that user
3. Hash the submitted password with the stored salt
4. Compare the newly computed hash with the stored hash using timing-safe comparison
5. If they match, password is correct

**Why Not Simple String Comparison?**

```typescript
// ❌ VULNERABLE TO TIMING ATTACKS
if (hash === storedHash) {
    return true;
}
```

See next section on timing-safe comparison for details.

### SHA-256 Limitations for Passwords

While SHA-256 is cryptographically secure, it has limitations for password hashing:

1. **Too Fast**: GPUs can compute billions of SHA-256 hashes per second
2. **No Built-in Work Factor**: Can't increase computational cost as hardware improves
3. **Requires Manual Salting**: Must implement salt generation and storage yourself

**Better Alternatives for Production**:

```typescript
// bcrypt (recommended for production)
import bcrypt from 'bcrypt';

const saltRounds = 12;  // Work factor - higher = slower, more secure
const hash = await bcrypt.hash(password, saltRounds);
// bcrypt automatically generates and includes salt in hash

const isValid = await bcrypt.compare(password, hash);
```

---

## 5. Timing-Safe Password Comparison {#timing-safe-comparison}

### The Timing Attack Vulnerability

**String comparison in most programming languages is vulnerable to timing attacks.**

#### How String Comparison Works

Standard string comparison (`===` in JavaScript) often uses **short-circuit evaluation**:

```typescript
function compareStrings(str1: string, str2: string): boolean {
    if (str1.length !== str2.length) return false;

    for (let i = 0; i < str1.length; i++) {
        if (str1[i] !== str2[i]) {
            return false;  // ⚠️ Returns early on first mismatch
        }
    }
    return true;
}
```

**The Problem**: The function returns faster when characters mismatch early.

#### Timing Attack Demonstration

Attacker attempts to guess password hash character by character:

```
Stored hash: 8f4d2a1e9b7c3f6d8a2e5b9f1c4d7a3e6b8f2a5d9c1e4f7a2d5b8e1c4f7a2d5b

Guess 1: 0000000000000000000000000000000000000000000000000000000000000000
         ↑ First character mismatch
Time: 50 nanoseconds (returned immediately)

Guess 2: 1000000000000000000000000000000000000000000000000000000000000000
         ↑ First character mismatch
Time: 50 nanoseconds

Guess 3: 8000000000000000000000000000000000000000000000000000000000000000
         ✓↓ First character matches! Second character mismatch
Time: 52 nanoseconds (2ns slower - compared more characters)
```

**Attack Strategy**:
1. Attacker measures response times for different hash guesses
2. Finds the first character that takes slightly longer → first character is correct
3. Repeats process for second character, third character, etc.
4. Extracts entire hash one character at a time

**Real-World Feasibility**:
- With network jitter, this attack is difficult remotely
- In local or server-side scenarios (insider threat), highly effective
- Statistical analysis over many attempts can overcome noise

### Timing-Safe Comparison with crypto.timingSafeEqual

**Solution**: Use constant-time comparison that always takes the same time regardless of where strings differ.

```typescript
import crypto from 'crypto';

function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
    const hash = hashPassword(password, storedSalt);

    // Convert to buffers
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    // ✅ TIMING-SAFE COMPARISON
    try {
        return crypto.timingSafeEqual(hashBuffer, storedHashBuffer);
    } catch (error) {
        // timingSafeEqual throws if buffer lengths differ
        return false;
    }
}
```

### How crypto.timingSafeEqual Works

**Constant-Time Algorithm**:
```typescript
// Pseudocode for constant-time comparison
function timingSafeEqual(buf1: Buffer, buf2: Buffer): boolean {
    if (buf1.length !== buf2.length) {
        throw new Error('Input buffers must have the same length');
    }

    let result = 0;

    // Always compares ALL bytes, even after mismatch found
    for (let i = 0; i < buf1.length; i++) {
        result |= buf1[i] ^ buf2[i];  // XOR and accumulate
    }

    return result === 0;  // All bytes matched only if result is 0
}
```

**Key Properties**:
1. **Always examines all bytes**: No early return on mismatch
2. **Constant time**: Takes same time whether first byte differs or last byte differs
3. **Uses bitwise operations**: XOR (^) and OR (|) have predictable timing
4. **No branching based on data**: No if statements that depend on byte values

**Timing Comparison**:

| Comparison Type | First Char Mismatch | Middle Char Mismatch | Last Char Mismatch |
|----------------|---------------------|----------------------|-------------------|
| Standard (===) | 50ns | 500ns | 1000ns |
| timingSafeEqual | 1000ns | 1000ns | 1000ns |

Attacker **cannot extract information from timing** because all comparisons take the same time.

### Why Buffer Conversion?

```typescript
const hashBuffer = Buffer.from(hash, 'hex');
const storedHashBuffer = Buffer.from(storedHash, 'hex');
```

**Reason**: `crypto.timingSafeEqual` requires `Buffer` objects, not strings.

- Buffers provide fixed-size byte arrays
- Ensures exact length comparison
- Prevents encoding issues (UTF-8 vs ASCII)

### Error Handling

```typescript
try {
    return crypto.timingSafeEqual(hashBuffer, storedHashBuffer);
} catch (error) {
    // timingSafeEqual throws if buffer lengths differ
    return false;
}
```

**Why try-catch?**

`timingSafeEqual` throws an error if buffer lengths don't match (this is intentional to prevent timing leaks from length comparison). We catch this and return `false` (password doesn't match).

⚠️ **Security Warning**: Never log or expose the actual error to the user - this could leak information about the expected hash length.

---

## 6. Password Validation Rules {#password-validation}

### Validation Requirements

TCSS-460-auth-squared enforces the following password constraints:

```typescript
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

function validatePassword(password: string): { valid: boolean; error?: string } {
    if (!password) {
        return { valid: false, error: 'Password is required' };
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return {
            valid: false,
            error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
        };
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
        return {
            valid: false,
            error: `Password must not exceed ${MAX_PASSWORD_LENGTH} characters`
        };
    }

    return { valid: true };
}
```

### Why These Limits?

#### Minimum Length: 8 Characters

**Security Rationale**: Password entropy increases exponentially with length.

**Entropy Calculation**:
- Character set: 62 characters (a-z, A-Z, 0-9) - ignoring special chars for conservative estimate
- 6-character password: 62^6 = ~56 billion combinations
- 8-character password: 62^8 = ~218 trillion combinations
- 10-character password: 62^10 = ~839 quadrillion combinations

**Brute Force Timing** (assuming 1 billion guesses/sec):
- 6 characters: ~56 seconds
- 8 characters: ~2.5 days
- 10 characters: ~26 years

**Modern Recommendations**: NIST now recommends minimum 8 characters, with many experts advocating for 12+.

**Balancing Act**:
- Longer = more secure
- Too long = users forget, write down passwords, or reuse
- 8 characters is a reasonable minimum for user friction vs. security

#### Maximum Length: 128 Characters

**Why have a maximum at all?**

1. **Denial of Service Prevention**:
   ```typescript
   // Attacker sends 100MB password
   const attackPassword = 'a'.repeat(100_000_000);
   hashPassword(attackPassword, salt);  // Could consume excessive CPU/memory
   ```

2. **Bcrypt Limitation**: bcrypt (production-grade password hashing) has a 72-byte limit due to its algorithm design

3. **Database Storage**: Fixed-size columns for hashes mean extremely long passwords offer no additional security (hash is always 64 characters)

4. **Practical Usability**: No human can remember or type a 128-character password - if users need that, they should use a password manager

**128 Character Rationale**:
- Accommodates passphrases: "The quick brown fox jumps over the lazy dog near the riverbank" = 66 chars
- Allows generated passwords from password managers
- Well above practical human-memorable limits
- Still prevents DoS attacks

### What We Don't Validate (and Why)

Many password policies require:
- At least one uppercase letter
- At least one number
- At least one special character
- No dictionary words
- Must change every 90 days

**Modern Security Consensus**: These rules are counterproductive!

#### Composition Rules Reduce Security

**NIST SP 800-63B (2017) Guidance**: Composition rules should not be enforced.

**Why?**
1. **Predictable Patterns**: Users follow predictable patterns: `Password1!`, `Welcome2@`, `Company2024!`
2. **Reduced Entropy**: Forcing patterns actually reduces the password space attackers need to search
3. **User Frustration**: Users forget complex passwords and end up writing them down

**Better Approach**: Encourage longer passwords over complex ones.

```
"this is my secure passphrase for banking" (44 chars, all lowercase)
Entropy: ~206 bits (assuming 26 chars, 44 length)

"P@ssw0rd!" (9 chars, meets all composition rules)
Entropy: ~52 bits (assuming 95 chars, 9 length)
```

The passphrase is exponentially more secure despite being "simple."

#### Password Expiration Harms Security

**Traditional Policy**: Force password changes every 90 days

**Problems**:
1. Users increment predictably: `Password1!` → `Password2!` → `Password3!`
2. Encourages password reuse across systems
3. Users forget new passwords → more password resets → social engineering attacks
4. No evidence that forced rotation prevents breaches

**NIST Recommendation**: Only force password changes if breach is suspected.

### What We Should Check: Compromised Passwords

**Best Practice**: Check passwords against known breach databases.

```typescript
import { pwnedPassword } from 'hibp';  // Have I Been Pwned API

async function validatePassword(password: string): Promise<{ valid: boolean; error?: string }> {
    // Length checks...

    // Check against breach database
    const pwnedCount = await pwnedPassword(password);
    if (pwnedCount > 0) {
        return {
            valid: false,
            error: `This password has appeared in ${pwnedCount} data breaches. Please choose a different password.`
        };
    }

    return { valid: true };
}
```

**How it works**:
1. Hashes password with SHA-1
2. Sends first 5 characters of hash to Have I Been Pwned API (k-anonymity)
3. Receives list of hash suffixes for passwords with that prefix
4. Checks locally if full hash matches any breached password
5. **Privacy preserved**: Full password never sent to API

---

## 7. Database Storage Architecture {#database-storage}

### Account_Credential Table Schema

**File**: Database schema (PostgreSQL)

```sql
CREATE TABLE Account_Credential (
    credential_id SERIAL PRIMARY KEY,
    account_id INTEGER NOT NULL,
    salted_hash CHAR(64) NOT NULL,  -- SHA-256 hash (fixed 64 hex chars)
    salt CHAR(32) NOT NULL,          -- Random salt (32 hex chars)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (account_id) REFERENCES Account(account_id) ON DELETE CASCADE,
    UNIQUE(account_id)  -- One credential per account
);
```

### Column Breakdown

#### credential_id (SERIAL PRIMARY KEY)
- Unique identifier for each credential record
- Auto-incremented
- Used for internal database relationships

#### account_id (INTEGER, FOREIGN KEY)
- Links credential to specific user account
- Foreign key to `Account` table
- `ON DELETE CASCADE`: If account deleted, credential automatically deleted
- `UNIQUE` constraint: Each account can only have one active credential

#### salted_hash (CHAR(64))
- Stores SHA-256 hash of (password + salt)
- **Fixed length**: SHA-256 always produces 256 bits = 64 hexadecimal characters
- Example: `8f4d2a1e9b7c3f6d8a2e5b9f1c4d7a3e6b8f2a5d9c1e4f7a2d5b8e1c4f7a2d5b`

**Why CHAR(64) instead of VARCHAR(64)?**
- Fixed length → no length prefix overhead
- Slightly faster comparisons
- Hash is always exactly 64 characters

#### salt (CHAR(32))
- Stores random salt used to hash the password
- **Fixed length**: 16 bytes of randomness = 32 hexadecimal characters
- Example: `a3f9d8e7c2b5a1e4d9f7c3b8e2a5d1f6`
- **Stored in plaintext** - salt is not secret

**Why store salt separately?**
- Explicit schema makes salt's purpose clear
- Easier to query/audit salts
- Some hash functions (like bcrypt) embed salt in hash string - SHA-256 doesn't

#### created_at / updated_at (TIMESTAMP)
- `created_at`: When credential was first created (user registration)
- `updated_at`: When password was last changed
- Useful for:
  - Password age tracking (if implementing rotation)
  - Audit logs
  - Forensics after security incidents

### Data Flow Example

#### User Registration
```typescript
// authController.ts - registerUser()

async function registerUser(req: Request, res: Response) {
    const { email, password } = req.body;

    // 1. Validate password
    const validation = validatePassword(password);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }

    // 2. Create account in Account table
    const accountResult = await pool.query(
        'INSERT INTO Account (email) VALUES ($1) RETURNING account_id',
        [email]
    );
    const accountId = accountResult.rows[0].account_id;

    // 3. Generate salt and hash password
    const salt = generateSalt();
    const hash = hashPassword(password, salt);

    // 4. Store credential
    await pool.query(
        'INSERT INTO Account_Credential (account_id, salted_hash, salt) VALUES ($1, $2, $3)',
        [accountId, hash, salt]
    );

    res.status(201).json({ message: 'User registered successfully' });
}
```

**Database State After Registration**:

Account table:
```
account_id | email              | created_at
-----------+--------------------+-------------------------
1          | alice@example.com  | 2024-10-14 10:30:00
```

Account_Credential table:
```
credential_id | account_id | salted_hash                                                      | salt                              | created_at
--------------+------------+------------------------------------------------------------------+-----------------------------------+-------------------------
1             | 1          | 8f4d2a1e9b7c3f6d8a2e5b9f1c4d7a3e6b8f2a5d9c1e4f7a2d5b8e1c4f7a2d5b | a3f9d8e7c2b5a1e4d9f7c3b8e2a5d1f6 | 2024-10-14 10:30:00
```

#### User Login (Verification)
```typescript
// authController.ts - loginUser()

async function loginUser(req: Request, res: Response) {
    const { email, password } = req.body;

    // 1. Fetch account and credential
    const result = await pool.query(`
        SELECT a.account_id, ac.salted_hash, ac.salt
        FROM Account a
        JOIN Account_Credential ac ON a.account_id = ac.account_id
        WHERE a.email = $1
    `, [email]);

    if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { account_id, salted_hash, salt } = result.rows[0];

    // 2. Verify password
    const isValid = verifyPassword(password, salted_hash, salt);

    if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3. Generate JWT token, create session, etc.
    const token = generateJWT({ accountId: account_id });
    res.json({ token });
}
```

### Security Considerations

#### 1. Never Return Hashes or Salts in API Responses

```typescript
// ❌ DANGEROUS - Exposes hash and salt
app.get('/api/user/:id', async (req, res) => {
    const result = await pool.query(
        'SELECT a.*, ac.salted_hash, ac.salt FROM Account a JOIN Account_Credential ac ...',
        [req.params.id]
    );
    res.json(result.rows[0]);  // Sends hash and salt to client!
});

// ✅ SAFE - Only return non-sensitive data
app.get('/api/user/:id', async (req, res) => {
    const result = await pool.query(
        'SELECT account_id, email, created_at FROM Account WHERE account_id = $1',
        [req.params.id]
    );
    res.json(result.rows[0]);
});
```

#### 2. Use Parameterized Queries (Prevent SQL Injection)

```typescript
// ❌ VULNERABLE TO SQL INJECTION
const email = req.body.email;
const query = `SELECT * FROM Account WHERE email = '${email}'`;
await pool.query(query);
// Attacker input: alice@example.com' OR '1'='1

// ✅ SAFE - Parameterized query
await pool.query(
    'SELECT * FROM Account WHERE email = $1',
    [email]
);
```

#### 3. Database Encryption at Rest

While hashes protect passwords even if database is stolen, consider:

- **Full disk encryption**: Protects against physical theft of database servers
- **Transparent Data Encryption (TDE)**: Encrypts database files at storage level
- **Application-level encryption**: Encrypt sensitive PII (not passwords - they're already hashed)

**Defense in Depth**: Multiple layers ensure even if one fails, others protect data.

---

## 8. Password Reset Workflow and Security {#password-reset}

### The Password Reset Challenge

Password reset is one of the most vulnerable parts of authentication systems:

- User has **forgotten** their password (so can't authenticate normally)
- System must verify user's identity **without** password
- Must prevent attackers from resetting other users' passwords

### Secure Password Reset Flow

#### Step 1: User Requests Password Reset

**Endpoint**: `POST /api/auth/forgot-password`

```typescript
async function forgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    // 1. Look up user by email
    const result = await pool.query(
        'SELECT account_id FROM Account WHERE email = $1',
        [email]
    );

    // ⚠️ SECURITY: Always return same response regardless of whether email exists
    // Prevents email enumeration attacks
    if (result.rows.length === 0) {
        return res.json({
            message: 'If that email exists, a reset link has been sent'
        });
    }

    const accountId = result.rows[0].account_id;

    // 2. Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour

    // 3. Store reset token in database
    await pool.query(`
        INSERT INTO Password_Reset_Token (account_id, token_hash, expires_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (account_id) DO UPDATE
        SET token_hash = $2, expires_at = $3, created_at = CURRENT_TIMESTAMP
    `, [accountId, resetTokenHash, expiresAt]);

    // 4. Send reset email (token in URL, not hash)
    const resetUrl = `https://example.com/reset-password?token=${resetToken}`;
    await sendEmail(email, 'Password Reset', `Click here to reset: ${resetUrl}`);

    // Same response whether email exists or not
    res.json({ message: 'If that email exists, a reset link has been sent' });
}
```

**Password_Reset_Token Table Schema**:
```sql
CREATE TABLE Password_Reset_Token (
    account_id INTEGER PRIMARY KEY,
    token_hash CHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES Account(account_id) ON DELETE CASCADE
);
```

#### Step 2: User Clicks Reset Link and Submits New Password

**Endpoint**: `POST /api/auth/reset-password`

```typescript
async function resetPassword(req: Request, res: Response) {
    const { token, newPassword } = req.body;

    // 1. Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }

    // 2. Hash the submitted token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 3. Look up token in database
    const result = await pool.query(`
        SELECT account_id
        FROM Password_Reset_Token
        WHERE token_hash = $1 AND expires_at > CURRENT_TIMESTAMP
    `, [tokenHash]);

    if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const accountId = result.rows[0].account_id;

    // 4. Generate new salt and hash
    const salt = generateSalt();
    const hash = hashPassword(newPassword, salt);

    // 5. Update password in database (transaction)
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update credential
        await client.query(
            'UPDATE Account_Credential SET salted_hash = $1, salt = $2, updated_at = CURRENT_TIMESTAMP WHERE account_id = $3',
            [hash, salt, accountId]
        );

        // Delete used reset token (one-time use)
        await client.query(
            'DELETE FROM Password_Reset_Token WHERE account_id = $1',
            [accountId]
        );

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }

    res.json({ message: 'Password reset successfully' });
}
```

### Security Best Practices for Password Reset

#### 1. Email Enumeration Prevention

**Vulnerability**: Attacker tests if email addresses are registered.

```typescript
// ❌ BAD - Reveals if email exists
if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Email not found' });
} else {
    sendResetEmail(email);
    return res.json({ message: 'Reset email sent' });
}

// ✅ GOOD - Same response regardless
res.json({ message: 'If that email exists, a reset link has been sent' });
```

**Why it matters**: Attackers can build lists of registered emails for phishing campaigns.

#### 2. Cryptographically Secure Reset Tokens

```typescript
// ✅ GOOD - 32 bytes of randomness = 256 bits
const resetToken = crypto.randomBytes(32).toString('hex');

// ❌ BAD - Predictable
const resetToken = accountId + Date.now();

// ❌ BAD - Low entropy
const resetToken = Math.random().toString(36).substring(2);
```

**Token Requirements**:
- Minimum 128 bits of entropy (16 bytes)
- Unpredictable
- Single-use only
- Time-limited

#### 3. Hash Reset Tokens in Database

```typescript
// Generate token
const resetToken = crypto.randomBytes(32).toString('hex');

// Hash before storing
const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

// Store hash, not token
await pool.query(
    'INSERT INTO Password_Reset_Token (account_id, token_hash, ...) VALUES ($1, $2, ...)',
    [accountId, resetTokenHash]
);

// Send unhashed token in email
const resetUrl = `https://example.com/reset-password?token=${resetToken}`;
```

**Why hash?** If database is breached, attacker can't use stored tokens to reset passwords (they have hashes, not tokens).

#### 4. Token Expiration

```typescript
const expiresAt = new Date(Date.now() + 60 * 60 * 1000);  // 1 hour
```

**Recommended timeframes**:
- High security systems: 15-30 minutes
- Standard systems: 1 hour
- Low security systems: 24 hours

**Rationale**: Shorter window reduces time for attackers to intercept emails or guess tokens.

#### 5. One-Time Use Tokens

```typescript
// After successful password reset, delete token
await client.query(
    'DELETE FROM Password_Reset_Token WHERE account_id = $1',
    [accountId]
);
```

**Why?** Prevents token reuse if attacker intercepts the email.

#### 6. Invalidate All Sessions on Password Reset

```typescript
// After password reset
await pool.query(
    'DELETE FROM User_Session WHERE account_id = $1',
    [accountId]
);
```

**Why?** If attacker had compromised the account, password reset should evict them from all active sessions.

### Common Password Reset Vulnerabilities

#### 1. Token Leakage via Referrer Header

**Problem**: Reset token in URL can leak via HTTP Referer header if user clicks external links.

**Example**:
```
User visits: https://example.com/reset-password?token=abc123
User clicks external link to: https://malicious.com
Browser sends: Referer: https://example.com/reset-password?token=abc123
```

**Mitigation**:
```html
<!-- In password reset page -->
<meta name="referrer" content="no-referrer">
```

#### 2. Host Header Injection

**Problem**: Attacker manipulates Host header to send reset links to their own domain.

```http
POST /api/auth/forgot-password HTTP/1.1
Host: attacker.com
Content-Type: application/json

{"email": "victim@example.com"}
```

If app uses `req.headers.host` to build reset URL, victim receives:
```
https://attacker.com/reset-password?token=abc123
```

**Mitigation**:
```typescript
// ❌ VULNERABLE
const resetUrl = `https://${req.headers.host}/reset-password?token=${token}`;

// ✅ SAFE - Use hardcoded domain
const resetUrl = `https://example.com/reset-password?token=${token}`;
```

---

## 9. Common Vulnerabilities and Threats {#vulnerabilities}

### 1. Rainbow Table Attacks

**What**: Precomputed tables of password hashes for quick lookup.

**How it works**:
1. Attacker generates hashes for millions/billions of common passwords
2. Stores in efficient lookup structure (rainbow chain)
3. When database is breached, looks up hashes instantly

**Example**:
```
password123 → SHA256 → ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f
admin       → SHA256 → 8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918
```

**Defense**: Unique salts per user (see Section 3)

**Why it works**: Salts force attacker to recompute rainbow table for each user's unique salt - computationally infeasible.

### 2. Brute Force Attacks

**What**: Systematically trying every possible password combination.

**Online Brute Force** (against login endpoint):
```typescript
// Attacker script
for (const password of passwordList) {
    fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'victim@example.com', password })
    });
}
```

**Defense**:
- Rate limiting (max 5 login attempts per IP per minute)
- Account lockout (lock account after 10 failed attempts)
- CAPTCHA after failed attempts
- Monitor for credential stuffing patterns

**Offline Brute Force** (after database breach):
```python
# Attacker has stolen database with hashes and salts
for password in generate_passwords():
    hash = sha256(password + salt)
    if hash == stored_hash:
        print(f"Found password: {password}")
```

**Defense**:
- Slow hash functions (bcrypt, Argon2, PBKDF2)
- Strong password requirements (minimum length)
- Check against breach databases

### 3. Dictionary Attacks

**What**: Trying common passwords from a dictionary.

**Common password lists**:
- RockYou (32 million real-world passwords from 2009 breach)
- SecLists (collection of common passwords)
- Top 10,000 most common passwords

**Attack efficiency**:
```
Top 10 passwords cover ~5% of all users
Top 100 passwords cover ~10% of all users
Top 10,000 passwords cover ~25% of all users
```

**Defense**:
- Check passwords against Have I Been Pwned API
- Enforce minimum password length
- Educate users about password managers

### 4. Timing Attacks

**What**: Extracting information from how long operations take (see Section 5).

**Vulnerable code**:
```typescript
function verifyPassword(password, storedHash, salt) {
    const hash = hashPassword(password, salt);
    return hash === storedHash;  // ❌ Returns faster on early mismatch
}
```

**Attack**:
```python
import time

def measure_timing(password_guess):
    start = time.time()
    response = requests.post('/api/auth/login', json={'email': 'victim@example.com', 'password': password_guess})
    return time.time() - start

# Measure timing differences to extract hash character by character
for char in '0123456789abcdef':
    timing = measure_timing(char + '0' * 63)
    # Character that takes longest is likely correct
```

**Defense**: `crypto.timingSafeEqual()` (see Section 5)

### 5. Credential Stuffing

**What**: Using username/password pairs stolen from other breaches.

**How it works**:
1. Attacker obtains credentials from Breach A (e.g., LinkedIn)
2. Tries same credentials on Breach Target (e.g., your application)
3. Succeeds if users reuse passwords across services

**Scale**: Automated tools can test millions of credential pairs per hour.

**Defense**:
- Check passwords against breach databases at registration
- Implement rate limiting and bot detection
- Encourage 2FA (even if password is reused, attacker lacks second factor)
- Monitor for suspicious login patterns (location, time, device)

### 6. SQL Injection (Credential Theft)

**What**: Injecting SQL code to dump credential table.

**Vulnerable code**:
```typescript
// ❌ VULNERABLE
const email = req.body.email;
const query = `SELECT * FROM Account_Credential WHERE account_id = (SELECT account_id FROM Account WHERE email = '${email}')`;
const result = await pool.query(query);
```

**Attack**:
```javascript
// Attacker input
email: "' OR 1=1; --"

// Resulting query
SELECT * FROM Account_Credential WHERE account_id = (SELECT account_id FROM Account WHERE email = '' OR 1=1; --')
// Returns ALL credentials
```

**Defense**: Always use parameterized queries
```typescript
// ✅ SAFE
await pool.query(
    'SELECT * FROM Account_Credential WHERE account_id = (SELECT account_id FROM Account WHERE email = $1)',
    [email]
);
```

### 7. Session Fixation After Password Change

**What**: Attacker's session remains valid even after victim changes password.

**Attack scenario**:
1. Attacker compromises victim's account (phishing, stolen password, etc.)
2. Attacker creates session (gets JWT token)
3. Victim notices suspicious activity, changes password
4. Attacker's JWT token **still works** if not invalidated

**Defense**:
```typescript
async function changePassword(req, res) {
    // ... validate and update password ...

    // Invalidate all existing sessions
    await pool.query(
        'DELETE FROM User_Session WHERE account_id = $1',
        [accountId]
    );

    // Optionally, add to JWT blocklist if using JWTs
    await addToBlocklist(req.headers.authorization);

    res.json({ message: 'Password changed. Please log in again.' });
}
```

### 8. Password Reset Token Prediction

**What**: Attacker guesses or predicts reset tokens.

**Vulnerable code**:
```typescript
// ❌ PREDICTABLE
const resetToken = accountId + Date.now();
// Token: "123451634567890123"

// ❌ LOW ENTROPY
const resetToken = Math.random().toString(36).substring(2, 15);
// ~68 bits of entropy - brute-forceable
```

**Attack**:
```python
# If attacker knows account_id and approximate time of reset request
for timestamp in range(known_time - 60, known_time + 60):
    token = str(account_id) + str(timestamp)
    if try_reset(token):
        print(f"Found token: {token}")
```

**Defense**:
```typescript
// ✅ CRYPTOGRAPHICALLY SECURE
const resetToken = crypto.randomBytes(32).toString('hex');
// 256 bits of entropy - impossible to brute force
```

---

## 10. Best Practices and Defense in Depth {#best-practices}

### Password Storage Best Practices

1. **Never Store Plaintext Passwords** ❌
   - Not in database, not in logs, not in backups
   - If you can recover a user's password, you're doing it wrong

2. **Use Industry-Standard Hash Functions** ✅
   ```typescript
   // Production
   import bcrypt from 'bcrypt';
   const hash = await bcrypt.hash(password, 12);

   // Or Argon2
   import argon2 from 'argon2';
   const hash = await argon2.hash(password);
   ```

3. **Always Use Unique Salts** ✅
   - Generate new salt for each user
   - Use `crypto.randomBytes()` for cryptographically secure randomness

4. **Use Timing-Safe Comparisons** ✅
   - `crypto.timingSafeEqual()` prevents timing attacks

5. **Validate Password Strength** ✅
   - Minimum 8 characters (prefer 12+)
   - Check against breach databases (Have I Been Pwned)
   - Don't enforce composition rules that reduce security

### Authentication Best Practices

1. **Implement Rate Limiting**
   ```typescript
   import rateLimit from 'express-rate-limit';

   const loginLimiter = rateLimit({
       windowMs: 15 * 60 * 1000,  // 15 minutes
       max: 5,  // 5 requests per window
       message: 'Too many login attempts, please try again later'
   });

   app.post('/api/auth/login', loginLimiter, loginUser);
   ```

2. **Account Lockout After Failed Attempts**
   ```typescript
   // Track failed attempts
   await pool.query(
       'UPDATE Account SET failed_login_attempts = failed_login_attempts + 1 WHERE account_id = $1',
       [accountId]
   );

   // Lock account after 10 failed attempts
   if (failedAttempts >= 10) {
       await pool.query(
           'UPDATE Account SET locked_until = $1 WHERE account_id = $2',
           [new Date(Date.now() + 30 * 60 * 1000), accountId]
       );
   }
   ```

3. **Implement Multi-Factor Authentication (2FA)**
   - TOTP (Time-based One-Time Password) with apps like Google Authenticator
   - SMS codes (less secure but better than nothing)
   - Hardware tokens (YubiKey, etc.)

4. **Use HTTPS Everywhere**
   - Passwords should **never** be transmitted over unencrypted connections
   - Enforce HTTPS with HSTS headers
   ```typescript
   app.use((req, res, next) => {
       res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
       next();
   });
   ```

5. **Prevent Email Enumeration**
   - Same response whether user exists or not
   - Same response time (prevent timing-based enumeration)

### Password Reset Best Practices

1. **Cryptographically Secure Tokens**
   ```typescript
   const resetToken = crypto.randomBytes(32).toString('hex');  // 256 bits
   ```

2. **Hash Tokens in Database**
   ```typescript
   const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
   ```

3. **Short Expiration Times**
   - 15-60 minutes depending on security requirements

4. **One-Time Use**
   - Delete token after successful reset

5. **Invalidate Sessions**
   - Log out all devices when password is reset

### Defense in Depth: Layered Security

Security should not rely on a single mechanism. Instead, use multiple overlapping layers:

```
Layer 1: HTTPS
└─ Prevents password interception in transit

Layer 2: Rate Limiting
└─ Prevents brute force attacks

Layer 3: Password Validation
└─ Ensures strong passwords
└─ Checks against breach databases

Layer 4: Salt + Hash
└─ Protects passwords even if database is breached

Layer 5: Timing-Safe Comparison
└─ Prevents timing attacks

Layer 6: 2FA
└─ Protects even if password is compromised

Layer 7: Monitoring & Alerts
└─ Detect and respond to suspicious activity
```

**Philosophy**: If an attacker defeats one layer, others still protect the system.

### Security Monitoring and Incident Response

1. **Log Security Events**
   ```typescript
   // Log failed login attempts
   logger.warn('Failed login attempt', {
       email: email,
       ip: req.ip,
       timestamp: new Date(),
       userAgent: req.headers['user-agent']
   });
   ```

2. **Monitor for Anomalies**
   - Unusual login times
   - Logins from new locations
   - Multiple failed attempts across accounts (credential stuffing)
   - Sudden spike in password reset requests

3. **Incident Response Plan**
   - Detect breach quickly
   - Force password resets for affected accounts
   - Notify users
   - Analyze logs to understand scope
   - Implement additional safeguards

### Developer Security Practices

1. **Never Log Passwords**
   ```typescript
   // ❌ NEVER DO THIS
   console.log('User login attempt', { email, password });
   logger.info('Password reset', { email, newPassword });

   // ✅ GOOD
   console.log('User login attempt', { email });
   logger.info('Password reset', { email });
   ```

2. **Code Review Security-Critical Code**
   - All authentication/authorization code should be reviewed
   - Look for timing attacks, SQL injection, token prediction

3. **Dependency Security**
   ```bash
   npm audit
   npm audit fix
   ```
   - Keep dependencies updated
   - Monitor for security advisories

4. **Principle of Least Privilege**
   - Database user for application should have minimal permissions
   - Don't run application as root

---

## 11. Code Examples from Implementation {#code-examples}

### Complete passwordUtils.ts

**File**: `src/core/utilities/passwordUtils.ts`

```typescript
import crypto from 'crypto';

/**
 * Password utility functions for secure password handling
 * Uses SHA-256 with unique salts per user
 */

/**
 * Generates a cryptographically secure random salt
 * @returns 32-character hexadecimal salt (16 bytes of randomness = 128 bits)
 */
export function generateSalt(): string {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Hashes a password with a salt using SHA-256
 * @param password - Plain text password
 * @param salt - Cryptographic salt (from generateSalt())
 * @returns 64-character hexadecimal hash (256 bits)
 */
export function hashPassword(password: string, salt: string): string {
    return crypto
        .createHash('sha256')
        .update(password + salt)
        .digest('hex');
}

/**
 * Verifies a password against stored hash and salt
 * Uses timing-safe comparison to prevent timing attacks
 * @param password - Plain text password to verify
 * @param storedHash - Hash from database (64 hex characters)
 * @param storedSalt - Salt from database (32 hex characters)
 * @returns true if password matches, false otherwise
 */
export function verifyPassword(
    password: string,
    storedHash: string,
    storedSalt: string
): boolean {
    // Hash the provided password with stored salt
    const hash = hashPassword(password, storedSalt);

    // Convert hex strings to buffers for timing-safe comparison
    const hashBuffer = Buffer.from(hash, 'hex');
    const storedHashBuffer = Buffer.from(storedHash, 'hex');

    try {
        // Timing-safe comparison prevents timing attacks
        return crypto.timingSafeEqual(hashBuffer, storedHashBuffer);
    } catch (error) {
        // timingSafeEqual throws if buffer lengths differ
        return false;
    }
}

/**
 * Validates password meets security requirements
 * @param password - Password to validate
 * @returns Object with valid boolean and optional error message
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
    const MIN_LENGTH = 8;
    const MAX_LENGTH = 128;

    if (!password) {
        return { valid: false, error: 'Password is required' };
    }

    if (password.length < MIN_LENGTH) {
        return {
            valid: false,
            error: `Password must be at least ${MIN_LENGTH} characters`
        };
    }

    if (password.length > MAX_LENGTH) {
        return {
            valid: false,
            error: `Password must not exceed ${MAX_LENGTH} characters`
        };
    }

    return { valid: true };
}
```

### User Registration (authController.ts)

**File**: `src/controllers/authController.ts`

```typescript
import { Request, Response } from 'express';
import pool from '../db';
import { generateSalt, hashPassword, validatePassword } from '../core/utilities/passwordUtils';

/**
 * Registers a new user account
 * POST /api/auth/register
 */
export async function registerUser(req: Request, res: Response) {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if email already exists
        const existingUser = await client.query(
            'SELECT account_id FROM Account WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        // Create account
        const accountResult = await client.query(
            'INSERT INTO Account (email) VALUES ($1) RETURNING account_id',
            [email]
        );
        const accountId = accountResult.rows[0].account_id;

        // Generate salt and hash password
        const salt = generateSalt();
        const hash = hashPassword(password, salt);

        // Store credential
        await client.query(
            'INSERT INTO Account_Credential (account_id, salted_hash, salt) VALUES ($1, $2, $3)',
            [accountId, hash, salt]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'User registered successfully',
            accountId: accountId
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}
```

### User Login (authController.ts)

```typescript
import { verifyPassword } from '../core/utilities/passwordUtils';
import jwt from 'jsonwebtoken';

/**
 * Authenticates user and returns JWT token
 * POST /api/auth/login
 */
export async function loginUser(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        // Fetch account and credential from database
        const result = await pool.query(`
            SELECT
                a.account_id,
                a.email,
                ac.salted_hash,
                ac.salt
            FROM Account a
            INNER JOIN Account_Credential ac ON a.account_id = ac.account_id
            WHERE a.email = $1
        `, [email]);

        // Use timing-safe check to prevent email enumeration
        if (result.rows.length === 0) {
            // Even if user doesn't exist, take same time as password verification
            await verifyPassword(password, 'dummy_hash_' + '0'.repeat(64), 'dummy_salt_' + '0'.repeat(32));
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { account_id, salted_hash, salt } = result.rows[0];

        // Verify password using timing-safe comparison
        const isValid = verifyPassword(password, salted_hash, salt);

        if (!isValid) {
            // Log failed attempt
            await pool.query(
                'UPDATE Account SET failed_login_attempts = failed_login_attempts + 1 WHERE account_id = $1',
                [account_id]
            );

            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Reset failed attempts on successful login
        await pool.query(
            'UPDATE Account SET failed_login_attempts = 0, last_login = CURRENT_TIMESTAMP WHERE account_id = $1',
            [account_id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { accountId: account_id, email: email },
            process.env.JWT_SECRET!,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token: token
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
```

### Password Change

```typescript
/**
 * Changes user's password (requires authentication)
 * POST /api/auth/change-password
 */
export async function changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    const accountId = req.user.accountId;  // From JWT middleware

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
    }

    // Prevent same password
    if (currentPassword === newPassword) {
        return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch current credential
        const credResult = await client.query(
            'SELECT salted_hash, salt FROM Account_Credential WHERE account_id = $1',
            [accountId]
        );

        if (credResult.rows.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }

        const { salted_hash, salt } = credResult.rows[0];

        // Verify current password
        const isValid = verifyPassword(currentPassword, salted_hash, salt);
        if (!isValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        // Generate new salt and hash
        const newSalt = generateSalt();
        const newHash = hashPassword(newPassword, newSalt);

        // Update credential
        await client.query(
            'UPDATE Account_Credential SET salted_hash = $1, salt = $2, updated_at = CURRENT_TIMESTAMP WHERE account_id = $3',
            [newHash, newSalt, accountId]
        );

        // Invalidate all sessions (force re-login)
        await client.query(
            'DELETE FROM User_Session WHERE account_id = $1',
            [accountId]
        );

        await client.query('COMMIT');

        res.json({ message: 'Password changed successfully. Please log in again.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Change password error:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
}
```

---

## 12. Real-World Analogies {#analogies}

### Password Hashing: The Meat Grinder

**Plaintext Password Storage** = Storing whole steaks in a vault
- If thief breaks into vault, they get perfect steaks
- Can immediately use them (cook and eat)

**Password Hashing** = Putting steaks through a meat grinder
- If thief breaks into vault, they get ground beef
- Can't reconstruct original steaks (irreversible)
- Can verify if new steak matches by grinding it and comparing to stored ground beef

### Salt: Personalizing the Grinder

**No Salt** = Everyone uses the same meat grinder setting
- If two people grind sirloin steaks, output looks identical
- Thief can create a "ground beef catalog" (rainbow table) for common steaks
- Look up any stolen ground beef → instantly know original steak

**Unique Salt Per User** = Each person has a custom grinder with random settings
- Same sirloin steak → completely different ground beef for each person
- Thief's catalog is useless (would need catalog for every possible grinder setting)
- Even identical steaks produce different ground beef

### Timing-Safe Comparison: The Poker Face

**Standard Comparison** = Playing poker and reacting immediately when you see cards
- Bad cards → groan immediately (0.1 seconds)
- Good cards → poker face, then subtle smile (0.5 seconds)
- Opponent learns information from your reaction time

**Timing-Safe Comparison** = Always waiting exactly 5 seconds before reacting
- Bad cards → 5 seconds, then neutral face
- Good cards → 5 seconds, then neutral face
- Opponent gets zero information from timing

### Password Reset Tokens: Concert Ticket Verification

**Bad Reset Token** = Predictable ticket numbers (1001, 1002, 1003...)
- Scalper can guess ticket numbers
- Print fake tickets and get in

**Good Reset Token** = Random alphanumeric codes (A7K2-P9M4-X3F8-Q1L5)
- Impossible to guess
- Each ticket is unique and unpredictable

**One-Time Use** = Ticket is destroyed after entry
- Can't photocopy and reuse
- Even if someone steals your ticket stub, it's worthless

### Defense in Depth: Medieval Castle Security

A castle doesn't rely on just a door lock:

```
Layer 1: Moat
└─ Keep casual attackers away

Layer 2: Outer Wall
└─ Require siege equipment

Layer 3: Guards
└─ Challenge and verify identity

Layer 4: Inner Wall
└─ Additional barrier if outer wall breached

Layer 5: Keep (central tower)
└─ Final stronghold with heaviest defenses

Layer 6: Secret Escape Tunnel
└─ Even if everything else fails, can evacuate
```

Similarly, password security has multiple layers:
- HTTPS = Moat (prevents interception)
- Rate limiting = Guards (challenge suspicious activity)
- Strong passwords = Outer wall (hard to break)
- Hashing + salting = Inner wall (protects even if database breached)
- 2FA = Keep (final authentication layer)
- Monitoring = Watchtowers (detect attacks in progress)

---

## Summary and Key Takeaways

### Critical Security Principles

1. **Never store plaintext passwords** - Always hash with salt
2. **Use unique salts per user** - Prevents rainbow table attacks
3. **Use timing-safe comparisons** - Prevents timing attacks
4. **Validate password strength** - Check against breaches, enforce minimum length
5. **Secure password reset workflow** - Cryptographically secure tokens, short expiration
6. **Defense in depth** - Multiple overlapping security layers
7. **Monitor and respond** - Detect anomalies, have incident response plan

### TCSS-460-auth-squared Implementation

- **Hash Function**: SHA-256 (educational; use bcrypt/Argon2 in production)
- **Salt**: 16 bytes (32 hex chars), unique per user
- **Validation**: 8-128 characters
- **Comparison**: `crypto.timingSafeEqual()` for timing safety
- **Storage**: Account_Credential table (salted_hash, salt columns)

### Production Recommendations

Upgrade to production-grade password hashing:

```typescript
// Install: npm install bcrypt
import bcrypt from 'bcrypt';

// Registration
const hash = await bcrypt.hash(password, 12);  // Work factor 12

// Login
const isValid = await bcrypt.compare(password, hash);
```

Additional security measures:
- Implement 2FA (TOTP, SMS, hardware tokens)
- Add rate limiting and account lockout
- Check passwords against Have I Been Pwned
- Monitor for credential stuffing and anomalous logins
- Use HTTPS everywhere with HSTS
- Regular security audits and penetration testing

### Further Reading

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [NIST SP 800-63B: Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)
- [Have I Been Pwned API](https://haveibeenpwned.com/API/v3)
- [Argon2: The Password Hashing Competition Winner](https://github.com/P-H-C/phc-winner-argon2)

---

## Related Guides

- **[JWT Implementation Guide](./jwt-implementation-guide.md)** - Token-based authentication
- **[Verification Workflows Guide](./verification-workflows-guide.md)** - Email verification for password resets
- **[Web Security Guide](./web-security-guide.md)** - Security vulnerabilities and prevention

---

**Document Version**: 1.0
**Last Updated**: 2024-10-14
**Author**: TCSS-460-auth-squared Security Team
**License**: Educational use for TCSS-460 students
