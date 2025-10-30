import { Request, Response, NextFunction } from 'express';
import {
    requireRole,
    canManageRole,
    requireModerator,
    requireAdmin,
    requireSuperAdmin,
    requireOwner
} from '../core/middleware/adminAuth';
import { UserRole } from '../core/models';
import { IJwtRequest } from '../core/models';

describe('Admin Auth Middleware', () => {

    let mockRequest: any; // Using any to avoid TypeScript strict checks on mock
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            body: {},
            params: {},
            query: {}
            // Don't set claims property here - let tests add it when needed
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        mockNext = jest.fn();
    });

    // #1: requireRole function
    describe('requireRole (#1)', () => {
        it('should return 401 when no JWT token exists (no claims)', () => {
            const middleware = requireRole(UserRole.ADMIN);
            // Don't set mockRequest.claims at all - it should not exist

            middleware(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.any(String)
                })
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should return 403 when user role is below minimum required role', () => {
            const middleware = requireRole(UserRole.ADMIN);
            mockRequest.claims = {
                id: 1,
                name: 'testuser',
                role: UserRole.USER
            };

            middleware(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.any(String)
                })
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should call next() when user has exact minimum role', () => {
            const middleware = requireRole(UserRole.ADMIN);
            mockRequest.claims = {
                id: 1,
                name: 'adminuser',
                role: UserRole.ADMIN
            };

            middleware(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should call next() when user has role above minimum', () => {
            const middleware = requireRole(UserRole.ADMIN);
            mockRequest.claims = {
                id: 1,
                name: 'superadmin',
                role: UserRole.SUPER_ADMIN
            };

            middleware(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockResponse.json).not.toHaveBeenCalled();
        });

        it('should have proper error message for 401', () => {
            const middleware = requireRole(UserRole.ADMIN);
            // Don't set mockRequest.claims - it should not exist

            middleware(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringMatching(/authenticated|authorization|token|authentication required/i)
                })
            );
        });

        it('should have proper error message for 403', () => {
            const middleware = requireRole(UserRole.ADMIN);
            mockRequest.claims = {
                id: 1,
                role: UserRole.USER,
                name: 'testuser',
            };

            middleware(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringMatching(/permission|access|insufficient|not authorized/i)
                })
            );
        });
    });

    // #2: canManageRole function
    describe('canManageRole (#2)', () => {
        it('should return true when user role is higher than target role', () => {
            expect(canManageRole(UserRole.ADMIN, UserRole.USER)).toBe(true);
            expect(canManageRole(UserRole.ADMIN, UserRole.MODERATOR)).toBe(true);
            expect(canManageRole(UserRole.SUPER_ADMIN, UserRole.ADMIN)).toBe(true);
            expect(canManageRole(UserRole.OWNER, UserRole.SUPER_ADMIN)).toBe(true);
        });

        it('should return false when user role equals target role', () => {
            expect(canManageRole(UserRole.USER, UserRole.USER)).toBe(false);
            expect(canManageRole(UserRole.MODERATOR, UserRole.MODERATOR)).toBe(false);
            expect(canManageRole(UserRole.ADMIN, UserRole.ADMIN)).toBe(false);
            expect(canManageRole(UserRole.SUPER_ADMIN, UserRole.SUPER_ADMIN)).toBe(false);
            expect(canManageRole(UserRole.OWNER, UserRole.OWNER)).toBe(false);
        });

        it('should return false when user role is lower than target role', () => {
            expect(canManageRole(UserRole.USER, UserRole.MODERATOR)).toBe(false);
            expect(canManageRole(UserRole.MODERATOR, UserRole.ADMIN)).toBe(false);
            expect(canManageRole(UserRole.ADMIN, UserRole.SUPER_ADMIN)).toBe(false);
            expect(canManageRole(UserRole.SUPER_ADMIN, UserRole.OWNER)).toBe(false);
        });

        it('should handle edge cases - USER vs OWNER', () => {
            expect(canManageRole(UserRole.USER, UserRole.OWNER)).toBe(false);
            expect(canManageRole(UserRole.OWNER, UserRole.USER)).toBe(true);
        });

        it('should properly enforce hierarchy for all role combinations', () => {
            const roles = [
                UserRole.USER,
                UserRole.MODERATOR,
                UserRole.ADMIN,
                UserRole.SUPER_ADMIN,
                UserRole.OWNER
            ];

            for (let i = 0; i < roles.length; i++) {
                for (let j = 0; j < roles.length; j++) {
                    const result = canManageRole(roles[i], roles[j]);
                    const expected = i > j; // Higher index = higher role
                    expect(result).toBe(expected);
                }
            }
        });
    });

    // #3: requireModerator middleware
    describe('requireModerator (#3)', () => {
        it('should be defined and callable', () => {
            expect(requireModerator).toBeDefined();
            expect(typeof requireModerator).toBe('function');
        });

        it('should block USER role', () => {
            mockRequest.claims = {
                id: 1,
                role: UserRole.USER,
                name: 'user',
            };

            requireModerator(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow MODERATOR role', () => {
            mockRequest.claims = {
                id: 2,
                role: UserRole.MODERATOR,
                name: 'moderator',
            };

            requireModerator(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should allow ADMIN role', () => {
            mockRequest.claims = {
                id: 3,
                role: UserRole.ADMIN,
                name: 'admin',
            };

            requireModerator(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should allow SUPER_ADMIN role', () => {
            mockRequest.claims = {
                id: 4,
                role: UserRole.SUPER_ADMIN,
                name: 'superadmin',
            };

            requireModerator(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should allow OWNER role', () => {
            mockRequest.claims = {
                id: 5,
                role: UserRole.OWNER,
                name: 'owner',
            };

            requireModerator(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    // #4: requireAdmin middleware
    describe('requireAdmin (#4)', () => {
        it('should be defined and callable', () => {
            expect(requireAdmin).toBeDefined();
            expect(typeof requireAdmin).toBe('function');
        });

        it('should block USER role', () => {
            mockRequest.claims = {
                id: 1,
                role: UserRole.USER,
                name: 'user',
            };

            requireAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should block MODERATOR role', () => {
            mockRequest.claims = {
                id: 2,
                role: UserRole.MODERATOR,
                name: 'moderator',
            };

            requireAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow ADMIN role', () => {
            mockRequest.claims = {
                id: 3,
                role: UserRole.ADMIN,
                name: 'admin',
            };

            requireAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should allow SUPER_ADMIN role', () => {
            mockRequest.claims = {
                id: 4,
                role: UserRole.SUPER_ADMIN,
                name: 'superadmin',
            };

            requireAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should allow OWNER role', () => {
            mockRequest.claims = {
                id: 5,
                role: UserRole.OWNER,
                name: 'owner',
            };

            requireAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    // #5: requireSuperAdmin middleware
    describe('requireSuperAdmin (#5)', () => {
        it('should be defined and callable', () => {
            expect(requireSuperAdmin).toBeDefined();
            expect(typeof requireSuperAdmin).toBe('function');
        });

        it('should block USER role', () => {
            mockRequest.claims = {
                id: 1,
                role: UserRole.USER,
                name: 'user',
            };

            requireSuperAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should block MODERATOR role', () => {
            mockRequest.claims = {
                id: 2,
                role: UserRole.MODERATOR,
                name: 'moderator',
            };

            requireSuperAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should block ADMIN role', () => {
            mockRequest.claims = {
                id: 3,
                role: UserRole.ADMIN,
                name: 'admin',
            };

            requireSuperAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow SUPER_ADMIN role', () => {
            mockRequest.claims = {
                id: 4,
                role: UserRole.SUPER_ADMIN,
                name: 'superadmin',
            };

            requireSuperAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should allow OWNER role', () => {
            mockRequest.claims = {
                id: 5,
                role: UserRole.OWNER,
                name: 'owner',
            };

            requireSuperAdmin(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    // #6: requireOwner middleware
    describe('requireOwner (#6)', () => {
        it('should be defined and callable', () => {
            expect(requireOwner).toBeDefined();
            expect(typeof requireOwner).toBe('function');
        });

        it('should block USER role', () => {
            mockRequest.claims = {
                id: 1,
                role: UserRole.USER,
                name: 'user',
            };

            requireOwner(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should block MODERATOR role', () => {
            mockRequest.claims = {
                id: 2,
                role: UserRole.MODERATOR,
                name: 'moderator',
            };

            requireOwner(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should block ADMIN role', () => {
            mockRequest.claims = {
                id: 3,
                role: UserRole.ADMIN,
                name: 'admin',
            };

            requireOwner(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should block SUPER_ADMIN role', () => {
            mockRequest.claims = {
                id: 4,
                role: UserRole.SUPER_ADMIN,
                name: 'superadmin',
            };

            requireOwner(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow OWNER role only', () => {
            mockRequest.claims = {
                id: 5,
                role: UserRole.OWNER,
                name: 'owner',
            };

            requireOwner(mockRequest as IJwtRequest, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    // Integration Tests
    describe('Integration Tests', () => {
        it('should have all middleware functions exported', () => {
            expect(requireRole).toBeDefined();
            expect(canManageRole).toBeDefined();
            expect(requireModerator).toBeDefined();
            expect(requireAdmin).toBeDefined();
            expect(requireSuperAdmin).toBeDefined();
            expect(requireOwner).toBeDefined();
        });

        it('should enforce consistent role hierarchy across all middleware', () => {
            const testRoles = [
                { role: UserRole.USER, name: 'USER' },
                { role: UserRole.MODERATOR, name: 'MODERATOR' },
                { role: UserRole.ADMIN, name: 'ADMIN' },
                { role: UserRole.SUPER_ADMIN, name: 'SUPER_ADMIN' },
                { role: UserRole.OWNER, name: 'OWNER' }
            ];

            testRoles.forEach((testRole, index) => {
                mockRequest.claims = {
                    id: 1,
                    role: testRole.role,
                    name: testRole.name.toLowerCase()
                };

                // Test against each middleware
                const middlewares = [
                    { fn: requireModerator, minRole: 2 },
                    { fn: requireAdmin, minRole: 3 },
                    { fn: requireSuperAdmin, minRole: 4 },
                    { fn: requireOwner, minRole: 5 }
                ];

                middlewares.forEach(({ fn, minRole }) => {
                    const nextMock = jest.fn();
                    const statusMock = jest.fn().mockReturnThis();
                    const jsonMock = jest.fn().mockReturnThis();

                    const res = {
                        status: statusMock,
                        json: jsonMock
                    } as unknown as Response;

                    fn(mockRequest as IJwtRequest, res, nextMock);

                    if (testRole.role >= minRole) {
                        expect(nextMock).toHaveBeenCalled();
                    } else {
                        expect(statusMock).toHaveBeenCalledWith(403);
                    }
                });
            });
        });

        it('should have consistent error handling - all return 401 for missing claims', () => {
            // Don't set mockRequest.claims - it should not exist

            const middlewares = [
                requireRole(UserRole.USER),
                requireModerator,
                requireAdmin,
                requireSuperAdmin,
                requireOwner
            ];

            middlewares.forEach(middleware => {
                const nextMock = jest.fn();
                const statusMock = jest.fn().mockReturnThis();
                const jsonMock = jest.fn().mockReturnThis();

                const res = {
                    status: statusMock,
                    json: jsonMock
                } as unknown as Response;

                // Use a fresh request object without account property
                const req = {
                    body: {},
                    params: {},
                    query: {}
                };

                middleware(req as IJwtRequest, res, nextMock);

                expect(statusMock).toHaveBeenCalledWith(401);
                expect(nextMock).not.toHaveBeenCalled();
            });
        });

        it('should properly validate role hierarchy - OWNER can manage all', () => {
            const ownerRole = UserRole.OWNER;
            const allRoles = [
                UserRole.USER,
                UserRole.MODERATOR,
                UserRole.ADMIN,
                UserRole.SUPER_ADMIN
            ];

            allRoles.forEach(targetRole => {
                expect(canManageRole(ownerRole, targetRole)).toBe(true);
            });
        });

        it('should properly validate role hierarchy - USER cannot manage any', () => {
            const userRole = UserRole.USER;
            const allRoles = [
                UserRole.USER,
                UserRole.MODERATOR,
                UserRole.ADMIN,
                UserRole.SUPER_ADMIN,
                UserRole.OWNER
            ];

            allRoles.forEach(targetRole => {
                expect(canManageRole(userRole, targetRole)).toBe(false);
            });
        });
    });
});