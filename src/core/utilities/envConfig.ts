// src/core/utilities/envConfig.ts

/**
 * Required environment variables for the application
 */
const requiredEnvVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
];

/**
 * Optional environment variables with defaults
 */
const optionalEnvVars = {
    PORT: '8000',
    NODE_ENV: 'development',
    EMAIL_SERVICE: 'gmail',
    EMAIL_FROM: 'Auth² Service <noreply@auth2.com>',
    SEND_EMAILS: 'false',
    SEND_SMS_EMAILS: 'false',
    APP_BASE_URL: 'http://localhost:8000',
    DEFAULT_SMS_CARRIER: 'att',
    JWT_EXPIRY: '14d',
};

/**
 * Validate that all required environment variables are present
 * Call this at application startup
 *
 * Educational Note:
 * This validation happens BEFORE the server starts to prevent runtime errors
 * with missing configuration. Failing fast at startup is better than discovering
 * missing config when a user tries to log in.
 *
 * @throws Error with helpful message if required variables are missing
 */
export const validateEnv = (): void => {
    const missing = requiredEnvVars.filter(key => !process.env[key]);

    if (missing.length > 0) {
        console.error('\n❌ Missing required environment variables:\n');
        missing.forEach(varName => {
            console.error(`   • ${varName}`);
        });
        console.error('\n💡 How to fix this:\n');
        console.error('   1. Copy .env.example to .env');
        console.error('      cp .env.example .env\n');
        console.error('   2. Edit .env and add your values:');
        missing.forEach(varName => {
            if (varName === 'JWT_SECRET') {
                console.error(`      ${varName}=your-secret-key-here`);
                console.error('      (Generate a secure key with: openssl rand -base64 32)');
            } else if (varName === 'DATABASE_URL') {
                console.error(`      ${varName}=postgresql://username:password@localhost:5432/database_name`);
            } else if (varName.includes('EMAIL')) {
                console.error(`      ${varName}=your-email-config-here`);
            } else {
                console.error(`      ${varName}=value`);
            }
        });
        console.error('\n   3. Check .env.example for detailed instructions\n');

        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Set defaults for optional variables
    Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
        if (!process.env[key]) {
            process.env[key] = defaultValue;
        }
    });

    console.log('✅ Environment variables validated successfully');
};

/**
 * Get environment variable with type safety
 */
export const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Environment variable ${key} is not set and no default provided`);
    }
    return value;
};

/**
 * Check if application is in production mode
 */
export const isProduction = (): boolean => {
    return process.env.NODE_ENV === 'production';
};

/**
 * Check if application is in development mode
 */
export const isDevelopment = (): boolean => {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};

/**
 * Check if application is in test mode
 */
export const isTest = (): boolean => {
    return process.env.NODE_ENV === 'test';
};