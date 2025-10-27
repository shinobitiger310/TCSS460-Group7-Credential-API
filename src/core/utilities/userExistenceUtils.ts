import { Response } from 'express';
import { getPool } from './database';
import { sendError } from './responseUtils';
import { ErrorCodes } from './errorCodes';

export interface UserExistenceCheck {
    email: string;
    username: string;
    phone: string;
}

export interface ExistenceResult {
    exists: boolean;
    field?: 'email' | 'username' | 'phone';
    errorCode?: string;
    message?: string;
}

/**
 * Check if user exists by email, username, or phone
 * Returns null if no conflicts, or conflict details if found
 */
export const checkUserExistence = async (
    userData: UserExistenceCheck
): Promise<ExistenceResult> => {
    const pool = getPool();

    // Check for existing email
    const emailCheck = await pool.query(
        'SELECT Account_ID FROM Account WHERE Email = $1',
        [userData.email]
    );
    if (emailCheck.rowCount > 0) {
        return {
            exists: true,
            field: 'email',
            errorCode: ErrorCodes.AUTH_EMAIL_EXISTS,
            message: 'Email already exists'
        };
    }

    // Check for existing username
    const usernameCheck = await pool.query(
        'SELECT Account_ID FROM Account WHERE Username = $1',
        [userData.username]
    );
    if (usernameCheck.rowCount > 0) {
        return {
            exists: true,
            field: 'username',
            errorCode: ErrorCodes.AUTH_USERNAME_EXISTS,
            message: 'Username already exists'
        };
    }

    // Check for existing phone
    const phoneCheck = await pool.query(
        'SELECT Account_ID FROM Account WHERE Phone = $1',
        [userData.phone]
    );
    if (phoneCheck.rowCount > 0) {
        return {
            exists: true,
            field: 'phone',
            errorCode: ErrorCodes.AUTH_PHONE_EXISTS,
            message: 'Phone already exists'
        };
    }

    return { exists: false };
};

/**
 * Convenience function that checks existence and sends error response if found
 * Returns true if user exists (error sent), false if user doesn't exist (safe to proceed)
 */
export const validateUserUniqueness = async (
    userData: UserExistenceCheck,
    response: Response
): Promise<boolean> => {
    const result = await checkUserExistence(userData);

    if (result.exists) {
        sendError(response, 400, result.message!, result.errorCode!);
        return true; // User exists, error sent
    }

    return false; // User doesn't exist, safe to proceed
};