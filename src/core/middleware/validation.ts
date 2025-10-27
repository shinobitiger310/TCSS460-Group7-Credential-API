// src/core/middleware/validation.ts
import { body, param, query, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { SMS_GATEWAYS } from '@models';

/**
 * Middleware to handle validation errors
 * Add this after validation rules to check for errors
 */
export const handleValidationErrors = (request: Request, response: Response, next: NextFunction) => {
    const errors = validationResult(request);
    if (!errors.isEmpty()) {
        return response.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : undefined,
                message: err.msg
            }))
        });
    }
    next();
};

// ============================================
// AUTH VALIDATION
// ============================================

/**
 * Login validation
 * TODO: Implement validation for login
 * - Email: required, valid email format, normalized
 * - Password: required
 */
export const validateLogin = [
    // TODO: Add validation rules here
    handleValidationErrors
];

/**
 * Public registration validation (no role field allowed)
 * TODO: Implement validation for registration
 * - firstname: required, 1-100 characters
 * - lastname: required, 1-100 characters
 * - email: required, valid email format, normalized
 * - username: required, 3-50 characters, alphanumeric with underscore/hyphen
 * - password: required, 8-128 characters
 * - phone: required, at least 10 digits
 * NOTE: No role validation - public registration always creates basic users
 */
export const validateRegister = [
    // TODO: Add validation rules here
    handleValidationErrors
];

// ============================================
// PASSWORD VALIDATION
// ============================================

/**
 * Password reset request validation
 * TODO: Implement validation for password reset request
 * - Email: required, valid email format, normalized
 */
export const validatePasswordResetRequest = [
    // TODO: Add validation rules here
    handleValidationErrors
];

/**
 * Password reset validation (with token)
 * TODO: Implement validation for password reset
 * - token: required, trimmed
 * - password: required, 8-128 characters
 */
export const validatePasswordReset = [
    // TODO: Add validation rules here
    handleValidationErrors
];

/**
 * Password change validation (for authenticated users)
 * TODO: Implement validation for password change
 * - oldPassword: required
 * - newPassword: required, 8-128 characters, different from old password
 */
export const validatePasswordChange = [
    // TODO: Add validation rules here
    handleValidationErrors
];

// ============================================
// VERIFICATION VALIDATION
// ============================================

/**
 * Phone verification send validation
 * TODO: Implement validation for sending phone verification
 * - carrier: optional, must be valid SMS gateway from SMS_GATEWAYS
 */
export const validatePhoneSend = [
    // TODO: Add validation rules here
    handleValidationErrors
];

/**
 * Phone verification code validation
 * TODO: Implement validation for phone verification code
 * - code: required, trimmed, exactly 6 digits
 */
export const validatePhoneVerify = [
    // TODO: Add validation rules here
    handleValidationErrors
];

/**
 * Email verification token validation (query param)
 * TODO: Implement validation for email verification token
 * - token: required parameter, trimmed
 */
export const validateEmailToken = [
    // TODO: Add validation rules here
    handleValidationErrors
];

// ============================================
// USER/PARAMS VALIDATION
// ============================================

/**
 * Validate user ID in params matches JWT claims
 * Use this for routes where users can only access their own resources
 * TODO: Implement validation for user ID parameter
 * - id: required, integer
 */
export const validateUserIdParam = [
    // TODO: Add validation rules here
    handleValidationErrors
];

// ============================================
// CUSTOM VALIDATORS (OPTIONAL)
// ============================================

/**
 * Custom password strength validator (optional, more strict)
 * Add to password fields if you want stronger validation
 * TODO: Implement strong password validation
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (@$!%*?&)
 */
export const passwordStrength = body('password');
    // TODO: Add password strength rules here

/**
 * Sanitize and validate pagination parameters
 * TODO: Implement pagination validation
 * - page: optional, positive integer
 * - limit: optional, integer between 1 and 100
 */
export const validatePagination = [
    // TODO: Add validation rules here
    handleValidationErrors
];
