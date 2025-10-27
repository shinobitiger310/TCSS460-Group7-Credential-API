// src/controllers/authController.ts
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import {
    pool,
    sendSuccess,
    sendError,
    ErrorCodes,
    generateSalt,
    generateHash,
    verifyPassword,
    getEnvVar,
    sendPasswordResetEmail,
    isDevelopment,
    generateAccessToken,
    generatePasswordResetToken,
    validateUserUniqueness,
    executeTransactionWithResponse
} from '@utilities';
import { IJwtRequest, JWT_RESET_EXPIRY } from '@models';

export class AuthController {
    /**
     * User registration
     */
    static async register(request: IJwtRequest, response: Response): Promise<void> {
        const { firstname, lastname, email, password, username, phone } = request.body;

        // Check if user already exists
        const userExists = await validateUserUniqueness(
            { email, username, phone },
            response
        );
        if (userExists) return;

        // Execute registration transaction
        await executeTransactionWithResponse(
            async (client) => {
                // Create account with role 1 (user)
                const insertAccountResult = await client.query(
                    `INSERT INTO Account
                     (FirstName, LastName, Username, Email, Phone, Account_Role, Email_Verified, Phone_Verified, Account_Status)
                     VALUES ($1, $2, $3, $4, $5, 1, FALSE, FALSE, 'pending')
                     RETURNING Account_ID`,
                    [firstname, lastname, username, email, phone]
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
    }

    /**
     * User login
     */
    static async login(request: IJwtRequest, response: Response): Promise<void> {
        const { email, password } = request.body;

        try {
            // Find account
            const accountResult = await pool.query(
                `SELECT 
                    a.Account_ID, a.FirstName, a.LastName, a.Username, 
                    a.Email, a.Account_Role, a.Email_Verified, 
                    a.Phone_Verified, a.Account_Status,
                    ac.Salted_Hash, ac.Salt
                FROM Account a 
                LEFT JOIN Account_Credential ac ON a.Account_ID = ac.Account_ID 
                WHERE a.Email = $1`,
                [email]
            );

            if (accountResult.rowCount === 0) {
                sendError(response, 401, 'Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
                return;
            }

            const account = accountResult.rows[0];

            // Check account status
            if (account.account_status === 'suspended') {
                sendError(response, 403, 'Account is suspended. Please contact support.', ErrorCodes.AUTH_ACCOUNT_SUSPENDED);
                return;
            }
            if (account.account_status === 'locked') {
                sendError(response, 403, 'Account is locked. Please contact support.', ErrorCodes.AUTH_ACCOUNT_LOCKED);
                return;
            }

            // Verify password
            if (!account.salted_hash || !verifyPassword(password, account.salt, account.salted_hash)) {
                sendError(response, 401, 'Invalid credentials', ErrorCodes.AUTH_INVALID_CREDENTIALS);
                return;
            }

            // Generate JWT token
            const jwtSecret = getEnvVar('JWT_SECRET');
            const token = jwt.sign(
                {
                    id: account.account_id,
                    email: account.email,
                    role: account.account_role
                },
                jwtSecret,
                { expiresIn: '14d' }
            );

            // Get role name
            const roleNames = ['', 'User', 'Moderator', 'Admin', 'SuperAdmin', 'Owner'];
            const roleName = roleNames[account.account_role] || 'User';

            sendSuccess(response, {
                accessToken: token,
                user: {
                    id: account.account_id,
                    email: account.email,
                    name: account.firstname,
                    lastname: account.lastname,
                    username: account.username,
                    role: roleName,
                    emailVerified: account.email_verified,
                    phoneVerified: account.phone_verified,
                    accountStatus: account.account_status,
                },
            }, 'Login successful');

        } catch (error) {
            console.error('Login error:', error);
            sendError(response, 500, 'Server error - contact support', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * Change user password (requires old password)
     */
    static async changePassword(request: IJwtRequest, response: Response): Promise<void> {
        const { oldPassword, newPassword } = request.body;
        const userId = request.claims.id;

        try {
            // Get current credentials
            const credentialsResult = await pool.query(
                'SELECT Salted_Hash, Salt FROM Account_Credential WHERE Account_ID = $1',
                [userId]
            );

            if (credentialsResult.rowCount === 0) {
                sendError(response, 404, 'User credentials not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const { salted_hash, salt } = credentialsResult.rows[0];

            // Verify old password
            if (!verifyPassword(oldPassword, salt, salted_hash)) {
                sendError(response, 400, 'Current password is incorrect', ErrorCodes.AUTH_INVALID_CREDENTIALS);
                return;
            }

            // Check that new password is different
            if (verifyPassword(newPassword, salt, salted_hash)) {
                sendError(response, 400, 'New password must be different from current password', ErrorCodes.VALD_INVALID_PASSWORD);
                return;
            }

            // Execute password change transaction
            await executeTransactionWithResponse(
                async (client) => {
                    // Generate new salt and hash
                    const newSalt = generateSalt();
                    const newSaltedHash = generateHash(newPassword, newSalt);

                    // Update password
                    await client.query(
                        'UPDATE Account_Credential SET Salted_Hash = $1, Salt = $2 WHERE Account_ID = $3',
                        [newSaltedHash, newSalt, userId]
                    );

                    // Update account timestamp
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

        } catch (error) {
            console.error('Password change error:', error);
            sendError(response, 500, 'Failed to change password', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * Request password reset (sends email)
     */
    static async requestPasswordReset(request: IJwtRequest, response: Response): Promise<void> {
        const { email } = request.body;

        try {
            // Find account with verified email
            const accountResult = await pool.query(
                'SELECT Account_ID, FirstName, Email_Verified FROM Account WHERE Email = $1',
                [email]
            );

            // Always return success to prevent email enumeration
            if (accountResult.rowCount === 0 || !accountResult.rows[0].email_verified) {
                sendSuccess(response, null, 'If the email exists and is verified, a reset link will be sent.');
                return;
            }

            const { account_id, firstname } = accountResult.rows[0];

            // Generate reset token (valid for 1 hour)
            const resetToken = generatePasswordResetToken(account_id, email);

            // Create reset URL
            const baseUrl = getEnvVar('APP_BASE_URL', `http://localhost:${getEnvVar('PORT', '8000')}`);
            const resetUrl = `${baseUrl}/auth/password/reset?token=${resetToken}`;

            // Send reset email
            const emailSent = await sendPasswordResetEmail(email, firstname, resetUrl);

            if (!emailSent && !isDevelopment()) {
                sendError(response, 500, 'Failed to send reset email', ErrorCodes.SRVR_EMAIL_SEND_FAILED);
                return;
            }

            // In development, include the reset URL
            const responseData = isDevelopment() ? { resetUrl } : null;

            sendSuccess(response, responseData, 'If the email exists and is verified, a reset link will be sent.');

        } catch (error) {
            console.error('Password reset request error:', error);
            sendError(response, 500, 'Failed to process reset request', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * Reset password with token
     */
    static async resetPassword(request: IJwtRequest, response: Response): Promise<void> {
        const { token, password } = request.body;

        try {
            // Verify and decode reset token
            let decoded: any;
            try {
                decoded = jwt.verify(token, getEnvVar('JWT_SECRET'));
            } catch (error) {
                sendError(response, 400, 'Invalid or expired reset token', ErrorCodes.AUTH_INVALID_TOKEN);
                return;
            }

            // Validate token type
            if (decoded.type !== 'password_reset') {
                sendError(response, 400, 'Invalid reset token', ErrorCodes.AUTH_INVALID_TOKEN);
                return;
            }

            const userId = decoded.id;

            // Verify account still exists
            const accountCheck = await pool.query(
                'SELECT Account_ID FROM Account WHERE Account_ID = $1',
                [userId]
            );

            if (accountCheck.rowCount === 0) {
                sendError(response, 404, 'Account not found', ErrorCodes.USER_NOT_FOUND);
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
                'Password reset successful',
                'Failed to reset password'
            );

        } catch (error) {
            console.error('Password reset error:', error);
            sendError(response, 500, 'Failed to reset password', ErrorCodes.SRVR_TRANSACTION_FAILED);
        }
    }

    /**
     * Simple test endpoint (no authentication required)
     */
    static async testJWT(request: IJwtRequest, response: Response): Promise<void> {
        response.status(200).json({
            message: 'Hello World! API is working correctly.',
            timestamp: new Date().toISOString(),
            service: 'TCSS-460-auth-squared'
        });
    }
}