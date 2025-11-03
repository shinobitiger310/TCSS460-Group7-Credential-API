// src/routes/admin/index.ts
import { Router } from 'express';
import { AdminController } from '../../controllers/adminController';
import { checkToken } from '../../core/middleware/jwt';
import { requireAdmin } from '../../core/middleware/adminAuth';
import {
    validateRegister,
    validateUserIdParam,
    validatePagination
} from '../../core/middleware/validation';

const adminRouter = Router();

// All admin routes require JWT authentication AND admin role
adminRouter.use(checkToken);
adminRouter.use(requireAdmin);

/**
 * POST /admin/users/create
 * Create a new user with specified role
 */
adminRouter.post('/users/create', validateRegister, AdminController.createUser);

/**
 * GET /admin/users/search
 * Search users by name, email, or username
 */
adminRouter.get('/users/search', AdminController.searchUsers);

/**
 * GET /admin/users/stats/dashboard
 * Get dashboard statistics
 */
adminRouter.get('/users/stats/dashboard', AdminController.getDashboardStats);

/**
 * PUT /admin/users/:id/role
 * Change a user's role
 */
adminRouter.put('/users/:id/role', validateUserIdParam, AdminController.changeUserRole);

/**
 * PUT /admin/users/:id/password
 * Admin password reset
 */
adminRouter.put('/users/:id/password', validateUserIdParam,AdminController.resetUserPassword )


/**
 * GET /admin/users/:id
 * Get user details
 */
adminRouter.get('/users/:id',validateUserIdParam, AdminController.getUser)

/**
 * PUT /admin/users/:id
 * Update user
 */
adminRouter.put('/users/:id',validateUserIdParam, AdminController.changeUserInfo)
/**
 * DELETE /admin/users/:id
 * Soft delete user
 */
adminRouter.delete('/users/:id', validateUserIdParam, AdminController.deleteUser)


/**
 * GET /admin/users
 * List all users with pagination and filters
 */
adminRouter.get('/users', validatePagination, AdminController.listUsers);


export { adminRouter };
