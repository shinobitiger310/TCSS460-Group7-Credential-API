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
 * GET /admin/users
 * List all users with pagination and filters
 */
adminRouter.get('/users', validatePagination, AdminController.listUsers);

/**
 * GET /admin/users/search
 * Search users by name, email, or username
 */
adminRouter.get('/users/search', AdminController.searchUsers);

/**
 * PUT /admin/users/:id/role
 * Change a user's role
 */
adminRouter.put('/users/:id/role', validateUserIdParam, AdminController.changeUserRole);

/**
 * GET /admin/users/stats/dashboard
 * Get dashboard statistics
 */
adminRouter.get('/users/stats/dashboard', AdminController.getDashboardStats);

export { adminRouter };
export default adminRouter;