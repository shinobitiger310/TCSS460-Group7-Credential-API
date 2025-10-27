/**
 * Application entry point with production-ready lifecycle management
 *
 * Handles startup sequence (environment validation, database connection),
 * HTTP server initialization, and graceful shutdown with proper signal
 * handling for cloud deployment environments.
 *
 * Educational Focus:
 * - Server lifecycle management (startup, running, shutdown)
 * - Error handling during server initialization
 * - Graceful shutdown patterns for production
 * - Signal handling (SIGTERM, SIGINT)
 * - Port conflict detection and helpful error messages
 *
 * @see {@link ../docs-2.0/node-express-architecture.md} for architecture concepts
 * @see {@link ../docs-2.0/environment-configuration.md} for configuration patterns
 */

import { app } from './app';
import { connectToDatabase, disconnectFromDatabase } from '@db';
import { validateEnv, initializeEmailService } from '@utilities';

const PORT = parseInt(process.env.PORT || '8000');

/**
 * Start the Express server with complete application lifecycle management
 * Handles database connection, HTTP server startup, and graceful shutdown
 * Includes signal handlers for production deployment scenarios (SIGTERM, SIGINT)
 *
 * Educational Concepts Demonstrated:
 * - Server error handling (EADDRINUSE for port conflicts)
 * - Event-driven server initialization (listening, error events)
 * - Graceful shutdown to prevent data loss
 * - Process signal handling for cloud deployments
 *
 * @returns Promise<void> - Does not return; runs until process termination
 * @throws Will exit process with code 1 if startup fails at any stage
 * @throws Will exit process with code 0 after successful graceful shutdown
 *
 * @example
 * // Called automatically when application starts
 * await startServer();
 * // Console output:
 * // ✅ Database connection established successfully
 * // 🚀 Server running on port 8000
 * // 📖 API Documentation (Swagger): http://localhost:8000/api-docs
 * // 📚 Educational Documentation: http://localhost:8000/doc
 * // 🧪 JWT Test Route: http://localhost:8000/jwt_test
 *
 * @example
 * // Port already in use error:
 * // ❌ Error: Port 8000 is already in use
 * //    Please either:
 * //    1. Stop the process using port 8000
 * //    2. Change the PORT in your .env file
 * //
 * //    Find the process:
 * //    Mac/Linux: lsof -i :8000
 * //    Windows: netstat -ano | findstr :8000
 *
 * @example
 * // Graceful shutdown on SIGTERM (production deployment)
 * // SIGTERM received. Starting graceful shutdown...
 * // HTTP server closed
 * // Database connection closed
 * // Graceful shutdown complete
 */
async function startServer() {
    try {
        // Validate environment variables first
        validateEnv();

        // Initialize email service
        initializeEmailService();

        // Connect to database
        await connectToDatabase();
        console.log('✅ Database connection established successfully');

        // Start HTTP server
        const server = app.listen(PORT);

        // Handle server errors (e.g., port already in use)
        server.on('error', (error: NodeJS.ErrnoException) => {
            if (error.code === 'EADDRINUSE') {
                console.error(`❌ Error: Port ${PORT} is already in use`);
                console.error(`   Please either:`);
                console.error(`   1. Stop the process using port ${PORT}`);
                console.error(`   2. Change the PORT in your .env file`);
                console.error(`\n   Find the process:`);
                console.error(`   Mac/Linux: lsof -i :${PORT}`);
                console.error(`   Windows: netstat -ano | findstr :${PORT}`);
            } else {
                console.error('❌ Server error:', error);
            }
            process.exit(1);
        });

        // Only show success message after server is actually listening
        server.on('listening', () => {
            // Determine base URL based on environment
            const baseUrl = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

            console.log(`\n🚀 TCSS-460-auth-squared Template Server Running`);
            console.log(`   Port: ${PORT}`);
            console.log(`\n📖 API Documentation (Swagger): ${baseUrl}/api-docs`);
            console.log(`📚 Educational Documentation: ${baseUrl}/doc`);
            console.log(`🧪 JWT Test Route: ${baseUrl}/jwt_test`);
            console.log(`\n💡 TODO for Students:`);
            console.log(`   - Implement validation in src/core/middleware/validation.ts`);
            console.log(`   - Build the admin API in src/routes/admin/`);
            console.log(`\n✨ Ready for development!\n`);
        });

        // Graceful shutdown handling
        /**
         * Handle graceful shutdown when receiving termination signals
         * Closes HTTP server and database connections cleanly
         *
         * Why This Matters:
         * - SIGTERM: Sent by cloud platforms (Heroku, AWS) during deployments
         * - SIGINT: Sent when you press Ctrl+C in terminal
         * - Proper shutdown prevents data corruption and connection leaks
         *
         * @param signal - The termination signal received (SIGTERM, SIGINT)
         * @returns Promise that resolves when shutdown is complete
         */
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n${signal} received. Starting graceful shutdown...`);

            server.close(async () => {
                console.log('HTTP server closed');

                await disconnectFromDatabase();
                console.log('Database connection closed');

                console.log('Graceful shutdown complete');
                process.exit(0);
            });
        };

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        // Don't log the full error object/stack trace - validateEnv() already
        // printed helpful error messages. Just exit cleanly.
        // The helpful error messages will be the last thing students see.
        process.exit(1);
    }
}

// Start server and handle any uncaught errors cleanly
startServer().catch((error) => {
    // Catch any promise rejections without printing stack traces
    // Error details have already been logged by the functions that threw them
    process.exit(1);
});
