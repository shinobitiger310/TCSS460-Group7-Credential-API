# Database Transaction Patterns

A comprehensive guide to implementing database transactions in TCSS-460-auth-squared for maintaining data consistency and integrity.

> **Related Code**: This guide references implementations in:
> - [`/src/core/utilities/transactionUtils.ts`](../src/core/utilities/transactionUtils.ts) - Transaction utility functions
> - [`/src/controllers/authController.ts`](../src/controllers/authController.ts) - User authentication transactions
> - [`/src/controllers/adminController.ts`](../src/controllers/adminController.ts) - Administrative transactions

## Quick Navigation

- [Review: Transaction Basics](#review-transaction-basics)
- [Transaction Utility Patterns](#transaction-utility-patterns)
- [Real-World Transaction Examples](#real-world-transaction-examples)
- [Error Handling & Rollback](#error-handling--rollback-scenarios)
- [When to Use Transactions](#when-to-use-transactions-vs-single-queries)
- [Common Mistakes](#common-mistakes--how-to-avoid-them)
- [Testing Transactions](#testing-transaction-logic)
- [Performance Considerations](#performance-considerations)

---

## Review: Transaction Basics

Before diving into patterns, let's review the fundamentals from [database-fundamentals.md](./database-fundamentals.md).

### What is a Database Transaction?

A **transaction** is a sequence of one or more database operations that are treated as a single, indivisible unit. Either ALL operations succeed together, or ALL operations are rolled back (undone) if any operation fails.

### The Three Transaction States

```sql
BEGIN;      -- Start transaction (create savepoint)
COMMIT;     -- Save all changes permanently
ROLLBACK;   -- Undo all changes, return to state before BEGIN
```

### ACID Properties Review

Transactions guarantee **ACID** properties:

- **Atomicity**: All operations succeed or all fail (no partial updates)
- **Consistency**: Database remains in valid state before and after
- **Isolation**: Concurrent transactions don't interfere with each other
- **Durability**: Once committed, changes survive system crashes

### Why Transactions Matter in Auth Systems

In authentication systems like TCSS-460-auth-squared, we frequently need to update multiple related tables:

1. **User Registration**: Create `Account` + create `Account_Credential`
2. **Password Changes**: Update credentials + update account timestamp
3. **Admin User Creation**: Create account + create credentials + set role

If these multi-step operations are interrupted (network failure, server crash, database error), we could end up with:
- Users without credentials (can never log in)
- Credentials without users (orphaned data)
- Inconsistent timestamps
- Partial role assignments

**Transactions prevent these inconsistencies.**

---

## Transaction Utility Patterns

TCSS-460-auth-squared provides two utility functions in `/src/core/utilities/transactionUtils.ts` that encapsulate transaction logic.

### Pattern 1: `withTransaction()` - Manual Response Handling

The `withTransaction()` utility handles transaction lifecycle (BEGIN/COMMIT/ROLLBACK) and returns a result object. **You control the HTTP response.**

#### Function Signature

```typescript
export interface TransactionResult<T> {
    success: boolean;
    data?: T;
    error?: Error;
}

export const withTransaction = async <T>(
    operation: (client: PoolClient) => Promise<T>
): Promise<TransactionResult<T>>
```

#### How It Works

```typescript
export const withTransaction = async <T>(
    operation: (client: PoolClient) => Promise<T>
): Promise<TransactionResult<T>> => {
    const pool = getPool();
    const client = await pool.connect();  // Get connection from pool

    try {
        await client.query('BEGIN');       // Start transaction
        const result = await operation(client);  // Execute your operations
        await client.query('COMMIT');      // Success: save changes

        return {
            success: true,
            data: result
        };
    } catch (error) {
        try {
            await client.query('ROLLBACK');  // Failure: undo all changes
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }

        return {
            success: false,
            error: error as Error
        };
    } finally {
        client.release();  // ALWAYS return connection to pool
    }
};
```

#### Key Features

1. **Automatic BEGIN/COMMIT/ROLLBACK**: You don't manage transaction state
2. **Connection Management**: Automatically acquires and releases connections
3. **Error Safety**: Even if ROLLBACK fails, connection is still released
4. **Type-Safe Results**: Generic `<T>` allows type-safe return values
5. **Manual Response Control**: You decide how to handle success/failure responses

#### When to Use `withTransaction()`

Use when you need:
- Custom response formatting
- Additional processing before sending response
- Multiple validation steps after transaction
- To check transaction results before responding

#### Example Usage

```typescript
static async customOperation(request: IJwtRequest, response: Response): Promise<void> {
    const { data } = request.body;

    // Execute transaction
    const result = await withTransaction(async (client) => {
        const firstResult = await client.query(
            'INSERT INTO TableA (name) VALUES ($1) RETURNING id',
            [data.name]
        );

        await client.query(
            'INSERT INTO TableB (table_a_id, value) VALUES ($1, $2)',
            [firstResult.rows[0].id, data.value]
        );

        return firstResult.rows[0];
    });

    // Custom response handling
    if (result.success) {
        // Maybe do additional work
        const additionalData = await someOtherOperation(result.data);

        sendSuccess(response, {
            id: result.data.id,
            additional: additionalData
        }, 'Operation successful');
    } else {
        console.error('Transaction failed:', result.error);
        sendError(response, 500, 'Operation failed', ErrorCodes.SRVR_TRANSACTION_FAILED);
    }
}
```

---

### Pattern 2: `executeTransactionWithResponse()` - Automatic Response Handling

The `executeTransactionWithResponse()` utility handles both transaction lifecycle AND HTTP responses automatically. **You just provide the operations.**

#### Function Signature

```typescript
export const executeTransactionWithResponse = async <T>(
    operation: (client: PoolClient) => Promise<T>,
    response: Response,
    successMessage?: string,
    errorMessage: string = 'Transaction failed'
): Promise<void>
```

#### How It Works

```typescript
export const executeTransactionWithResponse = async <T>(
    operation: (client: PoolClient) => Promise<T>,
    response: Response,
    successMessage?: string,
    errorMessage: string = 'Transaction failed'
): Promise<void> => {
    const result = await withTransaction(operation);

    if (result.success) {
        sendSuccess(response, result.data, successMessage);
    } else {
        console.error('Transaction error:', result.error);
        sendError(response, 500, errorMessage);
    }
};
```

**Notice**: It uses `withTransaction()` internally, then automatically sends the appropriate HTTP response.

#### Key Features

1. **Everything Automatic**: Transaction + HTTP response handled for you
2. **Simplified Code**: Cleaner controller methods
3. **Consistent Responses**: All transaction responses formatted identically
4. **Custom Messages**: Optionally provide success/error messages
5. **Less Boilerplate**: No need to check result.success manually

#### When to Use `executeTransactionWithResponse()`

Use when:
- Transaction result should directly become HTTP response
- No additional processing needed after transaction
- Consistent response format is acceptable
- You want minimal boilerplate code

This is the **most common pattern** in TCSS-460-auth-squared.

#### Example Usage

```typescript
static async createUser(request: IJwtRequest, response: Response): Promise<void> {
    const { firstname, lastname, email, password } = request.body;

    // That's it! Transaction + response handled automatically
    await executeTransactionWithResponse(
        async (client) => {
            // Your operations here
            const accountResult = await client.query(
                'INSERT INTO Account (FirstName, LastName, Email) VALUES ($1, $2, $3) RETURNING Account_ID',
                [firstname, lastname, email]
            );

            const accountId = accountResult.rows[0].account_id;

            const salt = generateSalt();
            const saltedHash = generateHash(password, salt);

            await client.query(
                'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
                [accountId, saltedHash, salt]
            );

            return { id: accountId, email };
        },
        response,
        'User created successfully',  // Success message
        'Failed to create user'       // Error message
    );
}
```

---

## Real-World Transaction Examples

Let's examine actual transaction implementations from TCSS-460-auth-squared controllers.

### Example 1: User Registration (Multi-Table Insert)

**Scenario**: Create new user account with credentials atomically.

**Location**: `/src/controllers/authController.ts` - `register()` method

**Why Transaction Needed**: Must create both `Account` and `Account_Credential` together. If credentials insert fails, we must undo the account creation to prevent orphaned accounts.

#### Without Transaction (DANGEROUS)

```typescript
// BAD: If step 2 fails, user account exists but has no credentials!
// User can never log in, but their email is "taken"
const accountResult = await pool.query(
    `INSERT INTO Account (FirstName, LastName, Email) VALUES ($1, $2, $3) RETURNING Account_ID`,
    [firstname, lastname, email]
);

const accountId = accountResult.rows[0].account_id;

// If this fails, we have an account without credentials!
await pool.query(
    'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
    [accountId, saltedHash, salt]
);
```

**Problem**: Network failure, constraint violation, or any error in step 2 leaves database in inconsistent state.

#### With Transaction (SAFE)

```typescript
// From authController.ts line 37
await executeTransactionWithResponse(
    async (client) => {
        // Step 1: Create account with role 1 (user)
        const insertAccountResult = await client.query(
            `INSERT INTO Account
             (FirstName, LastName, Username, Email, Phone, Account_Role, Email_Verified, Phone_Verified, Account_Status)
             VALUES ($1, $2, $3, $4, $5, 1, FALSE, FALSE, 'pending')
             RETURNING Account_ID`,
            [firstname, lastname, username, email, phone]
        );

        const accountId = insertAccountResult.rows[0].account_id;

        // Step 2: Generate salt and hash for password
        const salt = generateSalt();
        const saltedHash = generateHash(password, salt);

        // Step 3: Store credentials
        await client.query(
            'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
            [accountId, saltedHash, salt]
        );

        // Generate JWT token
        const token = generateAccessToken({
            id: accountId,
            email,
            role: 1
        });

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
                accountStatus: 'pending',
            },
        };
    },
    response,
    'User registration successful',
    'Registration failed'
);
```

**What Happens on Failure**:
1. Step 1 succeeds, account inserted
2. Step 2 or 3 fails (constraint violation, network error, etc.)
3. Transaction automatically executes ROLLBACK
4. Step 1 is undone - account row deleted
5. Database returns to state before transaction began
6. HTTP 500 error sent to client: "Registration failed"

**Data Integrity Maintained**: Either user has both account AND credentials, or has neither.

---

### Example 2: Password Change (Credential Update + Account Timestamp)

**Scenario**: User changes password - must update credentials and account record together.

**Location**: `/src/controllers/authController.ts` - `changePassword()` method

**Why Transaction Needed**: Password change should update credentials AND update the `Updated_At` timestamp on the account. If timestamp update fails, we still want password updated (or vice versa) - both should succeed or both should fail for audit trail consistency.

#### Implementation

```typescript
// From authController.ts line 202
await executeTransactionWithResponse(
    async (client) => {
        // Generate new salt and hash
        const newSalt = generateSalt();
        const newSaltedHash = generateHash(newPassword, newSalt);

        // Update password credentials
        await client.query(
            'UPDATE Account_Credential SET Salted_Hash = $1, Salt = $2 WHERE Account_ID = $3',
            [newSaltedHash, newSalt, userId]
        );

        // Update account timestamp for audit trail
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

#### Why Both Updates Matter

1. **Credentials Update**: New password hash and salt
2. **Timestamp Update**: Audit trail showing when account was modified

If we only updated credentials without updating `Updated_At`, administrators couldn't track when passwords were changed. If we only updated timestamp without credentials, password wouldn't change but timestamp would lie.

**Transaction ensures consistency**: Both updates succeed together, or neither happens.

---

### Example 3: Password Reset (Multi-Operation with Conditional Logic)

**Scenario**: Admin or user resets password - may need to INSERT or UPDATE credentials depending on whether they exist.

**Location**: `/src/controllers/authController.ts` - `resetPassword()` method

**Why Transaction Needed**: Must handle two possible scenarios atomically:
1. Credentials exist → UPDATE them
2. Credentials don't exist → INSERT them

Plus update account timestamp in both cases.

#### Implementation

```typescript
// From authController.ts line 316
await executeTransactionWithResponse(
    async (client) => {
        // Generate new salt and hash
        const salt = generateSalt();
        const saltedHash = generateHash(password, salt);

        // Try to update existing credentials
        const updateResult = await client.query(
            'UPDATE Account_Credential SET Salted_Hash = $1, Salt = $2 WHERE Account_ID = $3',
            [saltedHash, salt, userId]
        );

        // If no credentials exist, create them
        if (updateResult.rowCount === 0) {
            await client.query(
                'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
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

#### Transaction Flow

1. **Try UPDATE** on `Account_Credential`
2. **Check rowCount** - was anything updated?
3. **If rowCount === 0**: No existing credentials, so INSERT new ones
4. **Update account timestamp**
5. **COMMIT** - all operations succeeded

**What if INSERT fails?**: UPDATE and account timestamp update are rolled back - no partial changes.

**Edge Case Handled**: This pattern handles the scenario where an account exists but somehow has no credentials (perhaps from manual database manipulation or legacy data).

---

### Example 4: Admin User Creation (Role Assignment Transaction)

**Scenario**: Admin creates new user with specific role and account status.

**Location**: `/src/controllers/adminController.ts` - `createUser()` method

**Why Transaction Needed**: Similar to registration, but with admin-specified role. Must create account with correct role AND credentials together.

#### Implementation

```typescript
// From adminController.ts line 31
await executeTransactionWithResponse(
    async (client) => {
        // Create account with specified role
        const insertAccountResult = await client.query(
            `INSERT INTO Account
             (FirstName, LastName, Username, Email, Phone, Account_Role, Email_Verified, Phone_Verified, Account_Status)
             VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, 'active')
             RETURNING Account_ID`,
            [firstname, lastname, username, email, phone, userRole]
        );

        const accountId = insertAccountResult.rows[0].account_id;

        // Generate salt and hash for password
        const salt = generateSalt();
        const saltedHash = generateHash(password, salt);

        // Store credentials
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
                role: RoleName[userRole],
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
```

**Key Difference from Registration**:
- Account starts with `'active'` status (not `'pending'`)
- Role is admin-specified (not default role 1)
- Response includes role information for admin confirmation

**Transaction Benefit**: If role is invalid or credentials fail, no account is created. Admin doesn't need to manually clean up failed creations.

---

### Example 5: Admin Password Reset (Upsert Pattern)

**Scenario**: Admin resets user password - same as user reset but initiated by admin.

**Location**: `/src/controllers/adminController.ts` - `resetUserPassword()` method

#### Implementation

```typescript
// From adminController.ts line 473
await executeTransactionWithResponse(
    async (client) => {
        // Generate new salt and hash
        const salt = generateSalt();
        const saltedHash = generateHash(password, salt);

        // Update password in credentials table
        const updateResult = await client.query(
            'UPDATE Account_Credential SET Salted_Hash = $1, Salt = $2 WHERE Account_ID = $3',
            [saltedHash, salt, userId]
        );

        if (updateResult.rowCount === 0) {
            // If no credentials exist, create them
            await client.query(
                'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
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
    'Password reset successfully by admin',
    'Failed to reset password'
);
```

**Pattern**: Identical logic to user password reset, but different authorization check (admin vs. user token) and different success message.

---

## Error Handling & Rollback Scenarios

Understanding how transactions fail and recover is crucial for debugging and building reliable systems.

### Automatic Error Handling in `withTransaction()`

```typescript
try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');

    return { success: true, data: result };
} catch (error) {
    try {
        await client.query('ROLLBACK');  // Undo all changes
    } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
        // Even if rollback fails, connection is released in finally block
    }

    return { success: false, error: error as Error };
} finally {
    client.release();  // ALWAYS return connection to pool
}
```

### Common Failure Scenarios

#### 1. Constraint Violation

```typescript
await executeTransactionWithResponse(
    async (client) => {
        // This might violate UNIQUE constraint on email
        await client.query(
            'INSERT INTO Account (Email, Username) VALUES ($1, $2)',
            ['duplicate@email.com', 'user123']
        );

        // This never executes if first query fails
        await client.query(
            'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
            [accountId, hash, salt]
        );
    },
    response,
    'User created',
    'Failed to create user'  // This message is sent
);
```

**What Happens**:
1. First INSERT fails with unique constraint violation
2. Exception thrown, caught by transaction wrapper
3. ROLLBACK executed (nothing to rollback since first operation failed)
4. HTTP 500 response sent with "Failed to create user"
5. Connection returned to pool

#### 2. Foreign Key Violation

```typescript
await executeTransactionWithResponse(
    async (client) => {
        // Insert credential for non-existent account
        await client.query(
            'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
            [999999, hash, salt]  // Account ID 999999 doesn't exist
        );
    },
    response,
    'Credential created',
    'Failed to create credential'
);
```

**What Happens**:
1. INSERT fails with foreign key constraint violation
2. ROLLBACK executed
3. Error response sent
4. Database remains unchanged

#### 3. Network Interruption

```typescript
await executeTransactionWithResponse(
    async (client) => {
        // First operation succeeds
        await client.query(
            'INSERT INTO Account (...) VALUES (...)'
        );

        // Network fails here - connection to database lost
        await client.query(
            'INSERT INTO Account_Credential (...) VALUES (...)'
        );
    },
    response,
    'User created',
    'Failed to create user'
);
```

**What Happens**:
1. First INSERT succeeds and is held in transaction
2. Network failure prevents second INSERT
3. Exception thrown
4. ROLLBACK attempted (may fail due to network)
5. **PostgreSQL timeout**: Transaction automatically rolled back after timeout
6. Connection released from pool (marked as failed)
7. Error response sent (or connection error if response can't be sent)

**PostgreSQL Safety**: Even if our code can't send ROLLBACK due to network failure, PostgreSQL automatically rolls back transactions that don't receive COMMIT within timeout period.

#### 4. Application Logic Error

```typescript
await executeTransactionWithResponse(
    async (client) => {
        const accountResult = await client.query(
            'INSERT INTO Account (...) VALUES (...) RETURNING Account_ID'
        );

        const accountId = accountResult.rows[0].account_id;

        // Bug: Typo in variable name
        await client.query(
            'INSERT INTO Account_Credential (Account_ID, ...) VALUES ($1, ...)',
            [accountID]  // ReferenceError: accountID is not defined (should be accountId)
        );
    },
    response,
    'User created',
    'Failed to create user'
);
```

**What Happens**:
1. First INSERT succeeds
2. JavaScript ReferenceError thrown
3. Transaction wrapper catches error
4. ROLLBACK executed - first INSERT undone
5. Error logged to console
6. HTTP 500 error sent to client

**Benefit**: Even programming bugs don't leave database in inconsistent state.

---

### Rollback Recovery Example

Here's what a complete failure and recovery looks like:

```typescript
// Transaction begins
BEGIN;

// Step 1 succeeds
INSERT INTO Account (FirstName, Email) VALUES ('John', 'john@email.com') RETURNING Account_ID;
-- Returns: Account_ID = 42

// Step 2 fails (email constraint violation)
INSERT INTO Account_Credential (Account_ID, Email) VALUES (42, 'duplicate@email.com');
-- Error: duplicate key value violates unique constraint

// Automatic rollback
ROLLBACK;
-- Account with ID 42 is removed
-- Database returns to state before BEGIN
-- Account ID 42 is not consumed (can be reused)
```

**Result**: Database is exactly as it was before transaction started. No trace of the failed operation except in application logs.

---

## When to Use Transactions vs Single Queries

Not every database operation needs a transaction. Using transactions unnecessarily can harm performance.

### Use Transactions When:

#### 1. Multiple Related Inserts/Updates

```typescript
// YES - User registration (multiple tables)
await executeTransactionWithResponse(async (client) => {
    await client.query('INSERT INTO Account ...');
    await client.query('INSERT INTO Account_Credential ...');
}, response, 'User created', 'Registration failed');
```

#### 2. Conditional Operations

```typescript
// YES - Update or insert based on condition
await executeTransactionWithResponse(async (client) => {
    const result = await client.query('UPDATE Account_Credential SET ... WHERE ...');
    if (result.rowCount === 0) {
        await client.query('INSERT INTO Account_Credential ...');
    }
}, response, 'Credential updated', 'Update failed');
```

#### 3. Operations That Must Happen Together

```typescript
// YES - Transfer (subtract from one, add to another)
await withTransaction(async (client) => {
    await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
    await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
});
```

#### 4. Complex Business Logic

```typescript
// YES - Order processing (inventory, order record, payment)
await withTransaction(async (client) => {
    await client.query('UPDATE inventory SET quantity = quantity - $1 WHERE product_id = $2', [qty, productId]);
    await client.query('INSERT INTO orders (user_id, product_id, quantity) VALUES ($1, $2, $3)', [userId, productId, qty]);
    await client.query('INSERT INTO payments (order_id, amount) VALUES ($1, $2)', [orderId, total]);
});
```

---

### Don't Use Transactions For:

#### 1. Single INSERT/UPDATE/DELETE

```typescript
// NO - Single operation doesn't need transaction
const result = await pool.query(
    'UPDATE Account SET Email_Verified = TRUE WHERE Account_ID = $1',
    [userId]
);
sendSuccess(response, null, 'Email verified');
```

**Why not?**: Single operations are already atomic in PostgreSQL. Transaction adds overhead without benefit.

#### 2. Read-Only Operations (SELECT)

```typescript
// NO - Read operations don't modify data
const result = await pool.query(
    'SELECT * FROM Account WHERE Email = $1',
    [email]
);
sendSuccess(response, result.rows);
```

**Why not?**: No data changes = no consistency concerns. Transactions provide no benefit for reads.

#### 3. Operations Where Partial Success is Acceptable

```typescript
// NO - Logging can partially fail without corrupting application state
await pool.query('INSERT INTO activity_log (user_id, action) VALUES ($1, $2)', [userId, action]);
await pool.query('INSERT INTO audit_log (user_id, action) VALUES ($1, $2)', [userId, action]);
// If audit_log fails, activity_log can still be recorded
```

#### 4. Independent Operations

```typescript
// NO - These operations aren't related
await pool.query('UPDATE user_preferences SET theme = $1 WHERE user_id = $2', [theme, userId]);
await pool.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [userId, msg]);
// If notification fails, preference update should still happen
```

---

### Decision Matrix

| Scenario | Transaction Needed? | Why |
|----------|-------------------|-----|
| Create user account + credentials | ✅ Yes | Related data, must exist together |
| Update user email | ❌ No | Single operation |
| Search users by name | ❌ No | Read-only operation |
| Password change + timestamp update | ✅ Yes | Audit trail consistency |
| Log user activity | ❌ No | Can partially fail |
| Create order + update inventory | ✅ Yes | Business logic consistency |
| Get user profile | ❌ No | Read-only |
| Delete user + delete credentials | ✅ Yes | Related data, should be removed together |

---

## Common Mistakes & How to Avoid Them

### Mistake 1: Connection Leaks (Forgetting to Release)

#### The Problem

```typescript
// BAD: Connection leak
async function getUserData(userId: number) {
    const client = await pool.connect();
    const result = await client.query('SELECT * FROM Account WHERE Account_ID = $1', [userId]);

    if (result.rowCount === 0) {
        return null;  // Connection never released!
    }

    client.release();
    return result.rows[0];
}

// After 20 calls with no user found, connection pool is exhausted
// New requests fail with "connection pool exhausted" error
```

#### The Solution

```typescript
// GOOD: Always release in finally block
async function getUserData(userId: number) {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM Account WHERE Account_ID = $1', [userId]);
        return result.rowCount > 0 ? result.rows[0] : null;
    } finally {
        client.release();  // ALWAYS executed
    }
}
```

#### Best Practice

**Use transaction utilities** - they handle connection release automatically:

```typescript
// BEST: Use transaction utilities
const result = await withTransaction(async (client) => {
    const data = await client.query('SELECT * FROM Account WHERE Account_ID = $1', [userId]);
    return data.rows[0];
});
// Connection automatically released
```

---

### Mistake 2: Nested Transactions (Not Supported in PostgreSQL)

#### The Problem

```typescript
// BAD: Nested transactions
await withTransaction(async (client) => {
    await client.query('INSERT INTO Account ...');

    // This fails! Already in a transaction
    await withTransaction(async (innerClient) => {
        await innerClient.query('INSERT INTO Account_Credential ...');
    });
});
// Error: current transaction is aborted
```

**PostgreSQL doesn't support nested transactions** using BEGIN/COMMIT. Once BEGIN is called, another BEGIN fails.

#### The Solution

```typescript
// GOOD: Use single transaction for all operations
await withTransaction(async (client) => {
    await client.query('INSERT INTO Account ...');
    await client.query('INSERT INTO Account_Credential ...');
    // All operations in same transaction
});
```

#### Advanced: Savepoints (Optional)

If you need rollback points within a transaction:

```typescript
await withTransaction(async (client) => {
    await client.query('INSERT INTO Account ...');

    await client.query('SAVEPOINT credentials_insert');
    try {
        await client.query('INSERT INTO Account_Credential ...');
    } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT credentials_insert');
        // Account insert is preserved, credentials insert rolled back
    }
    await client.query('RELEASE SAVEPOINT credentials_insert');
});
```

**Note**: Savepoints are advanced and rarely needed. Prefer simple transactions.

---

### Mistake 3: Using pool.query() Instead of client.query() in Transactions

#### The Problem

```typescript
// BAD: Using pool.query() inside transaction
await withTransaction(async (client) => {
    await client.query('INSERT INTO Account ...');

    // This gets a DIFFERENT connection from the pool!
    // Not part of the transaction!
    await pool.query('INSERT INTO Account_Credential ...');

    // If this fails, first INSERT is committed, second isn't
});
```

#### The Solution

```typescript
// GOOD: Use client parameter for all queries
await withTransaction(async (client) => {
    await client.query('INSERT INTO Account ...');
    await client.query('INSERT INTO Account_Credential ...');
    // Both use same connection = same transaction
});
```

**Rule**: Inside transaction callback, ONLY use the `client` parameter, never `pool`.

---

### Mistake 4: Long-Running Transactions

#### The Problem

```typescript
// BAD: Long-running transaction
await executeTransactionWithResponse(
    async (client) => {
        await client.query('INSERT INTO Account ...');

        // External API call - might take 10 seconds!
        await sendEmailVerification(email);

        // File upload - might take 30 seconds!
        await uploadProfilePicture(file);

        await client.query('INSERT INTO Account_Credential ...');
    },
    response,
    'User created',
    'Failed to create user'
);
```

**Problems**:
- Holds database connection for long time
- Blocks other transactions waiting for same rows
- Connection pool exhaustion
- Transaction timeout and automatic rollback

#### The Solution

```typescript
// GOOD: Fast transaction, external operations outside
let userId;

await executeTransactionWithResponse(
    async (client) => {
        const result = await client.query('INSERT INTO Account ... RETURNING Account_ID');
        userId = result.rows[0].account_id;

        await client.query('INSERT INTO Account_Credential ...');
        // Transaction completes quickly
    },
    response,
    'User created',
    'Failed to create user'
);

// External operations AFTER transaction commits
try {
    await sendEmailVerification(email);
    await uploadProfilePicture(file);
} catch (error) {
    // User is created, but email/upload failed
    // Log error, maybe set flag to retry later
    console.error('Post-creation tasks failed:', error);
}
```

**Rule**: Keep transactions as short as possible. Only include database operations.

---

### Mistake 5: Not Handling Errors Properly

#### The Problem

```typescript
// BAD: Swallowing errors
await executeTransactionWithResponse(
    async (client) => {
        try {
            await client.query('INSERT INTO Account ...');
            await client.query('INSERT INTO Account_Credential ...');
        } catch (error) {
            console.log('Error occurred');
            // Error swallowed, transaction thinks everything succeeded
        }
    },
    response,
    'User created',
    'Failed'
);
```

**Result**: Transaction commits even though operations failed!

#### The Solution

```typescript
// GOOD: Let errors propagate
await executeTransactionWithResponse(
    async (client) => {
        await client.query('INSERT INTO Account ...');
        await client.query('INSERT INTO Account_Credential ...');
        // Errors automatically caught by transaction wrapper
    },
    response,
    'User created',
    'Failed to create user'
);
```

**Rule**: Don't catch errors inside transaction operations unless you re-throw them.

---

### Mistake 6: Returning Wrong Data Type

#### The Problem

```typescript
// BAD: Returning client instead of data
const result = await withTransaction(async (client) => {
    await client.query('INSERT INTO Account ...');
    return client;  // Wrong! Client will be released
});

// result.data is a released client - can't use it
```

#### The Solution

```typescript
// GOOD: Return the data you need
const result = await withTransaction(async (client) => {
    const accountResult = await client.query(
        'INSERT INTO Account ... RETURNING Account_ID, Email'
    );
    return accountResult.rows[0];  // Return data, not client
});

// result.data is the account data
if (result.success) {
    console.log('Created account:', result.data.account_id);
}
```

---

## Testing Transaction Logic

Testing transactions requires special considerations to ensure tests are isolated and repeatable.

### Strategy 1: Test Database with Automatic Cleanup

```typescript
import { Pool } from 'pg';

let testPool: Pool;

beforeAll(async () => {
    // Create connection pool to test database
    testPool = new Pool({
        host: 'localhost',
        database: 'auth_test',  // Separate test database
        user: 'test_user',
        password: 'test_password',
    });
});

afterAll(async () => {
    // Clean up
    await testPool.end();
});

beforeEach(async () => {
    // Clear all data before each test
    await testPool.query('TRUNCATE Account, Account_Credential CASCADE');
});

describe('User Registration Transaction', () => {
    it('should create account and credentials together', async () => {
        // Test implementation
    });

    it('should rollback both if credentials fail', async () => {
        // Test rollback behavior
    });
});
```

### Strategy 2: Transaction Rollback in Tests

```typescript
describe('Transaction Tests', () => {
    let client: PoolClient;

    beforeEach(async () => {
        client = await testPool.connect();
        await client.query('BEGIN');  // Start transaction
    });

    afterEach(async () => {
        await client.query('ROLLBACK');  // Rollback after each test
        client.release();
        // Database returns to original state
    });

    it('should insert account successfully', async () => {
        const result = await client.query(
            'INSERT INTO Account (Email, Username) VALUES ($1, $2) RETURNING Account_ID',
            ['test@email.com', 'testuser']
        );
        expect(result.rowCount).toBe(1);
        // Rolled back in afterEach - doesn't affect other tests
    });
});
```

### Strategy 3: Testing Rollback Behavior

```typescript
describe('Registration Rollback', () => {
    it('should not create account if credentials insert fails', async () => {
        const email = 'test@email.com';

        try {
            await executeTransactionWithResponse(
                async (client) => {
                    const accountResult = await client.query(
                        'INSERT INTO Account (Email, Username) VALUES ($1, $2) RETURNING Account_ID',
                        [email, 'testuser']
                    );

                    // Force failure - invalid foreign key
                    await client.query(
                        'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
                        [999999, 'hash', 'salt']  // Non-existent account ID
                    );
                },
                mockResponse,
                'Created',
                'Failed'
            );
        } catch (error) {
            // Expected to fail
        }

        // Verify account was NOT created
        const checkResult = await testPool.query(
            'SELECT * FROM Account WHERE Email = $1',
            [email]
        );
        expect(checkResult.rowCount).toBe(0);  // Should be rolled back
    });
});
```

### Strategy 4: Integration Tests with Real Database

```typescript
describe('Full Registration Flow', () => {
    it('should register user with account and credentials', async () => {
        const userData = {
            firstname: 'John',
            lastname: 'Doe',
            email: 'john@email.com',
            username: 'johndoe',
            password: 'SecurePass123!',
            phone: '555-1234'
        };

        // Mock request and response
        const mockRequest = {
            body: userData
        };
        const mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        // Call actual controller method
        await AuthController.register(mockRequest, mockResponse);

        // Verify success response
        expect(mockResponse.status).toHaveBeenCalledWith(200);

        // Verify account was created
        const accountCheck = await testPool.query(
            'SELECT * FROM Account WHERE Email = $1',
            [userData.email]
        );
        expect(accountCheck.rowCount).toBe(1);

        // Verify credentials were created
        const accountId = accountCheck.rows[0].account_id;
        const credCheck = await testPool.query(
            'SELECT * FROM Account_Credential WHERE Account_ID = $1',
            [accountId]
        );
        expect(credCheck.rowCount).toBe(1);
    });
});
```

---

## Performance Considerations

Transactions impact performance. Understanding these considerations helps build fast, scalable applications.

### 1. Transaction Overhead

Every transaction has overhead:

```typescript
// Transaction: ~2-5ms overhead
await withTransaction(async (client) => {
    await client.query('INSERT INTO Account ...');  // ~3ms
    await client.query('INSERT INTO Account_Credential ...');  // ~3ms
});
// Total: ~8-11ms

// Without transaction: ~6ms total
await pool.query('INSERT INTO Account ...');  // ~3ms
await pool.query('INSERT INTO Account_Credential ...');  // ~3ms
// But: No atomicity guarantee!
```

**Takeaway**: Transaction overhead is small (2-5ms) but measurable. The consistency guarantee is worth it for related operations.

### 2. Lock Contention

Transactions hold locks on rows being modified:

```typescript
// Transaction 1: Holds lock on Account ID 42
await withTransaction(async (client) => {
    await client.query('UPDATE Account SET Email = $1 WHERE Account_ID = 42', [newEmail]);
    await performSlowOperation();  // Holds lock during this!
    await client.query('UPDATE Account_Credential SET ... WHERE Account_ID = 42');
});

// Transaction 2: Waits for lock on Account ID 42
await withTransaction(async (client) => {
    // This blocks until Transaction 1 commits or rolls back
    await client.query('UPDATE Account SET Username = $1 WHERE Account_ID = 42', [newUsername]);
});
```

**Solution**: Keep transactions short to minimize lock duration.

### 3. Connection Pool Sizing

Transactions consume connection pool resources:

```typescript
// Pool configuration
const pool = new Pool({
    max: 20  // Maximum 20 concurrent connections
});

// If 20 transactions are running, 21st request waits
await withTransaction(async (client) => {
    // Connection held for duration of transaction
});
```

**Best Practices**:
- Size pool based on expected concurrent transactions
- Monitor pool usage: `pool.totalCount`, `pool.idleCount`, `pool.waitingCount`
- Default max=10 is good for small apps, increase for high concurrency

### 4. Batch Operations vs. Multiple Transactions

```typescript
// SLOW: 100 separate transactions
for (let i = 0; i < 100; i++) {
    await withTransaction(async (client) => {
        await client.query('INSERT INTO Account ...');
    });
}
// ~1000ms total (100 × 10ms per transaction)

// FAST: Single transaction with batch insert
await withTransaction(async (client) => {
    // Build values array: ($1, $2), ($3, $4), ...
    const values = users.flatMap(u => [u.email, u.username]);
    const placeholders = users.map((_, i) =>
        `($${i*2+1}, $${i*2+2})`
    ).join(', ');

    await client.query(
        `INSERT INTO Account (Email, Username) VALUES ${placeholders}`,
        values
    );
});
// ~50ms total (single transaction)
```

**Takeaway**: Batch related operations into single transaction when possible.

### 5. Read-Only Transactions (Advanced)

For read-heavy operations across multiple tables:

```typescript
// Read-only transaction: Can use query optimizations
await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
const accounts = await client.query('SELECT * FROM Account WHERE ...');
const credentials = await client.query('SELECT * FROM Account_Credential WHERE ...');
await client.query('COMMIT');

// Ensures consistent snapshot of data across queries
// PostgreSQL can optimize since it knows no writes occur
```

**Use case**: Generating reports that query multiple tables - ensures data consistency across queries.

### 6. Monitoring Transaction Performance

```typescript
// Add timing to transactions
const startTime = Date.now();
const result = await withTransaction(async (client) => {
    // Operations
});
const duration = Date.now() - startTime;

if (duration > 100) {  // Log slow transactions
    console.warn(`Slow transaction: ${duration}ms`);
}
```

**PostgreSQL Monitoring**:

```sql
-- Find long-running transactions
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '5 seconds';

-- Kill long-running transaction
SELECT pg_terminate_backend(pid);
```

---

## Summary: Transaction Best Practices

### Do's ✅

1. **Use `executeTransactionWithResponse()` for standard CRUD operations**
   - Simplest pattern for most use cases
   - Automatic error handling and HTTP responses

2. **Use `withTransaction()` when you need custom response handling**
   - Gives you control over response format
   - Useful for complex validation logic

3. **Keep transactions SHORT**
   - Only include database operations
   - No external API calls, file uploads, or long computations

4. **Use transactions for related operations**
   - Multi-table inserts/updates that must succeed together
   - Operations where partial success corrupts data

5. **Let errors propagate**
   - Don't catch exceptions inside transaction operations
   - Transaction wrapper handles rollback automatically

6. **Use the `client` parameter inside transactions**
   - Never use `pool.query()` inside transaction callback
   - All operations must use same connection

### Don'ts ❌

1. **Don't use transactions for single operations**
   - Single INSERT/UPDATE is already atomic
   - Transaction adds overhead without benefit

2. **Don't use transactions for read-only operations**
   - SELECT queries don't modify data
   - No consistency concerns

3. **Don't nest transactions**
   - PostgreSQL doesn't support nested BEGIN/COMMIT
   - Use single transaction for all related operations

4. **Don't hold connections without releasing**
   - Always use `finally` block to release
   - Or use transaction utilities that handle it

5. **Don't include external operations in transactions**
   - API calls, file I/O, email sending belong OUTSIDE transactions
   - Keep transactions fast

6. **Don't ignore transaction results**
   - Check `result.success` when using `withTransaction()`
   - Log errors for debugging

---

## Further Reading

- [PostgreSQL Transaction Documentation](https://www.postgresql.org/docs/current/tutorial-transactions.html)
- [ACID Properties Explained](https://en.wikipedia.org/wiki/ACID)
- [Node-Postgres Transaction Examples](https://node-postgres.com/features/transactions)
- [Database Isolation Levels](https://www.postgresql.org/docs/current/transaction-iso.html)
- [TCSS-460-auth-squared Database Fundamentals](./database-fundamentals.md)

---

## Related Guides

- **[Database Fundamentals](./database-fundamentals.md)** - Transaction basics and ACID properties
- **[Account Lifecycle Guide](./account-lifecycle-guide.md)** - User operations using transactions
- **[Verification Workflows Guide](./verification-workflows-guide.md)** - Verification state updates in transactions

---

**Understanding transaction patterns is essential for building reliable, data-consistent applications. The patterns in this guide ensure your authentication system maintains data integrity even under failure conditions.**
