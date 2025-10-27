import jwt from 'jsonwebtoken';
import { getEnvVar } from './envConfig';

export interface AccessTokenPayload {
    id: number;
    email: string;
    role: number;
}

export interface ResetTokenPayload {
    id: number;
    email: string;
    type: 'password_reset';
    timestamp: number;
}

/**
 * Generate access token for authenticated user sessions
 */
export const generateAccessToken = (payload: AccessTokenPayload): string => {
    const jwtSecret = getEnvVar('JWT_SECRET');

    return jwt.sign(
        {
            id: payload.id,
            email: payload.email,
            role: payload.role
        },
        jwtSecret,
        { expiresIn: '14d' }
    );
};

/**
 * Generate password reset token with short expiry
 */
export const generatePasswordResetToken = (userId: number, email: string): string => {
    const jwtSecret = getEnvVar('JWT_SECRET');

    return jwt.sign(
        {
            id: userId,
            email,
            type: 'password_reset',
            timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '15m' }
    );
};

/**
 * Generate verification token for email/phone verification
 */
export const generateVerificationToken = (userId: number, type: 'email' | 'phone'): string => {
    const jwtSecret = getEnvVar('JWT_SECRET');

    return jwt.sign(
        {
            id: userId,
            type: `${type}_verification`,
            timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '24h' }
    );
};

/**
 * Verify and decode any token type
 */
export const verifyToken = <T = any>(token: string): T => {
    const jwtSecret = getEnvVar('JWT_SECRET');
    return jwt.verify(token, jwtSecret) as T;
};