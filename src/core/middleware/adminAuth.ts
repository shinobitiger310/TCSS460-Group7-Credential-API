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
 *
 * Role Hierarchy & Management Rules:
 * - User (1): Cannot manage anyone
 * - Moderator (2): Can manage Users only
 * - Admin (3): Can manage up to Admin (roles ≤ 3)
 * - SuperAdmin (4): Can manage up to SuperAdmin (roles ≤ 4)
 * - Owner (5): Can manage everyone (roles ≤ 5)
 *
 * @param userRole - The acting user's role
 * @param targetRole - The target user's role (or role being assigned)
 */
export const canManageRole = (userRole: UserRole, targetRole: UserRole): boolean => {
    // Define max manageable role for each user role
    const maxManageableRole: Record<UserRole, number> = {
        [UserRole.USER]: 0,                    // Cannot manage anyone
        [UserRole.MODERATOR]: UserRole.USER,   // Can manage Users only (≤ 1)
        [UserRole.ADMIN]: UserRole.ADMIN,      // Can manage up to Admin (≤ 3)
        [UserRole.SUPER_ADMIN]: UserRole.SUPER_ADMIN, // Can manage up to SuperAdmin (≤ 4)
        [UserRole.OWNER]: UserRole.OWNER       // Can manage everyone (≤ 5)
    };

    return targetRole <= maxManageableRole[userRole];
};
