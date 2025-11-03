import express, { Router } from 'express';
import { AuthController, VerificationController } from '@controllers';
import {
    validateLogin,
    validateRegister,
    validatePasswordResetRequest,
    validatePasswordReset,
    validateEmailToken
} from '@middleware';
import { docsRoutes } from './docs';

const openRoutes: Router = express.Router();


/**
 * Authenticate user and return JWT token
 * POST /auth/login
 */
openRoutes.post('/auth/login', validateLogin, AuthController.login);

/**
 * Register a new user (always creates basic user with role 1)
 * POST /auth/register
 */
openRoutes.post('/auth/register', validateRegister, AuthController.register);

// ===== PASSWORD RESET ROUTES =====

/**
 * Request password reset (requires verified email)
 * POST /auth/password/reset-request
 */
openRoutes.post('/auth/password/reset-request', validatePasswordResetRequest, AuthController.requestPasswordReset);

/**
 * Reset password with token
 * POST /auth/password/reset
 */
openRoutes.post('/auth/password/reset', validatePasswordReset, AuthController.resetPassword);

// ===== VERIFICATION ROUTES =====

/**
 * Get list of supported carriers
 * GET /auth/verify/carriers
 */
openRoutes.get('/auth/verify/carriers', VerificationController.getCarriers);

/**
 * Verify email token (can be accessed via link without authentication)
 * GET /auth/verify/email/confirm?token=xxx
 */
openRoutes.get('/auth/verify/email/confirm', validateEmailToken, VerificationController.confirmEmailVerification);

// ===== TESTING ROUTES =====

/**
 * Simple test endpoint (no authentication required)
 * GET /jwt_test
 */
openRoutes.get('/jwt_test', AuthController.testJWT);

// ===== DOCUMENTATION ROUTES =====

/**
 * Educational documentation routes
 * GET /doc - Documentation index
 * GET /doc/:filename - Rendered markdown file
 * GET /doc/raw/:filename - Raw markdown file
 */
openRoutes.use('/doc', docsRoutes);

export { openRoutes };
