// src/controllers/verificationController.ts
import { Response } from 'express';
import {
    pool,
    sendSuccess,
    sendError,
    ErrorCodes,
    generateSecureToken,
    generateVerificationCode,
    sendVerificationEmail,
    sendSMSViaEmail,
    getEnvVar,
    isDevelopment,
    executeTransactionWithResponse
} from '@utilities';
import { IJwtRequest } from '@models';

export class VerificationController {
    /**
     * Send email verification
     */
    static async sendEmailVerification(request: IJwtRequest, response: Response): Promise<void> {
        const userId = request.claims.id;

        try {
            // Get user info
            const userResult = await pool.query(
                'SELECT FirstName, Email, Email_Verified FROM Account WHERE Account_ID = $1',
                [userId]
            );

            if (userResult.rowCount === 0) {
                sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const { firstname, email, email_verified } = userResult.rows[0];

            if (email_verified) {
                sendError(response, 400, 'Email is already verified', ErrorCodes.VRFY_ALREADY_VERIFIED);
                return;
            }

            // Check rate limiting (basic check for existing recent verification)
            const recentVerification = await pool.query(
                `SELECT COUNT(*) as count 
                 FROM Email_Verification 
                 WHERE Account_ID = $1 AND Token_Expires > NOW() AND Created_At > NOW() - INTERVAL '5 minutes'`,
                [userId]
            );

            if (parseInt(recentVerification.rows[0].count) > 0) {
                sendError(response, 429, 'Please wait before requesting another verification email', ErrorCodes.VRFY_RATE_LIMIT_EXCEEDED);
                return;
            }

            // Delete old verification tokens for this user
            await pool.query(
                'DELETE FROM Email_Verification WHERE Account_ID = $1',
                [userId]
            );

            // Generate verification token
            const verificationToken = generateSecureToken();
            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

            // Store verification token in database
            await pool.query(
                `INSERT INTO Email_Verification
                         (Account_ID, Email, Verification_Token, Token_Expires)
                     VALUES ($1, $2, $3, $4)`,
                [userId, email, verificationToken, expiresAt]
            );

            // Create verification URL
            const baseUrl = getEnvVar('APP_BASE_URL', `http://localhost:${getEnvVar('PORT', '8000')}`);
            const verificationUrl = `${baseUrl}/auth/verify/email/confirm?token=${verificationToken}`;

            // Send email
            const emailSent = await sendVerificationEmail(email, firstname, verificationUrl);

            if (!emailSent && !isDevelopment()) {
                sendError(response, 500, 'Failed to send verification email', ErrorCodes.SRVR_EMAIL_SEND_FAILED);
                return;
            }

            // Build response data
            const responseData: any = {
                expiresIn: '48 hours'
            };

            // In development, include the verification URL
            if (isDevelopment()) {
                responseData.verificationUrl = verificationUrl;
            }

            sendSuccess(response, responseData, 'Verification email sent successfully');

        } catch (error) {
            console.error('Send email verification error:', error);
            sendError(response, 500, 'Failed to send verification email', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * Confirm email verification
     */
    static async confirmEmailVerification(request: IJwtRequest, response: Response): Promise<void> {
        const { token } = request.query;

        if (!token || typeof token !== 'string') {
            sendError(response, 400, 'Verification token is required', ErrorCodes.VALD_MISSING_FIELDS);
            return;
        }

        try {
            // Find verification record
            const verificationResult = await pool.query(
                `SELECT ev.Account_ID, ev.Email, ev.Token_Expires, a.Email_Verified
                 FROM Email_Verification ev
                 JOIN Account a ON ev.Account_ID = a.Account_ID
                 WHERE ev.Verification_Token = $1`,
                [token]
            );

            if (verificationResult.rowCount === 0) {
                sendError(response, 400, 'Invalid verification token', ErrorCodes.VRFY_INVALID_TOKEN);
                return;
            }

            const verification = verificationResult.rows[0];

            // Check if already verified
            if (verification.email_verified) {
                sendError(response, 400, 'Email is already verified', ErrorCodes.VRFY_ALREADY_VERIFIED);
                return;
            }

            // Check if token is expired
            if (new Date() > new Date(verification.token_expires)) {
                sendError(response, 400, 'Verification token has expired', ErrorCodes.VRFY_TOKEN_EXPIRED);
                return;
            }

            // Execute email verification transaction
            await executeTransactionWithResponse(
                async (client) => {
                    // Mark email as verified
                    await client.query(
                        'UPDATE Account SET Email_Verified = TRUE, Updated_At = NOW() WHERE Account_ID = $1',
                        [verification.account_id]
                    );

                    // Delete verification token (single use)
                    await client.query(
                        'DELETE FROM Email_Verification WHERE Account_ID = $1',
                        [verification.account_id]
                    );

                    return null;
                },
                response,
                'Email verified successfully',
                'Failed to verify email'
            );

        } catch (error) {
            console.error('Email verification error:', error);
            sendError(response, 500, 'Failed to verify email', ErrorCodes.SRVR_TRANSACTION_FAILED);
        }
    }

    /**
     * Send SMS verification code
     */
    static async sendSMSVerification(request: IJwtRequest, response: Response): Promise<void> {
        const userId = request.claims.id;
        const { carrier } = request.body;

        try {
            // Get user info
            const userResult = await pool.query(
                'SELECT FirstName, Phone, Phone_Verified FROM Account WHERE Account_ID = $1',
                [userId]
            );

            if (userResult.rowCount === 0) {
                sendError(response, 404, 'User not found', ErrorCodes.USER_NOT_FOUND);
                return;
            }

            const { firstname, phone, phone_verified } = userResult.rows[0];

            if (phone_verified) {
                sendError(response, 400, 'Phone is already verified', ErrorCodes.VRFY_ALREADY_VERIFIED);
                return;
            }

            // Check rate limiting (1 request per minute)
            const recentVerification = await pool.query(
                `SELECT COUNT(*) as count 
                 FROM Phone_Verification 
                 WHERE Account_ID = $1 AND Code_Expires > NOW() AND Created_At > NOW() - INTERVAL '1 minute'`,
                [userId]
            );

            if (parseInt(recentVerification.rows[0].count) > 0) {
                sendError(response, 429, 'Please wait before requesting another SMS code', ErrorCodes.VRFY_RATE_LIMIT_EXCEEDED);
                return;
            }

            // Delete old verification codes for this user
            await pool.query(
                'DELETE FROM Phone_Verification WHERE Account_ID = $1',
                [userId]
            );

            // Generate 6-digit verification code
            const verificationCode = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Store verification code in database
            await pool.query(
                `INSERT INTO Phone_Verification
                         (Account_ID, Phone, Verification_Code, Code_Expires, Attempts)
                     VALUES ($1, $2, $3, $4, 0)`,
                [userId, phone, verificationCode, expiresAt]
            );

            // Send SMS code
            const message = `Auth² Code: ${verificationCode}\nExpires in 15 min\nDo not share`;
            const smsSent = await sendSMSViaEmail(phone, message, carrier);

            if (!smsSent && !isDevelopment()) {
                sendError(response, 500, 'Failed to send SMS verification code', ErrorCodes.SRVR_SMS_SEND_FAILED);
                return;
            }

            // Build response data
            const responseData: any = {
                expiresIn: '15 minutes',
                method: 'email-to-sms',
                availableCarriers: ['att', 'tmobile', 'verizon', 'sprint', 'metropcs', 'boost', 'cricket', 'uscellular']
            };

            // In development, include the verification code
            if (isDevelopment()) {
                responseData.verificationCode = verificationCode;
            }

            sendSuccess(response, responseData, 'SMS verification code sent successfully');

        } catch (error) {
            console.error('Send SMS verification error:', error);
            sendError(response, 500, 'Failed to send SMS verification code', ErrorCodes.SRVR_DATABASE_ERROR);
        }
    }

    /**
     * Verify SMS code
     */
    static async verifySMSCode(request: IJwtRequest, response: Response): Promise<void> {
        const userId = request.claims.id;
        const { code } = request.body;

        try {
            // Find verification record
            const verificationResult = await pool.query(
                `SELECT pv.*, a.Phone_Verified
                 FROM Phone_Verification pv
                 JOIN Account a ON pv.Account_ID = a.Account_ID
                 WHERE pv.Account_ID = $1`,
                [userId]
            );

            if (verificationResult.rowCount === 0) {
                sendError(response, 400, 'No verification code found. Please request a new code.', ErrorCodes.VRFY_NO_CODE_FOUND);
                return;
            }

            const verification = verificationResult.rows[0];

            // Check if already verified
            if (verification.phone_verified) {
                sendError(response, 400, 'Phone is already verified', ErrorCodes.VRFY_ALREADY_VERIFIED);
                return;
            }

            // Check if code is expired
            if (new Date() > new Date(verification.code_expires)) {
                sendError(response, 400, 'Verification code has expired', ErrorCodes.VRFY_CODE_EXPIRED);
                return;
            }

            // Check attempt limit
            if (verification.attempts >= 3) {
                sendError(response, 400, 'Too many failed attempts. Please request a new code.', ErrorCodes.VRFY_TOO_MANY_ATTEMPTS);
                return;
            }

            // Check if code matches
            if (verification.verification_code !== code) {
                // Increment attempt count
                await pool.query(
                    'UPDATE Phone_Verification SET Attempts = Attempts + 1 WHERE Account_ID = $1',
                    [userId]
                );
                
                const remainingAttempts = 3 - (verification.attempts + 1);
                sendError(
                    response, 
                    400, 
                    `Invalid verification code. ${remainingAttempts} attempts remaining.`, 
                    ErrorCodes.VRFY_INVALID_CODE
                );
                return;
            }

            // Execute phone verification transaction
            await executeTransactionWithResponse(
                async (client) => {
                    // Mark phone as verified
                    await client.query(
                        'UPDATE Account SET Phone_Verified = TRUE, Updated_At = NOW() WHERE Account_ID = $1',
                        [userId]
                    );

                    // Delete verification code (single use)
                    await client.query(
                        'DELETE FROM Phone_Verification WHERE Account_ID = $1',
                        [userId]
                    );

                    return null;
                },
                response,
                'Phone verified successfully',
                'Failed to verify SMS code'
            );

        } catch (error) {
            console.error('SMS verification error:', error);
            sendError(response, 500, 'Failed to verify SMS code', ErrorCodes.SRVR_TRANSACTION_FAILED);
        }
    }

    /**
     * Get supported SMS carriers
     */
    static async getCarriers(request: IJwtRequest, response: Response): Promise<void> {
        const carriers = [
            { id: 'att', name: 'AT&T', gateway: '@txt.att.net' },
            { id: 'tmobile', name: 'T-Mobile', gateway: '@tmomail.net' },
            { id: 'verizon', name: 'Verizon', gateway: '@vtext.com' },
            { id: 'sprint', name: 'Sprint', gateway: '@messaging.sprintpcs.com' },
            { id: 'metropcs', name: 'Metro PCS', gateway: '@mymetropcs.com' },
            { id: 'boost', name: 'Boost Mobile', gateway: '@smsmyboostmobile.com' },
            { id: 'cricket', name: 'Cricket', gateway: '@sms.cricketwireless.net' },
            { id: 'uscellular', name: 'US Cellular', gateway: '@email.uscc.net' }
        ];

        sendSuccess(response, {
            carriers,
            note: 'SMS verification uses email-to-SMS gateways. Results may vary by carrier.'
        }, 'Carriers retrieved successfully');
    }
}