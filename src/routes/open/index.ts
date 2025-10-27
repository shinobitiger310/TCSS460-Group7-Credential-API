import express, { Router } from 'express';
import { AuthController, VerificationController } from '@controllers';
import { docsRoutes } from './docs';

const openRoutes: Router = express.Router();

// ===== AUTHENTICATION ROUTES =====

/**
 * Authenticate user and return JWT token
 * POST /auth/login
 * TODO: Add validation middleware (validateLogin)
 */
openRoutes.post('/auth/login', AuthController.login);

/**
 * Register a new user (always creates basic user with role 1)
 * POST /auth/register
 * TODO: Add validation middleware (validateRegister)
 */
openRoutes.post('/auth/register', AuthController.register);

// ===== PASSWORD RESET ROUTES =====

/**
 * Request password reset (requires verified email)
 * POST /auth/password/reset-request
 * TODO: Add validation middleware (validatePasswordResetRequest)
 */
openRoutes.post('/auth/password/reset-request', AuthController.requestPasswordReset);

/**
 * Reset password with token
 * POST /auth/password/reset
 * TODO: Add validation middleware (validatePasswordReset)
 */
openRoutes.post('/auth/password/reset', AuthController.resetPassword);

// ===== VERIFICATION ROUTES =====

/**
 * Get list of supported carriers
 * GET /auth/verify/carriers
 */
openRoutes.get('/auth/verify/carriers', VerificationController.getCarriers);

/**
 * Verify email token (can be accessed via link without authentication)
 * GET /auth/verify/email/confirm?token=xxx
 * TODO: Add query validation for token parameter
 */
openRoutes.get('/auth/verify/email/confirm', VerificationController.confirmEmailVerification);

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
