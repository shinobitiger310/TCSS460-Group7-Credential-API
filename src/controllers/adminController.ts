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
}