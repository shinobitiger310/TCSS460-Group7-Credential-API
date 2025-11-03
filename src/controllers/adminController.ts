// src/controllers/adminController.ts
import { Response } from 'express';
import {
    pool,
    sendSuccess,
    sendError,
    ErrorCodes,
    generateSalt,
    generateHash,
    validateUserUniqueness,
    executeTransactionWithResponse
} from '@utilities';
import { IJwtRequest, UserRole, RoleName } from '@models';

export class AdminController {
    /**
     * POST /admin/users/create - Create user with specified role
     */
    static async createUser(request: IJwtRequest, response: Response): Promise<void> {
        const { firstname, lastname, email, password, username, phone, role } = request.body;
        const adminRole = request.claims?.role || UserRole.USER;

        // Validate role hierarchy - admin can only create users with lower roles
        const targetRole = role || UserRole.USER;
        if (targetRole >= adminRole) {
            sendError(response, 403, 'Cannot create user with equal or higher role', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
            return;
        }

        // Check if user already exists
        const userExists = await validateUserUniqueness(
            { email, username, phone },
            response
        );
        if (userExists) return;

        // Execute user creation transaction
        await executeTransactionWithResponse(
            async (client) => {
                // Create account with specified role
                const insertAccountResult = await client.query(
                    `INSERT INTO Account
                     (FirstName, LastName, Username, Email, Phone, Account_Role, Email_Verified, Phone_Verified, Account_Status)
                     VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, 'active')
                     RETURNING Account_ID`,
                    [firstname, lastname, username, email, phone, targetRole]
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
                        firstname,
                        lastname,
                        username,
                        phone,
                        role: RoleName[targetRole],
                        accountStatus: 'active',
                    },
                };
            },
            response,
            'User created successfully',
            'Failed to create user'
        );
    }

    /**
     * GET /admin/users - List users with pagination and filters
     */
    static async listUsers(request: IJwtRequest, response: Response): Promise<void> {
        try {
            // Get pagination and filter params
            const page = parseInt(request.query.page as string) || 1;
            const limit = parseInt(request.query.limit as string) || 20;
            const role = request.query.role ? parseInt(request.query.role as string) : null;
            const status = request.query.status as string;
            const emailVerified = request.query.emailVerified === 'true' ? true : 
                                 request.query.emailVerified === 'false' ? false : null;

            const offset = (page - 1) * limit;

            // Build WHERE clause
            const conditions: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (role !== null) {
                conditions.push(`Account_Role = $${paramIndex++}`);
                params.push(role);
            }

            if (status) {
                conditions.push(`Account_Status = $${paramIndex++}`);
                params.push(status);
            }

            if (emailVerified !== null) {
                conditions.push(`Email_Verified = $${paramIndex++}`);
                params.push(emailVerified);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            // Get total count
            const countResult = await pool.query(
                `SELECT COUNT(*) as total FROM Account ${whereClause}`,
                params
            );
            const total = parseInt(countResult.rows[0].total);

            // Get users
            params.push(limit, offset);
            const usersResult = await pool.query(
                `SELECT 
                    Account_ID as id,
                    FirstName as firstname,
                    LastName as lastname,
                    Username as username,
                    Email as email,
                    Phone as phone,
                    Account_Role as role,
                    Email_Verified as email_verified,
                    Phone_Verified as phone_verified,
                    Account_Status as account_status,
                    Created_At as created_at,
                    Updated_At as updated_at
                FROM Account
                ${whereClause}
                ORDER BY Created_At DESC
                LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
                params
            );

            // Map role numbers to names
            const users = usersResult.rows.map(user => ({
                ...user,
                role_name: RoleName[user.role as UserRole]
            }));

            sendSuccess(response, {
                users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                }
            }, 'Users retrieved successfully');

        } catch (error) {
            console.error('List users error:', error);
            sendError(response, 500, 'Failed to retrieve users', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * GET /admin/users/search - Search users by name, email, or username
     */
    static async searchUsers(request: IJwtRequest, response: Response): Promise<void> {
        try {
            const query = request.query.q as string;
            const limit = parseInt(request.query.limit as string) || 20;

            if (!query || query.trim().length < 2) {
                sendError(response, 400, 'Search query must be at least 2 characters', ErrorCodes.VALD_MISSING_FIELDS);
                return;
            }

            const searchPattern = `%${query.trim()}%`;

            const usersResult = await pool.query(
                `SELECT 
                    Account_ID as id,
                    FirstName as firstname,
                    LastName as lastname,
                    Username as username,
                    Email as email,
                    Phone as phone,
                    Account_Role as role,
                    Email_Verified as email_verified,
                    Phone_Verified as phone_verified,
                    Account_Status as account_status,
                    Created_At as created_at
                FROM Account
                WHERE 
                    FirstName ILIKE $1 OR
                    LastName ILIKE $1 OR
                    Username ILIKE $1 OR
                    Email ILIKE $1
                ORDER BY Created_At DESC
                LIMIT $2`,
                [searchPattern, limit]
            );

            // Map role numbers to names
            const users = usersResult.rows.map(user => ({
                ...user,
                role_name: RoleName[user.role as UserRole]
            }));

            sendSuccess(response, {
                users,
                count: users.length,
                query: query.trim()
            }, 'Search completed successfully');

        } catch (error) {
            console.error('Search users error:', error);
            sendError(response, 500, 'Failed to search users', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * PUT /admin/users/:id/role - Change user role
     */
    static async changeUserRole(request: IJwtRequest, response: Response): Promise<void> {
        const targetUserId = parseInt(request.params.id);
        const { role: newRole } = request.body;
        const adminRole = request.claims?.role || UserRole.USER;
        const adminId = request.claims?.id;

        try {
            // Validate new role
            if (!newRole || newRole < UserRole.USER || newRole > UserRole.OWNER) {
                sendError(response, 400, 'Invalid role value', ErrorCodes.VALD_INVALID_INPUT);
                return;
            }

            // Cannot change own role
            if (targetUserId === adminId) {
                sendError(response, 403, 'Cannot change your own role', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            // Get target user's current role
            const userResult = await pool.query(
                'SELECT Account_Role, FirstName, LastName FROM Account WHERE Account_ID = $1',
                [targetUserId]
            );

            if (userResult.rowCount === 0) {
                sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const currentRole = userResult.rows[0].account_role;

            // Admin can only change roles below their own level
            if (currentRole >= adminRole) {
                sendError(response, 403, 'Cannot modify user with equal or higher role', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            if (newRole >= adminRole) {
                sendError(response, 403, 'Cannot assign equal or higher role', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            // Update role
            await pool.query(
                'UPDATE Account SET Account_Role = $1, Updated_At = NOW() WHERE Account_ID = $2',
                [newRole, targetUserId]
            );

            sendSuccess(response, {
                userId: targetUserId,
                oldRole: RoleName[currentRole as UserRole],
                newRole: RoleName[newRole as UserRole],
            }, 'User role updated successfully');

        } catch (error) {
            console.error('Change role error:', error);
            sendError(response, 500, 'Failed to change user role', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * GET /admin/users/stats/dashboard - Get dashboard statistics
     */
    static async getDashboardStats(request: IJwtRequest, response: Response): Promise<void> {
        try {
            // Get total users
            const totalResult = await pool.query('SELECT COUNT(*) as count FROM Account');
            const totalUsers = parseInt(totalResult.rows[0].count);

            // Get users by role
            const roleResult = await pool.query(
                `SELECT Account_Role as role, COUNT(*) as count 
                FROM Account 
                GROUP BY Account_Role 
                ORDER BY Account_Role`
            );
            const usersByRole = roleResult.rows.map(row => ({
                role: RoleName[row.role as UserRole],
                roleNumber: row.role,
                count: parseInt(row.count)
            }));

            // Get users by status
            const statusResult = await pool.query(
                `SELECT Account_Status as status, COUNT(*) as count 
                FROM Account 
                GROUP BY Account_Status`
            );
            const usersByStatus = statusResult.rows.map(row => ({
                status: row.status,
                count: parseInt(row.count)
            }));

            // Get verification stats
            const verificationResult = await pool.query(
                `SELECT 
                    COUNT(CASE WHEN Email_Verified = true THEN 1 END) as email_verified,
                    COUNT(CASE WHEN Phone_Verified = true THEN 1 END) as phone_verified,
                    COUNT(CASE WHEN Email_Verified = true AND Phone_Verified = true THEN 1 END) as both_verified
                FROM Account`
            );
            const verificationStats = {
                emailVerified: parseInt(verificationResult.rows[0].email_verified),
                phoneVerified: parseInt(verificationResult.rows[0].phone_verified),
                bothVerified: parseInt(verificationResult.rows[0].both_verified)
            };

            // Get recent users (last 7 days)
            const recentResult = await pool.query(
                `SELECT COUNT(*) as count 
                FROM Account 
                WHERE Created_At >= NOW() - INTERVAL '7 days'`
            );
            const recentUsers = parseInt(recentResult.rows[0].count);

            sendSuccess(response, {
                totalUsers,
                usersByRole,
                usersByStatus,
                verificationStats,
                recentUsers,
                generatedAt: new Date().toISOString()
            }, 'Dashboard statistics retrieved successfully');

        } catch (error) {
            console.error('Dashboard stats error:', error);
            sendError(response, 500, 'Failed to retrieve dashboard statistics', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * PUT /admin/users/:id/password - Admin password reset
     */
    static async resetUserPassword(request: IJwtRequest, response: Response): Promise<void> {
        const targetUserId = parseInt(request.params.id);
        const { password } = request.body;
        const adminRole = request.claims?.role || UserRole.USER;
        const adminId = request.claims?.id;

        try {
            // Validate password
            if (!password || password.length < 8) {
                sendError(response, 400, 'Password must be at least 8 characters', ErrorCodes.VALD_INVALID_PASSWORD);
                return;
            }

            // Cannot reset own password via admin endpoint
            if (targetUserId === adminId) {
                sendError(response, 403, 'Cannot reset your own password via admin endpoint', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            // Get target user's role
            const userResult = await pool.query(
                'SELECT Account_Role, FirstName, LastName, Email FROM Account WHERE Account_ID = $1',
                [targetUserId]
            );

            if (userResult.rowCount === 0) {
                sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const currentRole = userResult.rows[0].account_role;

            // Admin can only reset passwords for users below their own level
            if (currentRole >= adminRole) {
                sendError(response, 403, 'Cannot reset password for user with equal or higher role', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            // Execute password reset transaction
            await executeTransactionWithResponse(
                async (client) => {
                    // Generate new salt and hash
                    const salt = generateSalt();
                    const saltedHash = generateHash(password, salt);

                    // Update password
                    const updateResult = await client.query(
                        'UPDATE Account_Credential SET Salted_Hash = $1, Salt = $2 WHERE Account_ID = $3',
                        [saltedHash, salt, targetUserId]
                    );

                    if (updateResult.rowCount === 0) {
                        // If no credentials exist, create them
                        await client.query(
                            'INSERT INTO Account_Credential (Account_ID, Salted_Hash, Salt) VALUES ($1, $2, $3)',
                            [targetUserId, saltedHash, salt]
                        );
                    }

                    // Update account timestamp
                    await client.query(
                        'UPDATE Account SET Updated_At = NOW() WHERE Account_ID = $1',
                        [targetUserId]
                    );

                    return {
                        userId: targetUserId,
                        email: userResult.rows[0].email
                    };
                },
                response,
                'User password reset successfully',
                'Failed to reset user password'
            );

        } catch (error) {
            console.error('Admin password reset error:', error);
            sendError(response, 500, 'Failed to reset user password', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * GET /admin/users/:id - Get user details
     */
    static async getUser(request: IJwtRequest, response: Response): Promise<void> {
        const targetUserId = parseInt(request.params.id);

        try {
            // Get user details
            const userResult = await pool.query(
                `SELECT
                    Account_ID as id,
                    FirstName as firstname,
                    LastName as lastname,
                    Username as username,
                    Email as email,
                    Phone as phone,
                    Account_Role as role,
                    Email_Verified as email_verified,
                    Phone_Verified as phone_verified,
                    Account_Status as account_status,
                    Created_At as created_at,
                    Updated_At as updated_at
                FROM Account
                WHERE Account_ID = $1`,
                [targetUserId]
            );

            if (userResult.rowCount === 0) {
                sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const user = {
                ...userResult.rows[0],
                role_name: RoleName[userResult.rows[0].role as UserRole]
            };

            sendSuccess(response, { user }, 'User retrieved successfully');

        } catch (error) {
            console.error('Get user error:', error);
            sendError(response, 500, 'Failed to retrieve user', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * PUT /admin/users/:id - Update user info
     */
    static async changeUserInfo(request: IJwtRequest, response: Response): Promise<void> {
        const targetUserId = parseInt(request.params.id);
        const { firstname, lastname, username, email, phone, accountStatus } = request.body;
        const adminRole = request.claims?.role || UserRole.USER;

        try {
            // Get target user's role
            const userResult = await pool.query(
                'SELECT Account_Role FROM Account WHERE Account_ID = $1',
                [targetUserId]
            );

            if (userResult.rowCount === 0) {
                sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const currentRole = userResult.rows[0].account_role;

            // Admin can only modify users below their own level
            if (currentRole >= adminRole) {
                sendError(response, 403, 'Cannot modify user with equal or higher role', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            // Build update query dynamically based on provided fields
            const updates: string[] = [];
            const params: any[] = [];
            let paramIndex = 1;

            if (firstname !== undefined) {
                updates.push(`FirstName = $${paramIndex++}`);
                params.push(firstname);
            }
            if (lastname !== undefined) {
                updates.push(`LastName = $${paramIndex++}`);
                params.push(lastname);
            }
            if (username !== undefined) {
                // Check username uniqueness
                const usernameCheck = await pool.query(
                    'SELECT Account_ID FROM Account WHERE Username = $1 AND Account_ID != $2',
                    [username, targetUserId]
                );
                if (usernameCheck.rowCount > 0) {
                    sendError(response, 409, 'Username already exists', ErrorCodes.AUTH_USERNAME_EXISTS);
                    return;
                }
                updates.push(`Username = $${paramIndex++}`);
                params.push(username);
            }
            if (email !== undefined) {
                // Check email uniqueness
                const emailCheck = await pool.query(
                    'SELECT Account_ID FROM Account WHERE Email = $1 AND Account_ID != $2',
                    [email, targetUserId]
                );
                if (emailCheck.rowCount > 0) {
                    sendError(response, 409, 'Email already exists', ErrorCodes.AUTH_EMAIL_EXISTS);
                    return;
                }
                updates.push(`Email = $${paramIndex++}`);
                params.push(email);
                // Reset email verification if email changed
                updates.push(`Email_Verified = FALSE`);
            }
            if (phone !== undefined) {
                // Check phone uniqueness
                const phoneCheck = await pool.query(
                    'SELECT Account_ID FROM Account WHERE Phone = $1 AND Account_ID != $2',
                    [phone, targetUserId]
                );
                if (phoneCheck.rowCount > 0) {
                    sendError(response, 409, 'Phone number already exists', ErrorCodes.AUTH_PHONE_EXISTS);
                    return;
                }
                updates.push(`Phone = $${paramIndex++}`);
                params.push(phone);
                // Reset phone verification if phone changed
                updates.push(`Phone_Verified = FALSE`);
            }
            if (accountStatus !== undefined) {
                // Validate account status
                const validStatuses = ['active', 'pending', 'suspended', 'locked'];
                if (!validStatuses.includes(accountStatus)) {
                    sendError(response, 400, 'Invalid account status', ErrorCodes.VALD_INVALID_INPUT);
                    return;
                }
                updates.push(`Account_Status = $${paramIndex++}`);
                params.push(accountStatus);
            }

            // Always update the timestamp
            updates.push('Updated_At = NOW()');

            if (updates.length === 1) {
                sendError(response, 400, 'No fields to update', ErrorCodes.VALD_MISSING_FIELDS);
                return;
            }

            // Add user ID as last parameter
            params.push(targetUserId);

            // Execute update
            await pool.query(
                `UPDATE Account SET ${updates.join(', ')} WHERE Account_ID = $${paramIndex}`,
                params
            );

            // Get updated user
            const updatedUserResult = await pool.query(
                `SELECT
                    Account_ID as id,
                    FirstName as firstname,
                    LastName as lastname,
                    Username as username,
                    Email as email,
                    Phone as phone,
                    Account_Role as role,
                    Email_Verified as email_verified,
                    Phone_Verified as phone_verified,
                    Account_Status as account_status,
                    Updated_At as updated_at
                FROM Account
                WHERE Account_ID = $1`,
                [targetUserId]
            );

            const user = {
                ...updatedUserResult.rows[0],
                role_name: RoleName[updatedUserResult.rows[0].role as UserRole]
            };

            sendSuccess(response, { user }, 'User updated successfully');

        } catch (error) {
            console.error('Update user error:', error);
            sendError(response, 500, 'Failed to update user', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * DELETE /admin/users/:id - Soft delete user (change status to 'deleted')
     */
    static async deleteUser(request: IJwtRequest, response: Response): Promise<void> {
        const targetUserId = parseInt(request.params.id);
        const adminRole = request.claims?.role || UserRole.USER;
        const adminId = request.claims?.id;

        try {
            // Cannot delete yourself
            if (targetUserId === adminId) {
                sendError(response, 403, 'Cannot delete your own account', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            // Get target user's role
            const userResult = await pool.query(
                'SELECT Account_Role, Account_Status FROM Account WHERE Account_ID = $1',
                [targetUserId]
            );

            if (userResult.rowCount === 0) {
                sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const { account_role, account_status } = userResult.rows[0];

            // Admin can only delete users below their own level
            if (account_role >= adminRole) {
                sendError(response, 403, 'Cannot delete user with equal or higher role', (ErrorCodes as any).AUTH_INSUFFICIENT_PERMISSIONS);
                return;
            }

            // Check if already deleted
            if (account_status === 'deleted') {
                sendError(response, 400, 'User is already deleted', ErrorCodes.VALD_INVALID_INPUT);
                return;
            }

            // Soft delete by setting status to 'deleted'
            await pool.query(
                `UPDATE Account
                SET Account_Status = 'deleted', Updated_At = NOW()
                WHERE Account_ID = $1`,
                [targetUserId]
            );

            sendSuccess(response, {
                userId: targetUserId,
                status: 'deleted'
            }, 'User deleted successfully');

        } catch (error) {
            console.error('Delete user error:', error);
            sendError(response, 500, 'Failed to delete user', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }
}