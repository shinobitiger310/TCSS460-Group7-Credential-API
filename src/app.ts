// src/app.ts
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';

// Import routes
import { routes } from './routes';

/**
 * Create and configure Express application
 * This function handles all Express middleware, routes, and configuration
 * Separated from server startup logic for better testability
 *
 * Note: Environment validation and service initialization (email, etc.) are
 * handled in index.ts during server startup. This allows app.ts to be imported
 * safely for testing without requiring a complete .env file.
 */
export const createApp = (): Express => {

    const app: Express = express();

    // Middleware
    app.use(cors());
    // app.use(cors({
    //     origin: ['http://localhost:3000', 'http://localhost:8000'],
    //     credentials: true
    // }));
    app.use(express.json());

    // Root endpoint - API information
    app.get('/', (request: Request, response: Response) => {
        response.json({
            success: true,
            message: 'TCSS460 Group 7 - Credential API',
            description: 'RESTful API for Identity and Access Management (IAM)',
            version: '1.0.0',
            endpoints: {
                documentation: `${request.protocol}://${request.get('host')}/api-docs`,
                health: `${request.protocol}://${request.get('host')}/health`,
                auth: {
                    register: 'POST /auth/register',
                    login: 'POST /auth/login',
                    logout: 'POST /auth/logout'
                },
                verification: {
                    phone: 'POST /verification/phone/send',
                    email: 'GET /verification/email/:token'
                }
            },
            repository: 'https://github.com/YourUsername/TCSS460-Group7-Credential-API'
        });
    });

    // Load and setup Swagger documentation (must be before routes)
    try {
        const swaggerDocument = YAML.load('./docs/swagger.yaml');
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
    } catch (error) {
        console.warn('⚠️ Swagger documentation not found at ./docs/swagger.yaml');
    }

    // Routes (mounted after public endpoints)
    app.use(routes);

    return app;
};

// Export configured app instance for use in index.ts and tests
export const app = createApp();