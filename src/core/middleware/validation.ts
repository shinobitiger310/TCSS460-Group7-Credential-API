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
   body('email')
           .trim()
           .toLowerCase()
           .notEmpty().withMessage('Email is required')
           .isEmail().withMessage('Email must be valid'),
       
       body('password')
           .notEmpty().withMessage('Password is required'),
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
        body('firstname')
        .trim()
        .notEmpty().withMessage('First name is required')
        .isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
    
    body('lastname')
        .trim()
        .notEmpty().withMessage('Last name is required')
        .isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
    
    body('email')
        .trim()
        .toLowerCase()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email must be valid'),
    
    body('username')
        .trim()
        .notEmpty().withMessage('Username is required')
        .isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username must be alphanumeric with underscore or hyphen'),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),
    
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone is required')
        .matches(/\d/g).custom((value) => {
            const digitCount = value.replace(/\D/g, '').length;
            if (digitCount < 10) throw new Error('Phone must have at least 10 digits');
            return true;
        }),
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
    body('email')
        .trim()
        .toLowerCase()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Email must be valid'),
    handleValidationErrors
];

/**
 * Password reset validation (with token)
 * TODO: Implement validation for password reset
 * - token: required, trimmed
 * - password: required, 8-128 characters
 */
export const validatePasswordReset = [
     body('token')
        .trim()
        .notEmpty().withMessage('Token is required'),
    
     body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters'),

    handleValidationErrors
];

/**
 * Password change validation (for authenticated users)
 * TODO: Implement validation for password change
 * - oldPassword: required
 * - newPassword: required, 8-128 characters, different from old password
 */
export const validatePasswordChange = [
    body('oldPassword')
        .notEmpty().withMessage('Old password is required'),
    
    body('newPassword')
        .notEmpty().withMessage('New password is required')
        .isLength({ min: 8, max: 128 }).withMessage('New password must be 8-128 characters')
        .custom((value, { req }) => {
            if (value === req.body.oldPassword) {
                throw new Error('New password must be different from old password');
            }
            return true;
        }),
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
    body('carrier')
        .optional()
        .trim()
        .custom((value) => {
            if (!Object.values(SMS_GATEWAYS).includes(value)) {
                throw new Error(`Carrier must be one of: ${Object.values(SMS_GATEWAYS).join(', ')}`);
            }
            return true;
        }),
    
    handleValidationErrors
];

/**
 * Phone verification code validation
 * TODO: Implement validation for phone verification code
 * - code: required, trimmed, exactly 6 digits
 */
export const validatePhoneVerify = [
    body('code')
        .trim()
        .notEmpty().withMessage('Code is required')
        .matches(/^\d{6}$/).withMessage('Code must be exactly 6 digits'),
    handleValidationErrors
];

/**
 * Email verification token validation (query param)
 * TODO: Implement validation for email verification token
 * - token: required parameter, trimmed
 */
export const validateEmailToken = [
    query('token')
        .trim()
        .notEmpty().withMessage('Token is required'),
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
    param('id')
        .isInt().withMessage('User ID must be an integer'),
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
export const passwordStrength = body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8-128 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[@$!%*?&]/).withMessage('Password must contain at least one special character (@$!%*?&)');



/**
 * Sanitize and validate pagination parameters
 * TODO: Implement pagination validation
 * - page: optional, positive integer
 * - limit: optional, integer between 1 and 100
 */
export const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),

    handleValidationErrors
];
