# Email/SMS Verification Workflows Guide for TCSS-460-auth-squared

A comprehensive educational guide to implementing secure user verification systems for senior CS students.

> **Learning Objectives**: Understand email and SMS verification workflows, token/code generation, expiry handling, security considerations, and common edge cases in authentication systems.

## Quick Navigation
- **Why Verification**: [Security & Ownership](#why-verification-matters)
- **Email Workflow**: [Full Lifecycle](#email-verification-workflow)
- **SMS Workflow**: [Code-based Verification](#sms-verification-workflow)
- **Database Schema**: [Tables & Structure](#database-schema)
- **Security**: [Attack Prevention](#security-considerations)
- **Implementation**: [Code Examples](#implementation-examples)
- **Edge Cases**: [Error Scenarios](#common-edge-cases)

---

## Table of Contents

1. [Why Verification Matters](#why-verification-matters)
2. [Email Verification Workflow](#email-verification-workflow)
3. [Email Token Generation and Validation](#email-token-generation-and-validation)
4. [SMS Verification Workflow](#sms-verification-workflow)
5. [SMS Code Generation and Attempt Limiting](#sms-code-generation-and-attempt-limiting)
6. [Database Schema](#database-schema)
7. [Token and Code Expiry Handling](#token-and-code-expiry-handling)
8. [Resend Logic and Rate Limiting](#resend-logic-and-rate-limiting)
9. [Security Considerations](#security-considerations)
10. [Implementation Examples](#implementation-examples)
11. [User Experience Considerations](#user-experience-considerations)
12. [Error Handling Patterns](#error-handling-patterns)
13. [Common Edge Cases](#common-edge-cases)

---

## Why Verification Matters

### The Security Problem

When a user registers with an email address or phone number, how do you know they actually own it?

**Without Verification**:
```
Attacker registers: victim@company.com
System creates account and grants access
Attacker now receives all notifications meant for victim
Victim doesn't know their email was used
```

**Scenario: Account Takeover**
```
1. Attacker registers with victim@bank.com
2. Attacker uses "forgot password" on real banking site
3. Password reset email goes to attacker's controlled account
4. Attacker gains access to victim's real account
```

### User Ownership Verification

**Email Verification** proves:
- ✅ User has access to the email inbox
- ✅ User can receive and act on communications
- ✅ Email address is valid and deliverable
- ✅ User owns or controls the email account

**SMS Verification** proves:
- ✅ User has physical possession of the phone
- ✅ Phone number is active and receiving messages
- ✅ User can access the device in real-time
- ✅ Harder to spoof than email (requires SIM card)

### Real-World Use Cases

**Email Verification**:
- Initial account registration confirmation
- Password reset authorization
- Email change confirmation
- Notification preference updates
- Legal/compliance requirements (GDPR, CAN-SPAM)

**SMS Verification**:
- Two-factor authentication (2FA)
- High-security operations (money transfers)
- Account recovery when email is compromised
- Real-time identity verification
- Mobile app authentication

### Trust Hierarchy

```
Unverified Account
    ↓ (Email verified)
Email-Verified Account
    ↓ (SMS verified)
Fully-Verified Account
    ↓ (2FA enabled)
Highly-Secured Account
```

**Different levels enable different features**:
- **Unverified**: Limited access, can't reset password
- **Email-Verified**: Full access, can receive notifications
- **SMS-Verified**: Can enable 2FA, perform sensitive operations
- **2FA Enabled**: Maximum security, trusted for financial transactions

---

## Email Verification Workflow

### Complete Email Verification Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                   EMAIL VERIFICATION FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: User Registers
    ↓
┌──────────────────────────────────────┐
│ POST /auth/register                  │
│ - Email: user@example.com            │
│ - Password: ******                   │
│                                      │
│ System Actions:                      │
│ 1. Create Account record             │
│ 2. Generate verification token       │
│ 3. Store token in Email_Verification │
│ 4. Send email with verification link │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Email Sent to User                   │
│                                      │
│ Subject: Verify Your Email           │
│ Link: /verify/email/confirm?token=   │
│       abc123def456...                │
│                                      │
│ Expiry: 48 hours from generation     │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ User Clicks Link (within 48 hours)  │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ GET /auth/verify/email/confirm       │
│ ?token=abc123def456...               │
│                                      │
│ System Actions:                      │
│ 1. Extract token from query string   │
│ 2. Look up token in database         │
│ 3. Check expiration (< 48 hours?)    │
│ 4. Verify token matches account      │
│ 5. Update Account.Email_Verified     │
│ 6. Delete verification token         │
│ 7. Return success response           │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Account Status Updated               │
│ Email_Verified: false → true         │
│ User can now:                        │
│ - Receive notifications              │
│ - Reset password                     │
│ - Access full features               │
└──────────────────────────────────────┘
```

### Step-by-Step Breakdown

#### Step 1: Token Generation on Registration

**When**: Immediately after user registration
**Endpoint**: `POST /auth/verify/email/request`

```typescript
async function sendEmailVerification(accountId: number, email: string) {
    // Generate cryptographically secure random token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    // Result: 64-character hex string
    // Example: "a3f9d8e7c2b5a1e4d9f7c3b8e2a5d1f6b9c4e2a7d5f1c8b3e6a9d2f5c1e8b4a7"

    // Calculate expiration: 48 hours from now
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Store in database
    await pool.query(`
        INSERT INTO Email_Verification (Account_ID, Token, Expires_At, Created_At)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (Account_ID)
        DO UPDATE SET
            Token = $2,
            Expires_At = $3,
            Created_At = NOW()
    `, [accountId, verificationToken, expiresAt]);

    // Build verification URL
    const verificationUrl = `https://yourapp.com/auth/verify/email/confirm?token=${verificationToken}`;

    // Send email
    await sendEmail({
        to: email,
        subject: "Verify Your Email Address",
        html: `
            <h2>Welcome to TCSS-460-auth-squared!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verificationUrl}">Verify Email</a>
            <p>This link will expire in 48 hours.</p>
            <p>If you didn't create this account, please ignore this email.</p>
        `
    });
}
```

**Key Security Points**:
- ✅ 32 bytes (256 bits) of cryptographic randomness
- ✅ Token is single-use (deleted after verification)
- ✅ 48-hour expiration window
- ✅ `ON CONFLICT` prevents duplicate tokens per user
- ✅ URL contains no user-identifiable information

#### Step 2: User Clicks Verification Link

**Endpoint**: `GET /auth/verify/email/confirm?token=abc123...`

```typescript
async function confirmEmailVerification(req: Request, res: Response) {
    const { token } = req.query;

    // Validate token format
    if (!token || typeof token !== 'string' || token.length !== 64) {
        return res.status(400).json({
            success: false,
            error: 'Invalid verification token format'
        });
    }

    try {
        // Look up token in database
        const result = await pool.query(`
            SELECT
                ev.Account_ID,
                ev.Expires_At,
                a.Email,
                a.Email_Verified
            FROM Email_Verification ev
            JOIN Account a ON ev.Account_ID = a.Account_ID
            WHERE ev.Token = $1
        `, [token]);

        // Check if token exists
        if (result.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification token'
            });
        }

        const verification = result.rows[0];

        // Check if already verified
        if (verification.email_verified) {
            return res.status(200).json({
                success: true,
                message: 'Email already verified'
            });
        }

        // Check expiration
        const now = new Date();
        if (now > new Date(verification.expires_at)) {
            return res.status(400).json({
                success: false,
                error: 'Verification token has expired. Please request a new one.',
                errorCode: 'TOKEN_EXPIRED'
            });
        }

        // Transaction: Update account and delete token
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Mark email as verified
            await client.query(
                'UPDATE Account SET Email_Verified = true WHERE Account_ID = $1',
                [verification.account_id]
            );

            // Delete used token (single-use)
            await client.query(
                'DELETE FROM Email_Verification WHERE Account_ID = $1',
                [verification.account_id]
            );

            await client.query('COMMIT');

            return res.status(200).json({
                success: true,
                message: 'Email verified successfully!'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Email verification error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to verify email'
        });
    }
}
```

### Timeline Example: Email Verification

```
Day 1, 10:00 AM - User registers
    ├─ Account created (Email_Verified = false)
    ├─ Token generated: "a3f9d8e7c2b5a1e4..."
    ├─ Expires_At: Day 3, 10:00 AM (48 hours later)
    └─ Email sent with verification link

Day 1, 10:05 AM - User checks email and clicks link
    ├─ Token is valid (5 minutes old, well within 48 hours)
    ├─ Email_Verified updated to true
    ├─ Token deleted from database
    └─ User sees success message

Alternative Timeline: Expired Token
Day 1, 10:00 AM - User registers
    ├─ Token generated
    └─ Expires_At: Day 3, 10:00 AM

Day 3, 11:00 AM - User clicks link (49 hours later)
    ├─ Token found in database
    ├─ Expiration check: 11:00 AM > 10:00 AM ❌
    ├─ Response: "Token expired, request new one"
    └─ User must request new verification email
```

---

## Email Token Generation and Validation

### Token Generation Best Practices

**File**: `src/core/utilities/emailService.ts`

```typescript
import crypto from 'crypto';

/**
 * Generate cryptographically secure email verification token
 * @returns 64-character hexadecimal token (32 bytes of entropy)
 */
export function generateEmailVerificationToken(): string {
    // 32 bytes = 256 bits of entropy
    // Converted to hex = 64 characters
    return crypto.randomBytes(32).toString('hex');
}
```

### Why 32 Bytes (256 bits)?

**Entropy Calculation**:
```
32 bytes = 256 bits
Possible tokens: 2^256 = 1.15 × 10^77

For comparison:
- Number of atoms in universe: ~10^80
- Impossible to brute force even with all computing power on Earth
```

**Bad Token Generation Examples**:

❌ **Predictable Timestamp-Based**:
```typescript
// NEVER DO THIS
const token = Date.now().toString();
// Attacker can guess: 1699891200000, 1699891200001, 1699891200002...
```

❌ **Sequential IDs**:
```typescript
// NEVER DO THIS
const token = userId + '-' + incrementingCounter;
// Attacker knows userId and can enumerate counter
```

❌ **Math.random() (Not Cryptographically Secure)**:
```typescript
// NEVER DO THIS
const token = Math.random().toString(36).substring(2);
// Math.random() is predictable and has low entropy
```

✅ **Correct: crypto.randomBytes()**:
```typescript
// Always use this
const token = crypto.randomBytes(32).toString('hex');
// Cryptographically secure pseudorandom number generator (CSPRNG)
```

### Token Validation Logic

```typescript
export async function validateEmailToken(token: string): Promise<{
    valid: boolean;
    accountId?: number;
    error?: string;
}> {
    // 1. Format validation
    if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/i.test(token)) {
        return {
            valid: false,
            error: 'Invalid token format'
        };
    }

    // 2. Database lookup
    const result = await pool.query(`
        SELECT Account_ID, Expires_At
        FROM Email_Verification
        WHERE Token = $1
    `, [token]);

    if (result.rows.length === 0) {
        return {
            valid: false,
            error: 'Token not found'
        };
    }

    // 3. Expiration check
    const expiresAt = new Date(result.rows[0].expires_at);
    if (new Date() > expiresAt) {
        return {
            valid: false,
            error: 'Token expired'
        };
    }

    // 4. Valid token
    return {
        valid: true,
        account_id: result.rows[0].account_id
    };
}
```

### Security: Why Hash Tokens in Database?

**Enhanced Security Pattern** (recommended for production):

```typescript
// Generate token
const plainToken = crypto.randomBytes(32).toString('hex');

// Hash before storing (SHA-256)
const tokenHash = crypto.createHash('sha256')
    .update(plainToken)
    .digest('hex');

// Store ONLY the hash
await pool.query(
    'INSERT INTO Email_Verification (Account_ID, Token_Hash, ...) VALUES ($1, $2, ...)',
    [accountId, tokenHash, ...]
);

// Send plain token in email
const verifyUrl = `https://app.com/verify?token=${plainToken}`;

// Validation: Hash incoming token and compare
const incomingHash = crypto.createHash('sha256')
    .update(incomingToken)
    .digest('hex');

const result = await pool.query(
    'SELECT * FROM Email_Verification WHERE Token_Hash = $1',
    [incomingHash]
);
```

**Why hash?**
- If database is breached, attacker gets hashes, not usable tokens
- Similar principle to password hashing
- Tokens in email are vulnerable (email servers, network intercept)
- Database should contain hashes only

---

## SMS Verification Workflow

### Complete SMS Verification Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                   SMS VERIFICATION FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

STEP 1: User Requests SMS Verification
    ↓
┌──────────────────────────────────────┐
│ POST /auth/verify/sms/request        │
│ Body: { phone: "+12065551234" }      │
│                                      │
│ System Actions:                      │
│ 1. Validate phone format             │
│ 2. Generate 6-digit code             │
│ 3. Store code in Phone_Verification  │
│ 4. Set expiry: 15 minutes            │
│ 5. Reset attempt counter to 0        │
│ 6. Send SMS via Twilio/AWS SNS       │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ SMS Sent to User's Phone             │
│                                      │
│ Message:                             │
│ "Your TCSS-460 verification code is: │
│  123456                              │
│  Valid for 15 minutes.               │
│  Do not share this code."            │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ User Enters Code (within 15 minutes) │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ POST /auth/verify/sms/confirm        │
│ Body: { phone: "+12065551234",       │
│         code: "123456" }             │
│                                      │
│ System Actions:                      │
│ 1. Look up phone in database         │
│ 2. Check expiration (< 15 min?)      │
│ 3. Check attempts (< 3?)             │
│ 4. Verify code matches               │
│ 5. If match:                         │
│    - Update Phone_Verified = true    │
│    - Delete verification record      │
│ 6. If mismatch:                      │
│    - Increment attempt counter       │
│    - If attempts >= 3: Lock record   │
└──────────────────────────────────────┘
    ↓
┌──────────────────────────────────────┐
│ Verification Result                  │
│                                      │
│ SUCCESS:                             │
│ - Phone_Verified: false → true       │
│ - User sees "Phone verified!"        │
│                                      │
│ FAILURE (wrong code):                │
│ - Attempts: 1/3, 2/3, or 3/3         │
│ - 3/3: "Too many attempts. Request   │
│         new code."                   │
└──────────────────────────────────────┘
```

### Key Differences: SMS vs Email

| Aspect | Email Verification | SMS Verification |
|--------|-------------------|------------------|
| **Token Type** | Long random token (64 chars) | Short numeric code (6 digits) |
| **Delivery** | Email (asynchronous) | SMS (near real-time) |
| **Expiry** | 48 hours | 15 minutes |
| **User Action** | Click link | Type code manually |
| **Attempt Limit** | None (link is one-time use) | 3 attempts |
| **Cost** | Free (using SMTP) | $0.01-0.05 per SMS |
| **Security** | Lower (email can be forwarded) | Higher (requires device) |
| **UX** | One-click | Requires typing |

---

## SMS Code Generation and Attempt Limiting

### Code Generation

**File**: `src/core/utilities/smsService.ts`

```typescript
/**
 * Generate 6-digit numeric verification code
 * @returns String of 6 random digits (000000 to 999999)
 */
export function generateSMSCode(): string {
    // Generate random number between 0 and 999999
    const code = crypto.randomInt(0, 1000000);

    // Pad with leading zeros to ensure 6 digits
    return code.toString().padStart(6, '0');

    // Examples:
    // 42 → "000042"
    // 1234 → "001234"
    // 999999 → "999999"
}
```

**Why 6 digits?**

```
Possible codes: 000000 to 999999 = 1,000,000 combinations

Security analysis:
- With 3 attempts allowed:
  - Probability of guessing: 3/1,000,000 = 0.0003%
  - Extremely low, acceptable for 15-minute window

- With unlimited attempts:
  - Attacker could enumerate all codes
  - Hence the 3-attempt limit is CRITICAL

Trade-off:
- 4 digits: 10,000 combinations (too weak)
- 6 digits: 1,000,000 combinations (good balance)
- 8 digits: 100,000,000 combinations (harder for users to type)
```

### Attempt Limiting Implementation

```typescript
async function verifySMSCode(phone: string, submittedCode: string) {
    // Look up verification record
    const result = await pool.query(`
        SELECT
            Account_ID,
            Code,
            Expires_At,
            Attempts
        FROM Phone_Verification
        WHERE Phone_Number = $1
    `, [phone]);

    if (result.rows.length === 0) {
        return {
            success: false,
            error: 'No verification code found for this phone number'
        };
    }

    const verification = result.rows[0];

    // Check expiration (15 minutes)
    const now = new Date();
    if (now > new Date(verification.expires_at)) {
        return {
            success: false,
            error: 'Verification code has expired. Please request a new code.',
            errorCode: 'CODE_EXPIRED'
        };
    }

    // Check attempt limit
    if (verification.attempts >= 3) {
        return {
            success: false,
            error: 'Too many failed attempts. Please request a new code.',
            errorCode: 'MAX_ATTEMPTS_REACHED'
        };
    }

    // Verify code
    if (submittedCode !== verification.code) {
        // Increment attempt counter
        await pool.query(
            'UPDATE Phone_Verification SET Attempts = Attempts + 1 WHERE Phone_Number = $1',
            [phone]
        );

        const remainingAttempts = 3 - (verification.attempts + 1);

        return {
            success: false,
            error: `Invalid code. ${remainingAttempts} attempt(s) remaining.`,
            errorCode: 'INVALID_CODE',
            attemptsRemaining: remainingAttempts
        };
    }

    // Code is correct! Update account and clean up
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Mark phone as verified
        await client.query(
            'UPDATE Account SET Phone_Verified = true WHERE Account_ID = $1',
            [verification.account_id]
        );

        // Delete verification record (single-use)
        await client.query(
            'DELETE FROM Phone_Verification WHERE Phone_Number = $1',
            [phone]
        );

        await client.query('COMMIT');

        return {
            success: true,
            message: 'Phone number verified successfully!'
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

### Timeline Example: SMS Verification with Attempts

```
15:00:00 - User requests SMS code
    ├─ Code generated: "385729"
    ├─ Expires_At: 15:15:00 (15 minutes later)
    ├─ Attempts: 0
    └─ SMS sent to +1-206-555-1234

15:02:00 - User enters wrong code: "123456"
    ├─ Code mismatch
    ├─ Attempts: 0 → 1
    └─ Response: "Invalid code. 2 attempt(s) remaining."

15:04:00 - User enters wrong code: "999999"
    ├─ Code mismatch
    ├─ Attempts: 1 → 2
    └─ Response: "Invalid code. 1 attempt(s) remaining."

15:06:00 - User enters correct code: "385729"
    ├─ Code match ✓
    ├─ Expiration check: 15:06 < 15:15 ✓
    ├─ Phone_Verified: false → true
    ├─ Verification record deleted
    └─ Response: "Phone verified successfully!"

Alternative Timeline: Too Many Attempts
15:00:00 - Code sent (Attempts: 0)
15:02:00 - Wrong code (Attempts: 1)
15:04:00 - Wrong code (Attempts: 2)
15:06:00 - Wrong code (Attempts: 3)
    └─ Response: "Too many failed attempts. Request new code."

15:08:00 - User enters correct code: "385729"
    ├─ Attempts check: 3 >= 3 ❌
    └─ Response: "Too many attempts. Request new code."
```

---

## Database Schema

### Email_Verification Table

```sql
CREATE TABLE Email_Verification (
    Verification_ID SERIAL PRIMARY KEY,
    Account_ID INTEGER NOT NULL UNIQUE,
    Token VARCHAR(64) NOT NULL UNIQUE,
    Expires_At TIMESTAMP NOT NULL,
    Created_At TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (Account_ID) REFERENCES Account(Account_ID) ON DELETE CASCADE,

    -- Ensure expiration is in the future
    CONSTRAINT check_expiry CHECK (Expires_At > Created_At)
);

-- Index for fast token lookups
CREATE INDEX idx_email_verification_token ON Email_Verification(Token);

-- Index for cleanup of expired tokens
CREATE INDEX idx_email_verification_expires ON Email_Verification(Expires_At);
```

**Column Breakdown**:

| Column | Type | Purpose |
|--------|------|---------|
| `Verification_ID` | SERIAL | Primary key (auto-increment) |
| `Account_ID` | INTEGER | Links to Account table (UNIQUE: one verification per account) |
| `Token` | VARCHAR(64) | 64-character hex token (UNIQUE: no duplicate tokens) |
| `Expires_At` | TIMESTAMP | When token expires (48 hours from creation) |
| `Created_At` | TIMESTAMP | When token was generated (for auditing) |

**Why UNIQUE on Account_ID?**
- Prevents multiple pending verifications per user
- `ON CONFLICT DO UPDATE` allows resending verification
- Old token is replaced with new one

**Example Records**:
```
Verification_ID | Account_ID | Token                              | Expires_At           | Created_At
----------------|------------|-----------------------------------|----------------------|--------------------
1               | 42         | a3f9d8e7c2b5a1e4...              | 2024-10-16 10:00:00  | 2024-10-14 10:00:00
2               | 53         | 7b2e4c1f9d6a3e8b...              | 2024-10-16 15:30:00  | 2024-10-14 15:30:00
```

### Phone_Verification Table

```sql
CREATE TABLE Phone_Verification (
    Verification_ID SERIAL PRIMARY KEY,
    Account_ID INTEGER NOT NULL UNIQUE,
    Phone_Number VARCHAR(15) NOT NULL,
    Code CHAR(6) NOT NULL,
    Expires_At TIMESTAMP NOT NULL,
    Attempts INTEGER DEFAULT 0,
    Created_At TIMESTAMP DEFAULT NOW(),

    FOREIGN KEY (Account_ID) REFERENCES Account(Account_ID) ON DELETE CASCADE,

    -- Ensure attempts are within valid range
    CONSTRAINT check_attempts CHECK (Attempts >= 0 AND Attempts <= 3),

    -- Ensure expiration is in the future
    CONSTRAINT check_expiry CHECK (Expires_At > Created_At)
);

-- Index for fast phone lookups
CREATE INDEX idx_phone_verification_number ON Phone_Verification(Phone_Number);

-- Index for cleanup of expired codes
CREATE INDEX idx_phone_verification_expires ON Phone_Verification(Expires_At);
```

**Column Breakdown**:

| Column | Type | Purpose |
|--------|------|---------|
| `Verification_ID` | SERIAL | Primary key |
| `Account_ID` | INTEGER | Links to Account table |
| `Phone_Number` | VARCHAR(15) | User's phone number (E.164 format: +12065551234) |
| `Code` | CHAR(6) | 6-digit verification code |
| `Expires_At` | TIMESTAMP | 15 minutes from creation |
| `Attempts` | INTEGER | Failed verification attempts (0-3) |
| `Created_At` | TIMESTAMP | When code was generated |

**Example Records**:
```
Verification_ID | Account_ID | Phone_Number    | Code   | Expires_At          | Attempts | Created_At
----------------|------------|-----------------|--------|---------------------|----------|--------------------
1               | 42         | +12065551234    | 385729 | 2024-10-14 15:15:00 | 0        | 2024-10-14 15:00:00
2               | 53         | +14255559876    | 729301 | 2024-10-14 15:20:00 | 2        | 2024-10-14 15:05:00
```

### Account Table (Verification Flags)

```sql
-- Relevant columns from Account table
CREATE TABLE Account (
    Account_ID SERIAL PRIMARY KEY,
    Email VARCHAR(255) NOT NULL UNIQUE,
    Phone_Number VARCHAR(15),
    Email_Verified BOOLEAN DEFAULT FALSE,
    Phone_Verified BOOLEAN DEFAULT FALSE,
    -- ... other columns
);
```

**Verification Flow Impact**:
```
Registration:
Account { Email_Verified: false, Phone_Verified: false }

After Email Verification:
Account { Email_Verified: true, Phone_Verified: false }

After Phone Verification:
Account { Email_Verified: true, Phone_Verified: true }
```

---

## Token and Code Expiry Handling

### Why Different Expiry Times?

| Verification Type | Expiry Time | Reasoning |
|------------------|-------------|-----------|
| **Email Token** | 48 hours | - Email checks are asynchronous<br>- Users may not check email immediately<br>- Balance security vs. UX<br>- Longer window is acceptable (low cost to resend) |
| **SMS Code** | 15 minutes | - SMS is expensive ($0.01-0.05 each)<br>- Short codes are easier to brute-force<br>- Users typically have phone in hand<br>- Real-time verification expected |

### Email Token Expiry Implementation

```typescript
// Generation: Set expiry to 48 hours from now
const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
//                           └─────────┬──────────────┘
//                                     48 hours in milliseconds
// 48 hours × 60 minutes × 60 seconds × 1000 milliseconds

await pool.query(
    'INSERT INTO Email_Verification (Account_ID, Token, Expires_At) VALUES ($1, $2, $3)',
    [accountId, token, expiresAt]
);
```

**Validation: Database-Level Check**:
```sql
-- Query automatically excludes expired tokens
SELECT Account_ID, Token
FROM Email_Verification
WHERE Token = $1
  AND Expires_At > NOW()  -- Only non-expired tokens
```

**Validation: Application-Level Check**:
```typescript
const result = await pool.query(
    'SELECT Account_ID, Expires_At FROM Email_Verification WHERE Token = $1',
    [token]
);

if (result.rows.length === 0) {
    return { error: 'Token not found' };
}

const expiresAt = new Date(result.rows[0].expires_at);
const now = new Date();

if (now > expiresAt) {
    return {
        error: 'Token expired',
        expiredAt: expiresAt.toISOString(),
        message: 'Please request a new verification email'
    };
}
```

### SMS Code Expiry Implementation

```typescript
// Generation: 15 minutes from now
const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
//                           └────┬─────────────┘
//                                15 minutes in milliseconds

await pool.query(`
    INSERT INTO Phone_Verification (Account_ID, Phone_Number, Code, Expires_At, Attempts)
    VALUES ($1, $2, $3, $4, 0)
    ON CONFLICT (Account_ID)
    DO UPDATE SET
        Code = $3,
        Expires_At = $4,
        Attempts = 0,  -- Reset attempts on new code
        Created_At = NOW()
`, [accountId, phoneNumber, code, expiresAt]);
```

**Validation with Attempt Check**:
```typescript
const result = await pool.query(`
    SELECT Account_ID, Code, Expires_At, Attempts
    FROM Phone_Verification
    WHERE Phone_Number = $1
`, [phoneNumber]);

if (result.rows.length === 0) {
    return { error: 'No verification code found' };
}

const verification = result.rows[0];

// Check expiration BEFORE attempt limit
// (Don't waste attempts on expired codes)
if (new Date() > new Date(verification.expires_at)) {
    return {
        error: 'Code expired',
        message: 'This code expired. Please request a new one.',
        errorCode: 'CODE_EXPIRED'
    };
}

// Check attempts
if (verification.attempts >= 3) {
    return {
        error: 'Too many attempts',
        message: 'Maximum attempts reached. Request a new code.',
        errorCode: 'MAX_ATTEMPTS'
    };
}

// Proceed with code verification...
```

### Cleanup: Removing Expired Records

**Why cleanup matters**:
- Database bloat (millions of expired records)
- Index degradation
- Slower queries
- Privacy/compliance (don't keep data longer than needed)

**Cleanup Strategy 1: Scheduled Job (Cron)**:
```typescript
// Run daily at 2:00 AM
// cron: '0 2 * * *'
async function cleanupExpiredVerifications() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Delete expired email verifications
        const emailResult = await client.query(
            'DELETE FROM Email_Verification WHERE Expires_At < NOW()'
        );

        // Delete expired SMS verifications
        const smsResult = await client.query(
            'DELETE FROM Phone_Verification WHERE Expires_At < NOW()'
        );

        await client.query('COMMIT');

        console.log(`Cleanup complete: ${emailResult.rowCount} email, ${smsResult.rowCount} SMS records deleted`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Cleanup failed:', error);
    } finally {
        client.release();
    }
}
```

**Cleanup Strategy 2: On-Demand (During Request)**:
```typescript
// Before generating new token, delete expired ones
async function sendEmailVerification(accountId: number, email: string) {
    // Opportunistic cleanup
    await pool.query(
        'DELETE FROM Email_Verification WHERE Account_ID = $1 AND Expires_At < NOW()',
        [accountId]
    );

    // Generate and store new token...
}
```

---

## Resend Logic and Rate Limiting

### Why Rate Limiting?

**Attack Scenarios Without Rate Limiting**:

1. **Email Bombing**:
```
Attacker requests verification emails for victim@example.com
System sends: 1, 2, 10, 100, 1000 emails
Victim's inbox is flooded
Email provider may block sender domain
```

2. **SMS Cost Attack**:
```
Attacker requests SMS codes repeatedly
1000 SMS × $0.02 = $20.00
10,000 SMS × $0.02 = $200.00
100,000 SMS × $0.02 = $2,000.00
Company pays, attacker pays nothing
```

3. **Resource Exhaustion**:
```
Attacker makes 1 million verification requests
Database fills with expired tokens
Email queue backs up
System becomes unresponsive
```

### Resend Email Verification

**Endpoint**: `POST /auth/verify/email/request`

```typescript
async function resendEmailVerification(req: Request, res: Response) {
    const { email } = req.body;

    // Look up account
    const accountResult = await pool.query(
        'SELECT Account_ID, Email_Verified FROM Account WHERE Email = $1',
        [email]
    );

    if (accountResult.rows.length === 0) {
        // Don't reveal if email exists (prevent enumeration)
        return res.json({
            success: true,
            message: 'If that email exists, a verification link has been sent'
        });
    }

    const account = accountResult.rows[0];

    // Check if already verified
    if (account.email_verified) {
        return res.json({
            success: true,
            message: 'Email is already verified'
        });
    }

    // RATE LIMITING: Check recent verifications
    const recentVerification = await pool.query(`
        SELECT Created_At
        FROM Email_Verification
        WHERE Account_ID = $1
          AND Created_At > NOW() - INTERVAL '5 minutes'
    `, [account.account_id]);

    if (recentVerification.rows.length > 0) {
        const lastSent = new Date(recentVerification.rows[0].created_at);
        const waitTime = 5 - Math.floor((Date.now() - lastSent.getTime()) / 60000);

        return res.status(429).json({
            success: false,
            error: `Please wait ${waitTime} minute(s) before requesting another verification email`,
            errorCode: 'RATE_LIMITED'
        });
    }

    // Generate new token (replaces old one via ON CONFLICT)
    const token = generateEmailVerificationToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await pool.query(`
        INSERT INTO Email_Verification (Account_ID, Token, Expires_At)
        VALUES ($1, $2, $3)
        ON CONFLICT (Account_ID)
        DO UPDATE SET
            Token = $2,
            Expires_At = $3,
            Created_At = NOW()
    `, [account.account_id, token, expiresAt]);

    // Send email
    await sendVerificationEmail(email, token);

    return res.json({
        success: true,
        message: 'Verification email sent'
    });
}
```

### Resend SMS Verification

**Endpoint**: `POST /auth/verify/sms/request`

```typescript
async function resendSMSVerification(req: Request, res: Response) {
    const { phoneNumber } = req.body;
    const accountId = req.claims.id;  // From JWT

    // RATE LIMITING: Check recent SMS sends
    const recentSMS = await pool.query(`
        SELECT Created_At
        FROM Phone_Verification
        WHERE Account_ID = $1
          AND Created_At > NOW() - INTERVAL '2 minutes'
    `, [accountId]);

    if (recentSMS.rows.length > 0) {
        const lastSent = new Date(recentSMS.rows[0].created_at);
        const waitSeconds = 120 - Math.floor((Date.now() - lastSent.getTime()) / 1000);

        return res.status(429).json({
            success: false,
            error: `Please wait ${waitSeconds} seconds before requesting another code`,
            errorCode: 'RATE_LIMITED',
            retryAfter: waitSeconds
        });
    }

    // Generate new code (replaces old one + resets attempts)
    const code = generateSMSCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(`
        INSERT INTO Phone_Verification (Account_ID, Phone_Number, Code, Expires_At, Attempts)
        VALUES ($1, $2, $3, $4, 0)
        ON CONFLICT (Account_ID)
        DO UPDATE SET
            Phone_Number = $2,
            Code = $3,
            Expires_At = $4,
            Attempts = 0,
            Created_At = NOW()
    `, [accountId, phoneNumber, code, expiresAt]);

    // Send SMS
    await sendSMS(phoneNumber, `Your verification code is: ${code}\nValid for 15 minutes.`);

    return res.json({
        success: true,
        message: 'Verification code sent'
    });
}
```

### Rate Limiting Strategies

| Strategy | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Time-based** | Simple to implement | Can still be abused | Email resend (5 min cooldown) |
| **IP-based** | Prevents distributed attacks | VPN/proxy bypass | Public endpoints |
| **Account-based** | Precise targeting | Requires authentication | SMS resend (authenticated) |
| **Token bucket** | Allows bursts | Complex to implement | High-traffic APIs |
| **Sliding window** | Smooth rate limiting | Memory overhead | Production-grade systems |

**Implementation: IP-based Rate Limiting**:
```typescript
import rateLimit from 'express-rate-limit';

const verificationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 3,  // 3 requests per window per IP
    message: {
        success: false,
        error: 'Too many verification requests. Please try again later.',
        errorCode: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,  // Return rate limit info in headers
    legacyHeaders: false
});

// Apply to verification endpoints
app.post('/auth/verify/email/request', verificationLimiter, resendEmailVerification);
app.post('/auth/verify/sms/request', verificationLimiter, resendSMSVerification);
```

---

## Security Considerations

### 1. Token Guessing Attacks

**Attack**: Brute-force token enumeration

**Email Token (64 hex chars)**:
```
Possible tokens: 16^64 = 2^256
Attempts needed: ~10^77

Even at 1 billion attempts/second:
Time to crack: Longer than age of universe
Verdict: IMPOSSIBLE
```

**SMS Code (6 digits)**:
```
Possible codes: 10^6 = 1,000,000
Attempts allowed: 3

Success probability: 3 / 1,000,000 = 0.0003%
Verdict: Acceptable with attempt limiting
```

**Defense**:
- Email: Long cryptographic tokens
- SMS: 3-attempt limit + 15-minute expiry
- Both: Rate limiting on requests

### 2. Timing Attacks

**Vulnerability**: Code comparison leaks information via timing

❌ **Vulnerable Code**:
```typescript
// Early return on mismatch
if (submittedCode !== storedCode) {
    return false;  // Returns faster if first digit wrong
}
```

**Attack**:
```
Attacker tries: 000000, 100000, 200000, ..., 900000
Measures response times
Finds first digit with slightly longer response
Repeats for remaining digits
```

✅ **Secure Code**:
```typescript
import crypto from 'crypto';

// Constant-time comparison
function verifyCode(submittedCode: string, storedCode: string): boolean {
    // Convert to buffers
    const submitted = Buffer.from(submittedCode, 'utf-8');
    const stored = Buffer.from(storedCode, 'utf-8');

    // Ensure same length (timing-safe check)
    if (submitted.length !== stored.length) {
        // Compare against dummy to prevent timing leak
        crypto.timingSafeEqual(submitted, Buffer.from('000000'));
        return false;
    }

    // Timing-safe comparison
    return crypto.timingSafeEqual(submitted, stored);
}
```

### 3. Email/Phone Enumeration

**Attack**: Discover which emails/phones are registered

❌ **Vulnerable Response**:
```typescript
// Different responses leak information
if (emailExists) {
    return res.json({ message: 'Verification email sent' });
} else {
    return res.status(404).json({ error: 'Email not found' });
}
```

✅ **Secure Response**:
```typescript
// Same response regardless
return res.json({
    success: true,
    message: 'If that email exists, a verification link has been sent'
});
```

### 4. Token/Code Replay Attacks

**Attack**: Reuse intercepted verification tokens

**Defense**:
```typescript
// Single-use tokens: Delete after verification
await pool.query(
    'DELETE FROM Email_Verification WHERE Token = $1',
    [token]
);

// Attempting to reuse:
const result = await pool.query(
    'SELECT * FROM Email_Verification WHERE Token = $1',
    [token]
);
// result.rows.length === 0 (token no longer exists)
```

### 5. SMS Interception (SIM Swapping)

**Attack**: Attacker convinces carrier to transfer victim's number

**Scenario**:
```
1. Attacker calls T-Mobile support
2. Social engineers: "I lost my phone, transfer my number to new SIM"
3. Carrier transfers victim's number to attacker's SIM
4. Attacker receives all SMS codes meant for victim
```

**Defense**:
- Use SMS as 2FA, not sole auth factor
- Offer TOTP (Google Authenticator) as alternative
- Monitor for SIM swap indicators (sudden location change)
- Implement backup codes for recovery

### 6. Email Forwarding Rules

**Attack**: Attacker sets up email forwarding

**Scenario**:
```
1. Attacker briefly accesses victim's email
2. Sets forwarding rule: Forward all emails to attacker@evil.com
3. Victim doesn't notice (rule is hidden)
4. All verification emails go to attacker
```

**Defense**:
- Email verification confirms access, not permanent ownership
- Require password re-entry for sensitive operations
- Monitor for unusual email settings changes

### 7. Link/Code Sharing

**Risk**: Users share verification links/codes

**User mistake**:
```
User receives: "Your code is 123456"
User posts on forum: "Help! What do I do with 123456?"
Attacker sees code and uses it
```

**Defense**:
- Clear messaging: "Do NOT share this code with anyone"
- Education: Explain what verification is for
- Short expiry (limits window of exposure)

---

## Implementation Examples

### Complete Email Verification Service

**File**: `src/core/utilities/emailService.ts`

```typescript
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import pool from '../db';

/**
 * Email verification service
 * Handles token generation, email sending, and validation
 */

// Configure email transporter (using Gmail as example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

/**
 * Generate cryptographically secure email verification token
 */
export function generateEmailVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Send verification email to user
 */
export async function sendVerificationEmail(
    email: string,
    accountId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        // Generate token
        const token = generateEmailVerificationToken();
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

        // Store in database
        await pool.query(`
            INSERT INTO Email_Verification (Account_ID, Token, Expires_At)
            VALUES ($1, $2, $3)
            ON CONFLICT (Account_ID)
            DO UPDATE SET
                Token = $2,
                Expires_At = $3,
                Created_At = NOW()
        `, [accountId, token, expiresAt]);

        // Build verification URL
        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:8000';
        const verificationUrl = `${baseUrl}/auth/verify/email/confirm?token=${token}`;

        // Send email
        await transporter.sendMail({
            from: '"TCSS-460 Team" <noreply@tcss460.edu>',
            to: email,
            subject: 'Verify Your Email Address',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .button {
                            display: inline-block;
                            padding: 12px 24px;
                            background-color: #4CAF50;
                            color: white;
                            text-decoration: none;
                            border-radius: 4px;
                        }
                        .footer { margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h2>Welcome to TCSS-460-auth-squared!</h2>
                        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>

                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        </p>

                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #0066cc;">${verificationUrl}</p>

                        <p><strong>This link will expire in 48 hours.</strong></p>

                        <div class="footer">
                            <p>If you didn't create an account, please ignore this email.</p>
                            <p>For security reasons, do not forward this email to anyone.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        });

        return { success: true };

    } catch (error) {
        console.error('Failed to send verification email:', error);
        return {
            success: false,
            error: 'Failed to send verification email'
        };
    }
}

/**
 * Validate and verify email token
 */
export async function verifyEmailToken(
    token: string
): Promise<{ success: boolean; accountId?: number; error?: string }> {
    try {
        // Validate token format
        if (!token || token.length !== 64 || !/^[0-9a-f]{64}$/i.test(token)) {
            return {
                success: false,
                error: 'Invalid token format'
            };
        }

        // Look up token
        const result = await pool.query(`
            SELECT
                ev.Account_ID,
                ev.Expires_At,
                a.Email_Verified
            FROM Email_Verification ev
            JOIN Account a ON ev.Account_ID = a.Account_ID
            WHERE ev.Token = $1
        `, [token]);

        if (result.rows.length === 0) {
            return {
                success: false,
                error: 'Invalid or expired verification token'
            };
        }

        const verification = result.rows[0];

        // Check if already verified
        if (verification.email_verified) {
            return {
                success: true,
                accountId: verification.account_id,
                error: 'Email already verified'
            };
        }

        // Check expiration
        if (new Date() > new Date(verification.expires_at)) {
            return {
                success: false,
                error: 'Verification token has expired'
            };
        }

        // Update account and delete token (transaction)
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            await client.query(
                'UPDATE Account SET Email_Verified = true WHERE Account_ID = $1',
                [verification.account_id]
            );

            await client.query(
                'DELETE FROM Email_Verification WHERE Account_ID = $1',
                [verification.account_id]
            );

            await client.query('COMMIT');

            return {
                success: true,
                accountId: verification.account_id
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Email verification error:', error);
        return {
            success: false,
            error: 'Failed to verify email'
        };
    }
}
```

### Complete SMS Verification Service

**File**: `src/core/utilities/smsService.ts`

```typescript
import crypto from 'crypto';
import pool from '../db';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

/**
 * SMS verification service
 * Handles code generation, SMS sending, and validation with attempt limiting
 */

// Configure AWS SNS for SMS (alternative: Twilio)
const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'us-west-2',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
    }
});

/**
 * Generate 6-digit SMS verification code
 */
export function generateSMSCode(): string {
    const code = crypto.randomInt(0, 1000000);
    return code.toString().padStart(6, '0');
}

/**
 * Send SMS verification code to user
 */
export async function sendSMSCode(
    phoneNumber: string,
    accountId: number
): Promise<{ success: boolean; error?: string }> {
    try {
        // Check rate limit
        const recentSMS = await pool.query(`
            SELECT Created_At
            FROM Phone_Verification
            WHERE Account_ID = $1
              AND Created_At > NOW() - INTERVAL '2 minutes'
        `, [accountId]);

        if (recentSMS.rows.length > 0) {
            const lastSent = new Date(recentSMS.rows[0].created_at);
            const waitSeconds = 120 - Math.floor((Date.now() - lastSent.getTime()) / 1000);

            return {
                success: false,
                error: `Please wait ${waitSeconds} seconds before requesting another code`
            };
        }

        // Generate code
        const code = generateSMSCode();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        // Store in database
        await pool.query(`
            INSERT INTO Phone_Verification (Account_ID, Phone_Number, Code, Expires_At, Attempts)
            VALUES ($1, $2, $3, $4, 0)
            ON CONFLICT (Account_ID)
            DO UPDATE SET
                Phone_Number = $2,
                Code = $3,
                Expires_At = $4,
                Attempts = 0,
                Created_At = NOW()
        `, [accountId, phoneNumber, code, expiresAt]);

        // Send SMS via AWS SNS
        const message = `Your TCSS-460 verification code is: ${code}\nValid for 15 minutes.\nDo not share this code.`;

        await snsClient.send(new PublishCommand({
            PhoneNumber: phoneNumber,
            Message: message,
            MessageAttributes: {
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional'  // Higher delivery priority
                }
            }
        }));

        return { success: true };

    } catch (error) {
        console.error('Failed to send SMS code:', error);
        return {
            success: false,
            error: 'Failed to send SMS code'
        };
    }
}

/**
 * Verify SMS code with attempt limiting
 */
export async function verifySMSCode(
    phoneNumber: string,
    submittedCode: string
): Promise<{
    success: boolean;
    accountId?: number;
    error?: string;
    attemptsRemaining?: number;
}> {
    try {
        // Validate code format
        if (!submittedCode || !/^\d{6}$/.test(submittedCode)) {
            return {
                success: false,
                error: 'Invalid code format (must be 6 digits)'
            };
        }

        // Look up verification record
        const result = await pool.query(`
            SELECT
                pv.Account_ID,
                pv.Code,
                pv.Expires_At,
                pv.Attempts
            FROM Phone_Verification pv
            WHERE pv.Phone_Number = $1
        `, [phoneNumber]);

        if (result.rows.length === 0) {
            return {
                success: false,
                error: 'No verification code found for this phone number'
            };
        }

        const verification = result.rows[0];

        // Check expiration
        if (new Date() > new Date(verification.expires_at)) {
            return {
                success: false,
                error: 'Verification code has expired. Please request a new code.'
            };
        }

        // Check attempt limit
        if (verification.attempts >= 3) {
            return {
                success: false,
                error: 'Too many failed attempts. Please request a new code.',
                attemptsRemaining: 0
            };
        }

        // Verify code (timing-safe comparison)
        const submittedBuffer = Buffer.from(submittedCode, 'utf-8');
        const storedBuffer = Buffer.from(verification.code, 'utf-8');

        if (!crypto.timingSafeEqual(submittedBuffer, storedBuffer)) {
            // Increment attempt counter
            await pool.query(
                'UPDATE Phone_Verification SET Attempts = Attempts + 1 WHERE Phone_Number = $1',
                [phoneNumber]
            );

            const remainingAttempts = 3 - (verification.attempts + 1);

            return {
                success: false,
                error: `Invalid code. ${remainingAttempts} attempt(s) remaining.`,
                attemptsRemaining: remainingAttempts
            };
        }

        // Code is correct! Update account and clean up
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Mark phone as verified
            await client.query(
                'UPDATE Account SET Phone_Verified = true WHERE Account_ID = $1',
                [verification.account_id]
            );

            // Delete verification record
            await client.query(
                'DELETE FROM Phone_Verification WHERE Phone_Number = $1',
                [phoneNumber]
            );

            await client.query('COMMIT');

            return {
                success: true,
                accountId: verification.account_id
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('SMS verification error:', error);
        return {
            success: false,
            error: 'Failed to verify SMS code'
        };
    }
}
```

---

## User Experience Considerations

### Email Verification UX

**Best Practices**:

1. **Clear Call-to-Action**
```html
<!-- Good: Prominent button -->
<a href="{verificationUrl}" style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white;">
    Verify Email Address
</a>

<!-- Bad: Plain link -->
<a href="{verificationUrl}">Click here</a>
```

2. **Mobile-Friendly Emails**
```html
<!-- Responsive design -->
<div style="max-width: 600px; margin: 0 auto;">
    <!-- Content adapts to screen size -->
</div>
```

3. **Expiration Visibility**
```
Subject: Verify Your Email (Expires in 48 hours)

Body: This link will expire in 48 hours.
```

4. **Resend Option**
```
Can't find the email?
[Resend Verification Email]

Link not working?
Copy and paste: https://app.com/verify?token=abc123...
```

### SMS Verification UX

**Best Practices**:

1. **Auto-fill Support** (iOS/Android)
```
Message format for auto-detection:
"Your verification code is: 123456"

iOS automatically detects and suggests auto-fill
Android SMS Retriever API can auto-enter code
```

2. **Code Display**
```html
<!-- Large, easy-to-read input -->
<input
    type="text"
    inputmode="numeric"  <!-- Shows numeric keyboard on mobile -->
    pattern="[0-9]{6}"
    maxlength="6"
    style="font-size: 24px; letter-spacing: 8px; text-align: center;"
    placeholder="000000"
/>
```

3. **Visual Countdown Timer**
```
Code expires in: 14:32

[Progress bar showing time remaining]

Button: "Resend Code" (disabled until 2 minutes elapsed)
```

4. **Attempt Feedback**
```
Attempt 1/3: ❌ Invalid code. 2 attempts remaining.
Attempt 2/3: ❌ Invalid code. 1 attempt remaining.
Attempt 3/3: ❌ Too many attempts. Please request a new code.
```

### Error Messages

**User-Friendly vs Technical**:

❌ **Bad** (too technical):
```
Error: Database query failed - constraint violation on FK Account_ID
```

✅ **Good** (user-friendly):
```
Something went wrong. Please try again or contact support.
```

**Specific Guidance**:

| Error | User-Friendly Message | Action Guidance |
|-------|---------------------|-----------------|
| Token expired | "This verification link has expired." | "Click here to request a new link" |
| Invalid token | "This verification link is invalid or has already been used." | "Check your email for the latest link" |
| Code expired | "This code has expired." | "Click 'Resend Code' to get a new one" |
| Too many attempts | "Too many incorrect attempts." | "Request a new code to try again" |
| Rate limited | "Please wait before requesting another code." | "Try again in 2 minutes" |

---

## Error Handling Patterns

### Centralized Error Response

```typescript
/**
 * Standardized error response format
 */
interface VerificationError {
    success: false;
    error: string;
    errorCode: string;
    details?: any;
    retryAfter?: number;  // For rate limiting
}

/**
 * Send standardized error response
 */
function sendVerificationError(
    res: Response,
    statusCode: number,
    message: string,
    errorCode: string,
    details?: any
): void {
    res.status(statusCode).json({
        success: false,
        error: message,
        errorCode,
        details,
        timestamp: new Date().toISOString()
    });
}
```

### Error Code System

```typescript
export enum VerificationErrorCode {
    // Email errors
    EMAIL_INVALID_TOKEN = 'EMAIL_INVALID_TOKEN',
    EMAIL_TOKEN_EXPIRED = 'EMAIL_TOKEN_EXPIRED',
    EMAIL_ALREADY_VERIFIED = 'EMAIL_ALREADY_VERIFIED',
    EMAIL_SEND_FAILED = 'EMAIL_SEND_FAILED',

    // SMS errors
    SMS_INVALID_CODE = 'SMS_INVALID_CODE',
    SMS_CODE_EXPIRED = 'SMS_CODE_EXPIRED',
    SMS_MAX_ATTEMPTS = 'SMS_MAX_ATTEMPTS',
    SMS_SEND_FAILED = 'SMS_SEND_FAILED',

    // Rate limiting
    RATE_LIMITED = 'RATE_LIMITED',

    // General
    INVALID_FORMAT = 'INVALID_FORMAT',
    DATABASE_ERROR = 'DATABASE_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

### Try-Catch Best Practices

```typescript
async function verifyEmail(req: Request, res: Response) {
    const { token } = req.query;

    try {
        // Validation
        if (!token || typeof token !== 'string') {
            return sendVerificationError(
                res,
                400,
                'Invalid token format',
                VerificationErrorCode.INVALID_FORMAT
            );
        }

        // Business logic
        const result = await verifyEmailToken(token as string);

        if (!result.success) {
            // Determine appropriate error code
            let errorCode = VerificationErrorCode.EMAIL_INVALID_TOKEN;
            if (result.error?.includes('expired')) {
                errorCode = VerificationErrorCode.EMAIL_TOKEN_EXPIRED;
            }

            return sendVerificationError(
                res,
                400,
                result.error!,
                errorCode
            );
        }

        // Success
        return res.json({
            success: true,
            message: 'Email verified successfully',
            accountId: result.accountId
        });

    } catch (error) {
        // Log error for debugging
        console.error('Email verification error:', error);

        // Don't expose internal errors to user
        return sendVerificationError(
            res,
            500,
            'An error occurred during verification',
            VerificationErrorCode.UNKNOWN_ERROR
        );
    }
}
```

### Transactional Rollback

```typescript
async function verifyAndUpdateAccount(token: string) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Validate token
        const tokenResult = await client.query(
            'SELECT Account_ID FROM Email_Verification WHERE Token = $1',
            [token]
        );

        if (tokenResult.rows.length === 0) {
            throw new Error('Invalid token');
        }

        // Step 2: Update account
        await client.query(
            'UPDATE Account SET Email_Verified = true WHERE Account_ID = $1',
            [tokenResult.rows[0].account_id]
        );

        // Step 3: Delete token
        await client.query(
            'DELETE FROM Email_Verification WHERE Token = $1',
            [token]
        );

        // Step 4: Create audit log
        await client.query(
            'INSERT INTO Audit_Log (Account_ID, Action, Timestamp) VALUES ($1, $2, NOW())',
            [tokenResult.rows[0].account_id, 'EMAIL_VERIFIED']
        );

        // All steps succeeded - commit transaction
        await client.query('COMMIT');

        return { success: true };

    } catch (error) {
        // Any error - rollback ALL changes
        await client.query('ROLLBACK');

        console.error('Transaction failed:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };

    } finally {
        // Always release connection back to pool
        client.release();
    }
}
```

---

## Common Edge Cases

### Edge Case 1: User Clicks Link Twice

**Scenario**:
```
1. User clicks verification link
2. Email is verified, token deleted
3. User refreshes page (or clicks link again)
4. System tries to verify again
```

**Solution**:
```typescript
// Check if already verified BEFORE checking token
const accountResult = await pool.query(
    'SELECT Email_Verified FROM Account WHERE Account_ID = $1',
    [accountId]
);

if (accountResult.rows[0].email_verified) {
    return res.json({
        success: true,
        message: 'Email is already verified!',
        alreadyVerified: true
    });
}

// Then check token...
```

### Edge Case 2: User Requests Multiple Codes

**Scenario**:
```
1. User requests SMS code (Code A)
2. Code A hasn't arrived yet
3. User requests another code (Code B)
4. Both codes arrive
5. User tries Code A (should fail)
```

**Solution**:
```typescript
// ON CONFLICT replaces old code with new one
await pool.query(`
    INSERT INTO Phone_Verification (Account_ID, Phone_Number, Code, Expires_At, Attempts)
    VALUES ($1, $2, $3, $4, 0)
    ON CONFLICT (Account_ID)
    DO UPDATE SET
        Code = $3,          -- New code replaces old
        Expires_At = $4,
        Attempts = 0,       -- Reset attempts
        Created_At = NOW()
`, [accountId, phoneNumber, newCode, expiresAt]);

// Only the LATEST code will work
```

### Edge Case 3: Token Expires While User Is Reading Email

**Scenario**:
```
Day 1, 10:00 AM: Verification email sent (expires Day 3, 10:00 AM)
Day 3, 9:59 AM: User opens email, reads it
Day 3, 10:01 AM: User clicks link (2 minutes later)
Result: Token expired
```

**Solution**:
```typescript
// Graceful expiry handling with resend option
if (new Date() > new Date(verification.expires_at)) {
    // Calculate how long it's been expired
    const expiredMinutes = Math.floor(
        (Date.now() - new Date(verification.expires_at).getTime()) / 60000
    );

    if (expiredMinutes <= 60) {
        // Recently expired - offer resend
        return res.status(400).json({
            success: false,
            error: 'Verification link expired',
            errorCode: 'TOKEN_EXPIRED',
            message: 'This link expired recently. Click below to receive a new one.',
            resendAvailable: true,
            email: verification.email
        });
    } else {
        // Long expired - just inform
        return res.status(400).json({
            success: false,
            error: 'Verification link expired',
            errorCode: 'TOKEN_EXPIRED',
            message: 'This link has expired. Please log in and request a new verification email.'
        });
    }
}
```

### Edge Case 4: User Changes Email Before Verifying

**Scenario**:
```
1. User registers with email1@example.com
2. Verification email sent to email1@example.com
3. User changes account email to email2@example.com
4. User clicks verification link from email1@example.com
5. Should this verify email2@example.com? (No!)
```

**Solution**:
```typescript
// Store email address WITH the token
CREATE TABLE Email_Verification (
    Account_ID INTEGER,
    Token VARCHAR(64),
    Email VARCHAR(255),  -- Store email at time of generation
    Expires_At TIMESTAMP,
    Created_At TIMESTAMP
);

// On verification, check that emails match
const tokenData = await pool.query(
    'SELECT Account_ID, Email FROM Email_Verification WHERE Token = $1',
    [token]
);

const accountData = await pool.query(
    'SELECT Email FROM Account WHERE Account_ID = $1',
    [tokenData.rows[0].account_id]
);

if (tokenData.rows[0].email !== accountData.rows[0].email) {
    return res.status(400).json({
        success: false,
        error: 'This verification link is no longer valid because your email address has changed.',
        message: 'Please request a new verification email.'
    });
}
```

### Edge Case 5: Concurrent Verification Attempts

**Scenario**:
```
User opens verification link in 3 browser tabs simultaneously
All 3 tabs try to verify at same time
```

**Solution**:
```typescript
// Use database transaction with SELECT FOR UPDATE
const client = await pool.connect();

try {
    await client.query('BEGIN');

    // Lock row to prevent concurrent updates
    const result = await client.query(`
        SELECT Account_ID, Email_Verified
        FROM Account
        WHERE Account_ID = $1
        FOR UPDATE  -- Locks this row until transaction completes
    `, [accountId]);

    if (result.rows[0].email_verified) {
        await client.query('COMMIT');
        return { success: true, message: 'Already verified' };
    }

    // Update account
    await client.query(
        'UPDATE Account SET Email_Verified = true WHERE Account_ID = $1',
        [accountId]
    );

    await client.query('COMMIT');
    return { success: true };

} catch (error) {
    await client.query('ROLLBACK');
    throw error;
} finally {
    client.release();
}
```

### Edge Case 6: SMS Code Contains Leading Zeros

**Scenario**:
```
Generated code: "000123"
User sees: "123" (phone strips leading zeros)
User enters: "123"
Comparison: "123" !== "000123" (fails)
```

**Solution**:
```typescript
// Always pad submitted code
function normalizeSMSCode(code: string): string {
    return code.trim().padStart(6, '0');
}

// In verification
const normalizedCode = normalizeSMSCode(submittedCode);
const isValid = crypto.timingSafeEqual(
    Buffer.from(normalizedCode),
    Buffer.from(storedCode)
);
```

### Edge Case 7: User Has No Email Access

**Scenario**:
```
User registers with work email
User gets fired, loses access to work email
User can't verify email or reset password
Account is permanently locked
```

**Solution**:
```typescript
// Allow registration without immediate verification
// Provide alternative verification methods
// Offer grace period for verification

// Option 1: Allow limited access without verification
if (!account.email_verified) {
    // Allow login but restrict features
    return {
        accessToken: generateToken(account),
        user: account,
        emailVerified: false,
        message: 'Please verify your email to access all features'
    };
}

// Option 2: Offer SMS as alternative
// Option 3: Admin-assisted verification
// Option 4: Grace period (30 days to verify)
```

### Edge Case 8: Spam Filter Blocks Verification Email

**Scenario**:
```
User registers
Verification email sent
Email provider marks as spam
User never receives email
```

**Solution**:
```typescript
// Monitoring and alerts
async function trackEmailDelivery(email: string, status: string) {
    await pool.query(
        'INSERT INTO Email_Delivery_Log (Email, Status, Timestamp) VALUES ($1, $2, NOW())',
        [email, status]
    );

    // Alert if delivery rate drops
    const recentFailures = await pool.query(`
        SELECT COUNT(*) as failures
        FROM Email_Delivery_Log
        WHERE Status = 'bounced'
          AND Timestamp > NOW() - INTERVAL '1 hour'
    `);

    if (recentFailures.rows[0].failures > 10) {
        // Alert admin: Email delivery issues
        notifyAdmin('High email bounce rate detected');
    }
}

// User-facing solutions
// 1. Check spam folder instructions
// 2. Whitelist sender address
// 3. Offer SMS as backup
// 4. Resend with different email service
```

---

## Summary and Key Takeaways

### Email Verification
- **Token**: 64-character hex (32 bytes entropy)
- **Expiry**: 48 hours
- **Delivery**: Asynchronous (email)
- **Validation**: Single-use token, one-click
- **Security**: Cryptographically secure, timing-safe comparison

### SMS Verification
- **Code**: 6-digit numeric
- **Expiry**: 15 minutes
- **Delivery**: Real-time (SMS)
- **Validation**: 3-attempt limit, manual entry
- **Security**: Attempt limiting, rate limiting, timing-safe comparison

### Critical Security Points
1. ✅ Use `crypto.randomBytes()` for token/code generation
2. ✅ Implement expiration on all verification methods
3. ✅ Use timing-safe comparison for codes
4. ✅ Rate limit verification requests (prevent abuse)
5. ✅ Delete tokens/codes after successful verification (single-use)
6. ✅ Use transactions for atomic updates
7. ✅ Prevent email/phone enumeration

### Best Practices
- Clear expiration communication to users
- Mobile-friendly email design
- Auto-fill support for SMS codes
- Resend functionality with rate limiting
- Graceful error handling
- User-friendly error messages
- Comprehensive edge case handling

### Database Design
- Separate tables for Email_Verification and Phone_Verification
- Use `ON CONFLICT DO UPDATE` for resend logic
- Implement cleanup jobs for expired records
- Use constraints to enforce data integrity
- Index on token/phone for fast lookups

---

## Related Guides

- **[Account Lifecycle Guide](./account-lifecycle-guide.md)** - Where verification fits in user journey
- **[Password Security Guide](./password-security-guide.md)** - Password reset with email verification
- **[Transaction Patterns Guide](./transaction-patterns-guide.md)** - Atomic verification updates

---

**Document Version**: 1.0
**Last Updated**: 2024-10-14
**Author**: TCSS-460-auth-squared Security Team
**License**: Educational use for TCSS-460 students

**Questions or feedback?** Contact your instructor or TA for clarification on verification workflows.
