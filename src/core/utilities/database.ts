// Database connection management
import { Pool, PoolConfig } from 'pg';

let pool: Pool | null = null;

/**
 * Get database configuration based on environment variables
 */
const getDatabaseConfig = (): PoolConfig => {
    return process.env.PGHOST !== undefined
        ? {
              host: process.env.PGHOST,
              port: parseInt(process.env.PGPORT || '5432'),
              user: process.env.PGUSER,
              database: process.env.PGDATABASE,
              password: process.env.PGPASSWORD,
          }
        : {
              connectionString: process.env.DATABASE_URL,
              ssl: {
                  rejectUnauthorized: false,
              },
          };
};

/**
 * Initialize database connection pool
 * Call this function at application startup
 */
export const connectToDatabase = async (): Promise<void> => {
    try {
        if (pool) {
            console.log('⚠️ Database connection already exists');
            return;
        }

        const pgConfig = getDatabaseConfig();
        pool = new Pool(pgConfig);

        // Test the connection
        const client = await pool.connect();
        await client.query('SELECT NOW()');
        client.release();

        console.log('✅ Database connection established successfully');
    } catch (error) {
        console.error('❌ Failed to connect to database:', error);
        throw error;
    }
};

/**
 * Close database connection pool
 * Call this function during graceful shutdown
 */
export const disconnectFromDatabase = async (): Promise<void> => {
    try {
        if (!pool) {
            console.log('⚠️ No database connection to close');
            return;
        }

        await pool.end();
        pool = null;
        console.log('✅ Database connection closed successfully');
    } catch (error) {
        console.error('❌ Error closing database connection:', error);
        throw error;
    }
};

/**
 * Get the database connection pool
 * Throws an error if the database is not connected
 */
export const getPool = (): Pool => {
    if (!pool) {
        throw new Error('Database not connected. Call connectToDatabase() first.');
    }
    return pool;
};

// Export pool for backward compatibility (deprecated - use getPool() instead)
export { pool };
