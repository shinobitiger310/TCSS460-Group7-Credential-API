// src/test/adminController.test.ts
import 'dotenv/config';
import request from 'supertest';
import { app } from '../app';
import { connectToDatabase, disconnectFromDatabase, getPool } from '../core/utilities/database';
import jwt from 'jsonwebtoken';
import { UserRole } from '../core/models';

/**
 * Admin Controller Tests
 * Tests all admin endpoints with proper authentication and authorization
 */

describe('Admin Controller', () => {
    let adminToken: string;
    let userToken: string;
    let testUserId: number;

    beforeAll(async () => {
        // Connect to database
        await connectToDatabase();
        
        // Create admin token (role 3)
        adminToken = jwt.sign(
            { id: 1, email: 'admin@test.com', role: UserRole.ADMIN },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );

        // Create regular user token (role 1)
        userToken = jwt.sign(
            { id: 2, email: 'user@test.com', role: UserRole.USER },
            process.env.JWT_SECRET || 'test-secret',
            { expiresIn: '1h' }
        );
    });

    afterAll(async () => {
        // Clean up test data if needed
        if (testUserId) {
            await getPool().query('DELETE FROM Account_Credential WHERE Account_ID = $1', [testUserId]);
            await getPool().query('DELETE FROM Account WHERE Account_ID = $1', [testUserId]);
        }
        await disconnectFromDatabase();
    });

    describe('POST /admin/users/create', () => {
        it('should create a new user with admin token', async () => {
            const newUser = {
                firstname: 'Test',
                lastname: 'User',
                email: `test${Date.now()}@example.com`,
                password: 'TestPassword123!',
                username: `testuser${Date.now()}`,
                phone: '1234567890',
                role: UserRole.USER
            };

            const response = await request(app)
                .post('/admin/users/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUser)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toHaveProperty('id');
            expect(response.body.data.user.email).toBe(newUser.email);

            // Store for cleanup
            testUserId = response.body.data.user.id;
        });

        it('should fail without authentication', async () => {
            const newUser = {
                firstname: 'Test',
                lastname: 'User',
                email: 'test@example.com',
                password: 'TestPassword123!',
                username: 'testuser',
                phone: '1234567890'
            };

            await request(app)
                .post('/admin/users/create')
                .send(newUser)
                .expect(401);
        });

        it('should fail with non-admin token', async () => {
            const newUser = {
                firstname: 'Test',
                lastname: 'User',
                email: 'test2@example.com',
                password: 'TestPassword123!',
                username: 'testuser2',
                phone: '1234567891'
            };

            await request(app)
                .post('/admin/users/create')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newUser)
                .expect(403);
        });

        it('should fail when creating user with equal or higher role', async () => {
            const newUser = {
                firstname: 'Test',
                lastname: 'Admin',
                email: 'testadmin@example.com',
                password: 'TestPassword123!',
                username: 'testadmin',
                phone: '1234567892',
                role: UserRole.ADMIN // Same as requester
            };

            const response = await request(app)
                .post('/admin/users/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newUser)
                .expect(403);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /admin/users', () => {
        it('should list users with pagination', async () => {
            const response = await request(app)
                .get('/admin/users?page=1&limit=10')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('users');
            expect(response.body.data).toHaveProperty('pagination');
            expect(Array.isArray(response.body.data.users)).toBe(true);
            expect(response.body.data.pagination).toHaveProperty('page');
            expect(response.body.data.pagination).toHaveProperty('limit');
            expect(response.body.data.pagination).toHaveProperty('total');
        });

        it('should filter users by role', async () => {
            const response = await request(app)
                .get(`/admin/users?role=${UserRole.USER}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users.every((u: any) => u.role === UserRole.USER)).toBe(true);
        });

        it('should filter users by status', async () => {
            const response = await request(app)
                .get('/admin/users?status=active')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.users.every((u: any) => u.account_status === 'active')).toBe(true);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/admin/users')
                .expect(401);
        });

        it('should fail with non-admin token', async () => {
            await request(app)
                .get('/admin/users')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });

    describe('GET /admin/users/search', () => {
        it('should search users by query', async () => {
            const response = await request(app)
                .get('/admin/users/search?q=test&limit=10')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('users');
            expect(response.body.data).toHaveProperty('count');
            expect(response.body.data).toHaveProperty('query');
            expect(Array.isArray(response.body.data.users)).toBe(true);
        });

        it('should fail with query less than 2 characters', async () => {
            const response = await request(app)
                .get('/admin/users/search?q=a')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/admin/users/search?q=test')
                .expect(401);
        });

        it('should fail with non-admin token', async () => {
            await request(app)
                .get('/admin/users/search?q=test')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });

    describe('PUT /admin/users/:id/role', () => {
        it('should change user role', async () => {
            // First, create a test user
            const createResponse = await request(app)
                .post('/admin/users/create')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    firstname: 'Role',
                    lastname: 'Test',
                    email: `roletest${Date.now()}@example.com`,
                    password: 'TestPassword123!',
                    username: `roletest${Date.now()}`,
                    phone: '1234567893',
                    role: UserRole.USER
                });

            const userId = createResponse.body.data.user.id;

            // Change the role
            const response = await request(app)
                .put(`/admin/users/${userId}/role`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: UserRole.MODERATOR })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.newRole).toBe('Moderator');

            // Cleanup
            await getPool().query('DELETE FROM Account_Credential WHERE Account_ID = $1', [userId]);
            await getPool().query('DELETE FROM Account WHERE Account_ID = $1', [userId]);
        });

        it('should fail when changing own role', async () => {
            const response = await request(app)
                .put('/admin/users/1/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: UserRole.MODERATOR })
                .expect(403);

            expect(response.body.success).toBe(false);
        });

        it('should fail when user not found', async () => {
            await request(app)
                .put('/admin/users/999999/role')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ role: UserRole.MODERATOR })
                .expect(404);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .put('/admin/users/1/role')
                .send({ role: UserRole.MODERATOR })
                .expect(401);
        });

        it('should fail with non-admin token', async () => {
            await request(app)
                .put('/admin/users/1/role')
                .set('Authorization', `Bearer ${userToken}`)
                .send({ role: UserRole.MODERATOR })
                .expect(403);
        });
    });

    describe('GET /admin/users/stats/dashboard', () => {
        it('should return dashboard statistics', async () => {
            const response = await request(app)
                .get('/admin/users/stats/dashboard')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('totalUsers');
            expect(response.body.data).toHaveProperty('usersByRole');
            expect(response.body.data).toHaveProperty('usersByStatus');
            expect(response.body.data).toHaveProperty('verificationStats');
            expect(response.body.data).toHaveProperty('recentUsers');
            expect(response.body.data).toHaveProperty('generatedAt');
            expect(typeof response.body.data.totalUsers).toBe('number');
            expect(Array.isArray(response.body.data.usersByRole)).toBe(true);
            expect(Array.isArray(response.body.data.usersByStatus)).toBe(true);
        });

        it('should fail without authentication', async () => {
            await request(app)
                .get('/admin/users/stats/dashboard')
                .expect(401);
        });

        it('should fail with non-admin token', async () => {
            await request(app)
                .get('/admin/users/stats/dashboard')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);
        });
    });
});