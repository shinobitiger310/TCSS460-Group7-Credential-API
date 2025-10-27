import { validateEnv, getEnvVar, isProduction, isDevelopment, isTest } from '../envConfig';

describe('envConfig', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = { ...process.env };
        // Clear environment for testing
        delete process.env.NODE_ENV;
        delete process.env.JWT_SECRET;
        delete process.env.DATABASE_URL;
        delete process.env.EMAIL_USER;
        delete process.env.EMAIL_PASSWORD;
        delete process.env.PORT;
        delete process.env.EMAIL_SERVICE;
        delete process.env.EMAIL_FROM;
        delete process.env.SEND_EMAILS;
        delete process.env.SEND_SMS_EMAILS;
        delete process.env.APP_BASE_URL;
        delete process.env.DEFAULT_SMS_CARRIER;
        delete process.env.JWT_EXPIRY;
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
        jest.restoreAllMocks();
    });

    describe('validateEnv', () => {
        it('should pass when all required environment variables are present', () => {
            // Set all required variables
            process.env.JWT_SECRET = 'test-secret';
            process.env.DATABASE_URL = 'postgresql://test';
            process.env.EMAIL_USER = 'test@example.com';
            process.env.EMAIL_PASSWORD = 'password123';

            // Mock console methods
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            expect(() => validateEnv()).not.toThrow();
            expect(consoleErrorSpy).not.toHaveBeenCalled();
            expect(consoleSpy).toHaveBeenCalledWith('✅ Environment variables validated successfully');

            consoleSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        it('should throw error when required variables are missing', () => {
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            expect(() => validateEnv()).toThrow('Missing required environment variables: JWT_SECRET, DATABASE_URL, EMAIL_USER, EMAIL_PASSWORD');
            // Verify helpful error message was displayed
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should throw error when some required variables are missing', () => {
            process.env.JWT_SECRET = 'test-secret';
            process.env.EMAIL_USER = 'test@example.com';
            // Missing DATABASE_URL and EMAIL_PASSWORD

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            expect(() => validateEnv()).toThrow('Missing required environment variables: DATABASE_URL, EMAIL_PASSWORD');
            // Verify helpful error message was displayed
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should set default values for optional variables', () => {
            // Set required variables
            process.env.JWT_SECRET = 'test-secret';
            process.env.DATABASE_URL = 'postgresql://test';
            process.env.EMAIL_USER = 'test@example.com';
            process.env.EMAIL_PASSWORD = 'password123';

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            validateEnv();

            // Check that defaults were set
            expect(process.env.PORT).toBe('8000');
            expect(process.env.NODE_ENV).toBe('development');
            expect(process.env.EMAIL_SERVICE).toBe('gmail');
            expect(process.env.EMAIL_FROM).toBe('Auth² Service <noreply@auth2.com>');
            expect(process.env.SEND_EMAILS).toBe('false');
            expect(process.env.SEND_SMS_EMAILS).toBe('false');
            expect(process.env.APP_BASE_URL).toBe('http://localhost:8000');
            expect(process.env.DEFAULT_SMS_CARRIER).toBe('att');
            expect(process.env.JWT_EXPIRY).toBe('14d');

            consoleSpy.mockRestore();
        });

        it('should not override existing optional variables', () => {
            // Set required variables
            process.env.JWT_SECRET = 'test-secret';
            process.env.DATABASE_URL = 'postgresql://test';
            process.env.EMAIL_USER = 'test@example.com';
            process.env.EMAIL_PASSWORD = 'password123';

            // Set some optional variables to custom values
            process.env.PORT = '3000';
            process.env.NODE_ENV = 'production';
            process.env.EMAIL_SERVICE = 'outlook';

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            validateEnv();

            // Check that custom values were preserved
            expect(process.env.PORT).toBe('3000');
            expect(process.env.NODE_ENV).toBe('production');
            expect(process.env.EMAIL_SERVICE).toBe('outlook');

            // Check that missing optionals got defaults
            expect(process.env.EMAIL_FROM).toBe('Auth² Service <noreply@auth2.com>');
            expect(process.env.SEND_EMAILS).toBe('false');

            consoleSpy.mockRestore();
        });

        it('should log default value assignments', () => {
            // Set required variables
            process.env.JWT_SECRET = 'test-secret';
            process.env.DATABASE_URL = 'postgresql://test';
            process.env.EMAIL_USER = 'test@example.com';
            process.env.EMAIL_PASSWORD = 'password123';

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            validateEnv();

            // Default values are set silently now (no console.log for each default)
            // Just verify success message is shown
            expect(consoleSpy).toHaveBeenCalledWith('✅ Environment variables validated successfully');

            consoleSpy.mockRestore();
        });
    });

    describe('getEnvVar', () => {
        it('should return environment variable value when it exists', () => {
            process.env.TEST_VAR = 'test-value';

            const result = getEnvVar('TEST_VAR');
            expect(result).toBe('test-value');
        });

        it('should return default value when environment variable does not exist', () => {
            const result = getEnvVar('NON_EXISTENT_VAR', 'default-value');
            expect(result).toBe('default-value');
        });

        it('should throw error when environment variable does not exist and no default provided', () => {
            expect(() => getEnvVar('NON_EXISTENT_VAR')).toThrow('Environment variable NON_EXISTENT_VAR is not set and no default provided');
        });

        it('should prefer environment variable over default', () => {
            process.env.TEST_VAR = 'env-value';

            const result = getEnvVar('TEST_VAR', 'default-value');
            expect(result).toBe('env-value');
        });

        it('should handle empty string environment variables', () => {
            process.env.EMPTY_VAR = '';

            expect(() => getEnvVar('EMPTY_VAR')).toThrow('Environment variable EMPTY_VAR is not set and no default provided');
        });

        it('should use default for empty string environment variables', () => {
            process.env.EMPTY_VAR = '';

            const result = getEnvVar('EMPTY_VAR', 'default-for-empty');
            expect(result).toBe('default-for-empty');
        });

        it('should handle whitespace-only environment variables', () => {
            process.env.WHITESPACE_VAR = '   ';

            const result = getEnvVar('WHITESPACE_VAR');
            expect(result).toBe('   ');
        });
    });

    describe('isProduction', () => {
        it('should return true when NODE_ENV is production', () => {
            process.env.NODE_ENV = 'production';
            expect(isProduction()).toBe(true);
        });

        it('should return false when NODE_ENV is development', () => {
            process.env.NODE_ENV = 'development';
            expect(isProduction()).toBe(false);
        });

        it('should return false when NODE_ENV is test', () => {
            process.env.NODE_ENV = 'test';
            expect(isProduction()).toBe(false);
        });

        it('should return false when NODE_ENV is not set', () => {
            delete process.env.NODE_ENV;
            expect(isProduction()).toBe(false);
        });

        it('should return false for any other NODE_ENV value', () => {
            process.env.NODE_ENV = 'staging';
            expect(isProduction()).toBe(false);
        });

        it('should be case sensitive', () => {
            process.env.NODE_ENV = 'PRODUCTION';
            expect(isProduction()).toBe(false);
        });
    });

    describe('isDevelopment', () => {
        it('should return true when NODE_ENV is development', () => {
            process.env.NODE_ENV = 'development';
            expect(isDevelopment()).toBe(true);
        });

        it('should return true when NODE_ENV is not set', () => {
            delete process.env.NODE_ENV;
            expect(isDevelopment()).toBe(true);
        });

        it('should return false when NODE_ENV is production', () => {
            process.env.NODE_ENV = 'production';
            expect(isDevelopment()).toBe(false);
        });

        it('should return false when NODE_ENV is test', () => {
            process.env.NODE_ENV = 'test';
            expect(isDevelopment()).toBe(false);
        });

        it('should return false for any other NODE_ENV value', () => {
            process.env.NODE_ENV = 'staging';
            expect(isDevelopment()).toBe(false);
        });

        it('should be case sensitive', () => {
            process.env.NODE_ENV = 'DEVELOPMENT';
            expect(isDevelopment()).toBe(false);
        });
    });

    describe('isTest', () => {
        it('should return true when NODE_ENV is test', () => {
            process.env.NODE_ENV = 'test';
            expect(isTest()).toBe(true);
        });

        it('should return false when NODE_ENV is development', () => {
            process.env.NODE_ENV = 'development';
            expect(isTest()).toBe(false);
        });

        it('should return false when NODE_ENV is production', () => {
            process.env.NODE_ENV = 'production';
            expect(isTest()).toBe(false);
        });

        it('should return false when NODE_ENV is not set', () => {
            delete process.env.NODE_ENV;
            expect(isTest()).toBe(false);
        });

        it('should return false for any other NODE_ENV value', () => {
            process.env.NODE_ENV = 'staging';
            expect(isTest()).toBe(false);
        });

        it('should be case sensitive', () => {
            process.env.NODE_ENV = 'TEST';
            expect(isTest()).toBe(false);
        });
    });

    describe('Integration tests', () => {
        it('should work correctly after validateEnv sets defaults', () => {
            // Set required variables
            process.env.JWT_SECRET = 'test-secret';
            process.env.DATABASE_URL = 'postgresql://test';
            process.env.EMAIL_USER = 'test@example.com';
            process.env.EMAIL_PASSWORD = 'password123';

            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            validateEnv();

            // Test environment checking functions after defaults are set
            expect(isDevelopment()).toBe(true);
            expect(isProduction()).toBe(false);
            expect(isTest()).toBe(false);

            // Test getEnvVar with defaults that were set
            expect(getEnvVar('PORT')).toBe('8000');
            expect(getEnvVar('EMAIL_SERVICE')).toBe('gmail');

            consoleSpy.mockRestore();
        });

        it('should handle different environment scenarios', () => {
            const scenarios = [
                { env: 'development', isDev: true, isProd: false, isTest: false },
                { env: 'production', isDev: false, isProd: true, isTest: false },
                { env: 'test', isDev: false, isProd: false, isTest: true },
                { env: 'staging', isDev: false, isProd: false, isTest: false },
            ];

            scenarios.forEach(({ env, isDev, isProd, isTest: isTestEnv }) => {
                process.env.NODE_ENV = env;

                expect(isDevelopment()).toBe(isDev);
                expect(isProduction()).toBe(isProd);
                expect(isTest()).toBe(isTestEnv);
            });
        });

        it('should handle missing vs empty environment variables correctly', () => {
            // Test missing variable
            delete process.env.MISSING_VAR;
            expect(() => getEnvVar('MISSING_VAR')).toThrow();
            expect(getEnvVar('MISSING_VAR', 'default')).toBe('default');

            // Test empty variable
            process.env.EMPTY_VAR = '';
            expect(() => getEnvVar('EMPTY_VAR')).toThrow();
            expect(getEnvVar('EMPTY_VAR', 'default')).toBe('default');

            // Test present variable
            process.env.PRESENT_VAR = 'value';
            expect(getEnvVar('PRESENT_VAR')).toBe('value');
            expect(getEnvVar('PRESENT_VAR', 'default')).toBe('value');
        });
    });

    describe('Error handling', () => {
        it('should provide detailed error messages for missing variables', () => {
            process.env.JWT_SECRET = 'present';
            // Missing other required variables

            expect(() => validateEnv()).toThrow(/Missing required environment variables.*DATABASE_URL.*EMAIL_USER.*EMAIL_PASSWORD/);
        });

        it('should handle partial validation failures gracefully', () => {
            process.env.JWT_SECRET = 'test-secret';
            process.env.DATABASE_URL = 'postgresql://test';
            // Missing EMAIL_USER and EMAIL_PASSWORD

            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

            expect(() => validateEnv()).toThrow();
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });
});