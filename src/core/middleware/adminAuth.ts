import { Response, NextFunction } from 'express';
import { IJwtRequest, UserRole } from '@models';
import { sendError } from '@utilities';

/**
 * Middleware to require a minimum role level
 * @param minimumRole - The minimum role required (1-5)
 */
export const requireRole = (minimumRole: UserRole) => {
    return (req: IJwtRequest, res: Response, next: NextFunction): void => {
        if (!req.claims) {
            sendError(res, 401, 'Authentication required');
            return;
        }

        if (req.claims.role < minimumRole) {
            sendError(res, 403, 'Insufficient permissions');
            return;
        }

        next();
    };
};

/**
 * Convenience middleware for specific roles
 */
export const requireModerator = requireRole(UserRole.MODERATOR);
export const requireAdmin = requireRole(UserRole.ADMIN);
export const requireSuperAdmin = requireRole(UserRole.SUPER_ADMIN);
export const requireOwner = requireRole(UserRole.OWNER);

/**
 * Check if user can manage target role
 * @param userRole - The acting user's role
 * @param targetRole - The target user's role
 */
export const canManageRole = (userRole: UserRole, targetRole: UserRole): boolean => {
    return userRole >= targetRole;
};
