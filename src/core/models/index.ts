// src/core/models/index.ts
import { Request } from 'express';

/**
 * User role enumeration
 */
export enum UserRole {
    USER = 1,
    MODERATOR = 2,
    ADMIN = 3,
    SUPER_ADMIN = 4,
    OWNER = 5
}

/**
 * Map role numbers to role names
 */
export const RoleName = {
    [UserRole.USER]: 'User',
    [UserRole.MODERATOR]: 'Moderator',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.SUPER_ADMIN]: 'SuperAdmin',
    [UserRole.OWNER]: 'Owner'
} as const;

/**
 * JWT token payload structure
 */
export interface IJwtClaims {
    id: number;
    name: string;
    role: UserRole;
    iat?: number;
    exp?: number;
}

/**
 * Express Request with JWT claims and target user info
 */
export interface IJwtRequest extends Request {
    claims?: IJwtClaims;
    targetUserRole?: UserRole;  // Used by role hierarchy middleware
}

/**
 * User model from database
 */
export interface IUser {
    account_id: number;
    firstname: string;
    lastname: string;
    username: string;
    email: string;
    phone: string;
    account_role: UserRole;
    email_verified: boolean;
    phone_verified: boolean;
    account_status: 'pending' | 'active' | 'suspended' | 'locked';
    created_at?: Date;
    updated_at?: Date;
}

/**
 * Authentication request body
 */
export interface IAuthRequest {
    email: string;
    password: string;
}

/**
 * Registration request body
 */
export interface IRegisterRequest {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
    username: string;
    phone: string;
    role?: UserRole; // Optional - only used by admin endpoints
}

/**
 * Password change request body
 */
export interface IPasswordChangeRequest {
    oldPassword: string;
    newPassword: string;
}

/**
 * Password reset request body
 */
export interface IPasswordResetRequest {
    email: string;
}

/**
 * Password reset with token request body
 */
export interface IPasswordResetWithTokenRequest {
    token: string;
    password: string;
}

/**
 * Phone verification request body
 */
export interface IPhoneVerificationRequest {
    code: string;
}

/**
 * Phone send request body
 */
export interface IPhoneSendRequest {
    carrier?: string;
}

/**
 * Password reset token payload
 */
export interface IPasswordResetToken {
    id: number;
    email: string;
    type: 'password_reset';
    iat?: number;
    exp?: number;
}

/**
 * JWT Configuration Constants
 */
export const JWT_EXPIRY = '14d';           // Access token expiry
export const JWT_RESET_EXPIRY = '1h';      // Password reset token expiry

// Email-to-SMS gateway mappings
export const SMS_GATEWAYS: { [key: string]: string } = {
    // US Carriers
    'att': '@txt.att.net',
    'tmobile': '@tmomail.net',
    'verizon': '@vtext.com',
    'sprint': '@messaging.sprintpcs.com',
    'boost': '@sms.myboostmobile.com',
    'cricket': '@sms.cricketwireless.net',
    'metro': '@mymetropcs.com',
    'tracfone': '@mmst5.tracfone.com',
    'uscellular': '@email.uscc.net',
    'virgin': '@vmobl.com',

    // Canadian Carriers
    'telus': '@msg.telus.com',
    'bell': '@txt.bellmobility.ca',
    'rogers': '@pcs.rogers.com',
    'fido': '@fido.ca',
    'koodo': '@msg.koodomobile.com',

    // For testing/development
    'test': '@example.com',
    'mock': '@mock.local'
};